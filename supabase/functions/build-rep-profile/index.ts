// Builds a short, plain-language profile of a rep from that rep's own rows.
// Every claim in the summary cites a source id that is stored in `sources`.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "google/gemini-3-flash-preview";
const BATCH = 10;

const SYSTEM_PROMPT = `You write a short, factual profile of one sales rep for their manager.

Rules:
- Use only the rows given below. Never invent a fact, a number, a date, or a quote.
- Every sentence in "summary" must end with a citation in square brackets, using the exact source id from the rows, like [src_3].
- Plain language. No hype words, no exclamation marks, no emoji.
- If the rows do not support a field, return an empty array or an empty string.

Return JSON only, with this shape:
{
  "summary": "2 to 5 short sentences, each ending with [src_N].",
  "strengths": ["short phrase [src_N]"],
  "concerns": ["short phrase [src_N]"],
  "topics": ["what they ask about most"],
  "goals": "goals the rep stated in their own words, or empty string"
}`;

interface Source {
  id: string;
  kind: string;
  ref: string;
  at: string | null;
  text: string;
}

async function gatherSources(admin: any, userId: string, since: string | null): Promise<Source[]> {
  const sources: Source[] = [];
  let n = 0;
  const add = (kind: string, ref: string, at: string | null, text: string) => {
    n += 1;
    sources.push({ id: `src_${n}`, kind, ref, at, text: text.slice(0, 600) });
  };

  const gte = since ?? new Date(Date.now() - 90 * 86400000).toISOString();

  const { data: threads } = await admin
    .from("assistant_threads")
    .select("id, mode, title")
    .eq("user_id", userId);
  const threadIds = (threads ?? []).map((t: any) => t.id);
  if (threadIds.length > 0) {
    const { data: msgs } = await admin
      .from("assistant_messages")
      .select("id, thread_id, role, content, created_at")
      .in("thread_id", threadIds)
      .eq("role", "user")
      .gte("created_at", gte)
      .order("created_at", { ascending: false })
      .limit(40);
    for (const m of msgs ?? []) {
      add("assistant_message", m.id, m.created_at, `Asked Summit: ${m.content}`);
    }
  }

  const { data: chats } = await admin
    .from("chat_messages")
    .select("id, content, created_at")
    .eq("user_id", userId)
    .gte("created_at", gte)
    .order("created_at", { ascending: false })
    .limit(30);
  for (const c of chats ?? []) {
    if (c.content) add("chat_message", c.id, c.created_at, `Chat message: ${c.content}`);
  }

  const { data: lessons } = await admin
    .from("lesson_progress")
    .select("id, lesson_id, completed_at, training_lessons(title)")
    .eq("user_id", userId)
    .gte("completed_at", gte)
    .order("completed_at", { ascending: false })
    .limit(25);
  for (const l of lessons ?? []) {
    add("lesson_progress", l.id, l.completed_at, `Completed lesson: ${l.training_lessons?.title ?? l.lesson_id}`);
  }

  const { data: rsvps } = await admin
    .from("calendar_attendance")
    .select("id, status, present, created_at, calendar_events(title)")
    .eq("user_id", userId)
    .gte("created_at", gte)
    .order("created_at", { ascending: false })
    .limit(20);
  for (const r of rsvps ?? []) {
    add(
      "calendar_attendance",
      r.id,
      r.created_at,
      `Event ${r.calendar_events?.title ?? "event"}: answered ${r.status ?? "no answer"}${
        r.present === true ? ", present" : r.present === false ? ", absent" : ""
      }`
    );
  }

  const { data: time } = await admin
    .from("daily_training_time")
    .select("id, date, app_minutes, training_minutes")
    .eq("user_id", userId)
    .gte("date", gte.slice(0, 10))
    .order("date", { ascending: false })
    .limit(30);
  for (const t of time ?? []) {
    add(
      "daily_training_time",
      t.id,
      t.date,
      `On ${t.date}: ${t.app_minutes ?? 0} minutes in the app, ${t.training_minutes ?? 0} minutes training`
    );
  }

  return sources;
}

async function buildOne(admin: any, apiKey: string, userId: string, name: string, since: string | null) {
  const sources = await gatherSources(admin, userId, since);
  if (sources.length === 0) return { skipped: true, tokens: 0 };

  const rows = sources.map((s) => `[${s.id}] (${s.kind}, ${s.at ?? "no date"}) ${s.text}`).join("\n");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Rep: ${name}\n\nRows:\n${rows}` },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`gateway ${res.status}: ${text.slice(0, 300)}`);
  }

  const json = await res.json();
  const tokens = Number(json.usage?.total_tokens ?? 0);
  let parsed: any = {};
  try {
    parsed = JSON.parse(json.choices?.[0]?.message?.content ?? "{}");
  } catch {
    parsed = {};
  }

  await admin.from("rep_ai_profiles").upsert({
    user_id: userId,
    summary: typeof parsed.summary === "string" ? parsed.summary : null,
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    concerns: Array.isArray(parsed.concerns) ? parsed.concerns : [],
    topics: Array.isArray(parsed.topics) ? parsed.topics : [],
    goals: typeof parsed.goals === "string" ? parsed.goals : null,
    sources,
    last_built_at: new Date().toISOString(),
    source_count: sources.length,
    tokens_used: tokens,
  });

  return { skipped: false, tokens };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const body = await req.json().catch(() => null) as { user_id?: string } | null;
    const single = typeof body?.user_id === "string" ? body.user_id : null;

    // On-demand runs are staff only.
    if (single) {
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
      const { data: authData } = await userClient.auth.getUser();
      const callerId = authData?.user?.id;
      if (!callerId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", callerId);
      const isStaff = (roles ?? []).some((r: any) => ["admin", "owner", "president"].includes(r.role));
      if (!isStaff) {
        return new Response(JSON.stringify({ error: "Staff only" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    let targets: { user_id: string; full_name: string }[] = [];
    if (single) {
      const { data: p } = await admin
        .from("profiles")
        .select("user_id, full_name")
        .eq("user_id", single)
        .maybeSingle();
      if (p) targets = [p as any];
    } else {
      const { data: ps } = await admin
        .from("profiles")
        .select("user_id, full_name")
        .eq("archived", false)
        .limit(200);
      targets = (ps ?? []) as any[];
    }

    const { data: existing } = await admin.from("rep_ai_profiles").select("user_id, last_built_at");
    const lastBuilt = new Map<string, string | null>(
      (existing ?? []).map((r: any) => [r.user_id, r.last_built_at])
    );

    let built = 0;
    let skipped = 0;
    let tokensTotal = 0;
    const errors: string[] = [];

    for (const t of targets) {
      if (built >= BATCH) break;
      try {
        const since = single ? null : lastBuilt.get(t.user_id) ?? null;
        const out = await buildOne(admin, apiKey, t.user_id, t.full_name ?? "Rep", since);
        if (out.skipped) skipped += 1;
        else {
          built += 1;
          tokensTotal += out.tokens;
        }
      } catch (e) {
        errors.push(`${t.user_id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    console.log(`build-rep-profile run: built=${built} skipped=${skipped} tokens=${tokensTotal} errors=${errors.length}`);

    return new Response(JSON.stringify({ built, skipped, tokens: tokensTotal, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("build-rep-profile error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Something went wrong." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
