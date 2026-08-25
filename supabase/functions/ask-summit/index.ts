import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = [
  "https://summitmktg.lovable.app",
  "https://summitmktgsales.com",
  "https://www.summitmktgsales.com",
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && (allowedOrigins.includes(origin) || origin.endsWith(".lovable.app"));
  return {
    "Access-Control-Allow-Origin": isAllowed && origin ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

const SYSTEM_PROMPT = `You are "Ask Summit" — an internal assistant for the Summit Marketing sales team.

HOW YOU ANSWER:
- Answer ONLY from the CONTEXT block below. It is the complete set of data you are allowed to use.
- If the answer is not in the context, reply exactly: "I don't have that — ask your manager."
- Short, plain answers. One to three sentences, or a short list. No hype words, no filler, no emojis.
- Never invent numbers, dates, names, phone numbers, or dollar amounts. If a number isn't in the context, you don't have it.
- Never speculate or give general sales advice that isn't grounded in the context.

PRIVACY RULES (absolute):
- The MY MONEY section is the asking user's own data only. Never discuss anyone else's pay, commission, or housing — if asked, say: "I can only show your own pay and housing."
- Never mention or list archived or former team members, job applications, admin queue items, or leads belonging to other reps.
- Roster contact info in the context is shareable with the asking user. Nothing outside the context is.`;

interface Message {
  role: "user" | "assistant";
  content: string;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      timeZone: "America/Los_Angeles",
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }) + " PT";
  } catch {
    return iso;
  }
}

async function buildContext(admin: any, userId: string) {
  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    me,
    roster,
    teams,
    events,
    announcements,
    courses,
    modules,
    faq,
    housing,
    commission,
  ] = await Promise.all([
    admin.from("profiles").select("full_name, email, team_id, direct_manager, status").eq("user_id", userId).maybeSingle(),
    admin.from("profiles").select("user_id, full_name, email, phone, team_id, direct_manager").eq("archived", false).neq("status", "nlc").order("full_name").limit(300),
    admin.from("teams").select("id, name"),
    admin.from("calendar_events").select("title, description, start_time, location, event_type").gte("start_time", now.toISOString()).lte("start_time", in7.toISOString()).order("start_time").limit(40),
    admin.from("announcements").select("title, content, created_at, expires_at").order("created_at", { ascending: false }).limit(15),
    admin.from("training_courses").select("id, title, slug"),
    admin.from("training_modules").select("title, course_id, display_order").order("display_order"),
    admin.from("assistant_faq").select("question, answer, category").eq("published", true).order("display_order").limit(200),
    admin.from("rep_housing").select("monthly_cost, location, notes").eq("user_id", userId).maybeSingle(),
    admin.from("rep_commission").select("pay_scale, signs, avg_account_value, active_revenue, rate_override, notes").eq("user_id", userId).maybeSingle(),
  ]);

  const roleRows = await admin.from("user_roles").select("user_id, role");
  const roleMap = new Map<string, string>();
  for (const r of roleRows.data ?? []) {
    const prev = roleMap.get(r.user_id);
    const rank = ["rookie", "manager", "admin", "owner"];
    if (!prev || rank.indexOf(r.role) > rank.indexOf(prev)) roleMap.set(r.user_id, r.role);
  }
  const teamMap = new Map<string, string>((teams.data ?? []).map((t: any) => [t.id, t.name]));

  const parts: string[] = [];

  parts.push(`ASKING USER: ${me.data?.full_name ?? "Unknown"} (${roleMap.get(userId) ?? "rookie"})${me.data?.team_id ? `, team: ${teamMap.get(me.data.team_id) ?? "unassigned"}` : ""}${me.data?.direct_manager ? `, manager: ${me.data.direct_manager}` : ""}`);
  parts.push(`CURRENT DATE/TIME: ${fmtDate(now.toISOString())}`);

  // Roster
  const rosterLines = (roster.data ?? []).map((p: any) => {
    const bits = [p.full_name, roleMap.get(p.user_id) ?? "rookie", teamMap.get(p.team_id) ?? "no team"];
    if (p.phone) bits.push(p.phone);
    if (p.email) bits.push(p.email);
    return `- ${bits.join(" | ")}`;
  });
  parts.push(`ACTIVE ROSTER (${rosterLines.length} people — contact info is shareable):\n${rosterLines.join("\n") || "- none"}`);

  // Calendar
  const eventLines = (events.data ?? []).map((e: any) =>
    `- ${e.title} — ${fmtDate(e.start_time)}${e.location ? ` at ${e.location}` : ""}${e.event_type ? ` (${e.event_type})` : ""}${e.description ? ` — ${String(e.description).slice(0, 200)}` : ""}`
  );
  parts.push(`CALENDAR — NEXT 7 DAYS:\n${eventLines.join("\n") || "- no events scheduled"}`);

  // Announcements (published + unexpired)
  const annLines = (announcements.data ?? [])
    .filter((a: any) => !a.expires_at || new Date(a.expires_at) > now)
    .map((a: any) => `- ${a.title}: ${String(a.content ?? "").slice(0, 400)}`);
  parts.push(`CURRENT ANNOUNCEMENTS:\n${annLines.join("\n") || "- none"}`);

  // Training
  const courseById = new Map<string, string>((courses.data ?? []).map((c: any) => [c.id, c.title]));
  const trainingLines = (courses.data ?? []).map((c: any) => {
    const mods = (modules.data ?? []).filter((m: any) => m.course_id === c.id).map((m: any) => m.title);
    return `- Course "${c.title}": ${mods.join(", ") || "no modules"}`;
  });
  parts.push(`TRAINING STRUCTURE:\n${trainingLines.join("\n") || "- none"}`);

  // My money (own only)
  const moneyLines: string[] = [];
  if (commission.data) {
    const c = commission.data;
    moneyLines.push(`Pay scale: ${c.pay_scale}`);
    moneyLines.push(`Signs this season: ${c.signs ?? 0}`);
    if (c.avg_account_value) moneyLines.push(`Average account value: $${c.avg_account_value}`);
    if (c.active_revenue) moneyLines.push(`Active revenue: $${c.active_revenue}`);
    if (c.rate_override) moneyLines.push(`Rate (set manually): ${Number(c.rate_override) * 100}%`);
    if (c.notes) moneyLines.push(`Notes: ${c.notes}`);
  } else {
    moneyLines.push("Commission: not set yet — tell them to ask their manager.");
  }
  if (housing.data) {
    const h = housing.data;
    moneyLines.push(`Housing cost: ${h.monthly_cost !== null && h.monthly_cost !== undefined ? `$${h.monthly_cost}/month` : "not set"}`);
    if (h.location) moneyLines.push(`Housing location: ${h.location}`);
    if (h.notes) moneyLines.push(`Housing notes: ${h.notes}`);
  } else {
    moneyLines.push("Housing: not set yet — tell them to ask their manager.");
  }
  parts.push(`MY MONEY (asking user's OWN data only — never share for anyone else):\n${moneyLines.map(l => `- ${l}`).join("\n")}`);

  // FAQ
  const faqLines = (faq.data ?? []).map((f: any) => `- Q: ${f.question}\n  A: ${f.answer}`);
  parts.push(`TEAM FAQ (answers approved by leadership):\n${faqLines.join("\n") || "- none"}`);

  // App navigation hints
  parts.push(`WHERE THINGS LIVE IN THE APP:
- Pay scales and calculators: Resources tab
- Training lessons and videos: Training tab
- Schedule and meetings: Calendar tab
- Recruiting leads: Recruits tab
- Points and rankings: Leaderboard tab
- Own pay and housing: My Money tab
- Team directory and contact info: Team tab`);

  return `\n\n=== CONTEXT START ===\n${parts.join("\n\n")}\n=== CONTEXT END ===`;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: authData, error: authError } = await userClient.auth.getUser();
    const userId = authData?.user?.id;
    if (authError || !userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Archived accounts get no assistant access
    const { data: profileRow } = await admin
      .from("profiles")
      .select("archived")
      .eq("user_id", userId)
      .maybeSingle();
    if (profileRow?.archived) {
      return new Response(JSON.stringify({ error: "Account is inactive" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: allowed } = await admin.rpc("check_rate_limit", {
      p_key: `ask-summit:${userId}`,
      p_max_attempts: 20,
      p_window_seconds: 60,
    });
    if (allowed === false) {
      return new Response(JSON.stringify({ error: "Too many questions at once. Wait a moment." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => null) as { messages?: Message[] } | null;
    const messages = body?.messages;
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 40) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    for (const m of messages) {
      if (
        (m.role !== "user" && m.role !== "assistant") ||
        typeof m.content !== "string" ||
        m.content.length === 0 ||
        m.content.length > 4000
      ) {
        return new Response(JSON.stringify({ error: "Invalid message" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data: roleRows } = await admin.from("user_roles").select("role").eq("user_id", userId);
    const rank = ["rookie", "manager", "admin", "owner"];
    const verifiedRole = (roleRows ?? []).reduce(
      (best: string, r: any) => (rank.indexOf(r.role) > rank.indexOf(best) ? r.role : best),
      "rookie"
    );

    const context = await buildContext(admin, userId);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: SYSTEM_PROMPT + context }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const message =
        status === 429
          ? "The assistant is busy. Try again in a moment."
          : status === 402
          ? "AI credits are exhausted. Contact your admin."
          : "The assistant is unavailable right now.";
      if (status !== 429 && status !== 402) {
        console.error("AI gateway error:", status, await response.text());
      }
      return new Response(JSON.stringify({ error: message }), {
        status: status === 429 || status === 402 ? status : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lastQuestion = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

    // Tee the stream so we can log the full answer without delaying the client
    const [clientStream, logStream] = response.body!.tee();

    (async () => {
      try {
        const reader = logStream.getReader();
        const decoder = new TextDecoder();
        let raw = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          raw += decoder.decode(value, { stream: true });
        }
        let answer = "";
        for (const line of raw.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            answer += json.choices?.[0]?.delta?.content ?? "";
          } catch {
            // ignore partial chunks
          }
        }
        await admin.from("assistant_logs").insert({
          user_id: userId,
          question: lastQuestion.slice(0, 2000),
          answer: answer.slice(0, 4000),
          role_at_ask: verifiedRole,
        });
      } catch (err) {
        console.error("assistant log error", err);
      }
    })();

    return new Response(clientStream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ask-summit error:", e);
    return new Response(JSON.stringify({ error: "Something went wrong." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
