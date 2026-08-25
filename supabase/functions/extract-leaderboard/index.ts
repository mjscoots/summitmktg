import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = [
  "https://summitmktg.lovable.app",
  "https://summitmktgsales.com",
  "https://www.summitmktgsales.com",
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed =
    origin &&
    (allowedOrigins.includes(origin) ||
      origin.endsWith(".lovable.app") ||
      origin.startsWith("http://localhost:"));
  return {
    "Access-Control-Allow-Origin": isAllowed && origin ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

const EXTRACTION_PROMPT = `You read screenshots of a sales leaderboard and transcribe them. You do not interpret, estimate, or infer anything.

RULES (absolute):
- Return one row per person visible in the image, in the order they appear.
- Copy the name exactly as printed, including any initial or last-name abbreviation.
- Copy numbers exactly as printed. Strip currency symbols and thousands separators, keep the digits and any decimal point.
- If a value is cut off, blurry, or not present in the image, return an empty string for it. Never guess, never carry a value over from another row, never compute a total.
- "serviced" and "pending_or_active" are only filled when the leaderboard shows those as separate columns. Otherwise leave them empty.
- "period" is only filled when the image itself prints the month or says year to date: use YYYY-MM for a month, or "ytd". If the image does not say, return an empty string.
- Ignore team rows, totals rows, headers, and anything that is not an individual person.
- Return the rows using the return_leaderboard_rows tool. No commentary.`;

serve(async (req) => {
  const cors = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: "Not signed in" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", authData.user.id);
    const isStaff = (roles ?? []).some((r: { role: string }) => r.role === "admin" || r.role === "owner");
    if (!isStaff) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => null);
    const images: string[] = Array.isArray(body?.images) ? body.images : [];
    if (images.length === 0 || images.length > 12) {
      return new Response(JSON.stringify({ error: "Send between 1 and 12 images" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (images.some((i) => typeof i !== "string" || !i.startsWith("data:image/"))) {
      return new Response(JSON.stringify({ error: "Images must be base64 image data" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI is not configured" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const tool = {
      type: "function",
      function: {
        name: "return_leaderboard_rows",
        description: "Return the rows transcribed from the leaderboard screenshot.",
        parameters: {
          type: "object",
          properties: {
            rows: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  revenue: { type: "string" },
                  serviced: { type: "string" },
                  pending_or_active: { type: "string" },
                  period: { type: "string" },
                },
                required: ["name", "revenue", "serviced", "pending_or_active", "period"],
                additionalProperties: false,
              },
            },
          },
          required: ["rows"],
          additionalProperties: false,
        },
      },
    };

    const allRows: Record<string, string>[] = [];
    const failures: string[] = [];

    for (let i = 0; i < images.length; i++) {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: EXTRACTION_PROMPT },
            {
              role: "user",
              content: [
                { type: "text", text: "Transcribe every person row in this leaderboard screenshot." },
                { type: "image_url", image_url: { url: images[i] } },
              ],
            },
          ],
          tools: [tool],
          tool_choice: { type: "function", function: { name: "return_leaderboard_rows" } },
        }),
      });

      if (!res.ok) {
        const detail = await res.text();
        if (res.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limited by the AI service — try again in a minute." }),
            { status: 429, headers: { ...cors, "Content-Type": "application/json" } }
          );
        }
        if (res.status === 402) {
          return new Response(
            JSON.stringify({ error: "AI credits are exhausted — add credits to run the import." }),
            { status: 402, headers: { ...cors, "Content-Type": "application/json" } }
          );
        }
        console.error("gateway error", res.status, detail);
        failures.push(`Image ${i + 1} could not be read`);
        continue;
      }

      const json = await res.json();
      const call = json?.choices?.[0]?.message?.tool_calls?.[0];
      let parsed: { rows?: Record<string, string>[] } = {};
      try {
        parsed = JSON.parse(call?.function?.arguments ?? "{}");
      } catch {
        failures.push(`Image ${i + 1} returned unreadable output`);
        continue;
      }
      const rows = Array.isArray(parsed.rows) ? parsed.rows : [];
      if (rows.length === 0) failures.push(`Image ${i + 1}: no rows found`);
      for (const r of rows) {
        if (!r?.name || !String(r.name).trim()) continue;
        allRows.push({
          name: String(r.name).trim(),
          revenue: String(r.revenue ?? "").trim(),
          serviced: String(r.serviced ?? "").trim(),
          pending_or_active: String(r.pending_or_active ?? "").trim(),
          period: String(r.period ?? "").trim(),
          image_index: String(i),
        });
      }
    }

    return new Response(JSON.stringify({ rows: allRows, notes: failures }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-leaderboard failed", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
