import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = [
  "https://summitmktg.lovable.app",
  "https://summitmktgsales.com",
  "https://www.summitmktgsales.com",
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && (allowedOrigins.includes(origin) || origin.endsWith(".lovable.app") || origin.startsWith("http://localhost:"));
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

const PRACTICE_SYSTEM_PROMPT = `You are role-playing as a homeowner answering their front door for a door-to-door sales rep who is practicing their pitch. This is a TRAINING SIMULATION.

STRICT CHARACTER RULES:
- Stay in character as the homeowner at all times. Never coach, never break character, never explain sales technique, never say you are an AI.
- Talk like a real, ordinary person who was just interrupted at their door: short, natural, sometimes distracted, busy, or mid-task ("hang on, my dog's barking", "I've got something on the stove").
- Be skeptical but human, not hostile. Use ordinary real objections: not interested, already have someone, too expensive, bad timing, need to ask my spouse, in the middle of something, don't want to switch, seen this before.
- Give realistic ground: if the rep handles an objection well, listens, and is genuinely helpful, warm up a little and keep the conversation going. If the rep is pushy, ignores what you said, rambles, or is pressuring you, get more closed off and can end the conversation (e.g. "I really need to go," and then stop engaging).
- Keep every reply to 1-3 short sentences, like a real doorstep exchange. Never lecture or give a monologue.
- Never offer feedback, tips, or meta commentary during the roleplay — that only happens after the rep ends the session.

CONTEXT: below is a list of objection/script categories reps are trained on at this company. Base your objections and hesitations on these where they fit naturally, so the practice matches what the rep has learned. Do not invent or reference specific company names, numbers, or offers that aren't implied by these categories.
`;

const PRACTICE_FEEDBACK_PROMPT = `The practice roleplay above has ended. Drop the homeowner character completely. You are now a plain, direct sales coach reviewing the transcript.

Give short, plain feedback in two parts:
1. What worked — specific to something the rep actually said or did in this transcript.
2. One thing to fix — specific and actionable, based on this transcript.

Rules:
- Two to four sentences total, combined.
- Plain, specific, no scores, no ratings, no numbers out of ten, no emoji, no hype words, no praise inflation ("great job!", "amazing!").
- Do not restate the whole conversation. Just the two points.
- If the transcript is too short to say anything specific, say so plainly and suggest what to try next time.`;

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
  // Grounding is limited to company-wide content plus the workspace the rep is in.
  const { data: activeRow } = await admin
    .from("profiles")
    .select("active_vertical")
    .eq("id", userId)
    .maybeSingle();
  const vert: string = activeRow?.active_vertical ?? "Pest";
  const scoped = (q: any) => q.or(`vertical.is.null,vertical.eq.${vert}`);
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
    scoped(admin.from("calendar_events").select("title, description, event_date, location, event_type")).gte("event_date", now.toISOString()).lte("event_date", in7.toISOString()).order("event_date").limit(40),
    scoped(admin.from("announcement_posts").select("title, body, published_at, expires_at, status")).eq("status", "published").order("published_at", { ascending: false }).limit(15),
    scoped(admin.from("training_courses").select("id, title, slug")).eq("is_active", true),
    admin.from("training_modules").select("title, course_id, display_order").eq("is_active", true).order("display_order"),
    admin.from("assistant_faq").select("question, answer, category").eq("published", true).order("display_order").limit(200),
    admin.from("rep_housing").select("monthly_cost, location, notes").eq("user_id", userId).maybeSingle(),
    admin.from("rep_commission").select("pay_scale, signs, avg_account_value, active_revenue, rate_override, notes").eq("user_id", userId).maybeSingle(),
  ]);

  const roleRows = await admin.from("user_roles").select("user_id, role");
  const roleMap = new Map<string, string>();
  for (const r of roleRows.data ?? []) {
    const prev = roleMap.get(r.user_id);
    const rank = ["rookie", "recruiter", "manager", "admin", "owner"];
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
    `- ${e.title} — ${fmtDate(e.event_date)}${e.location ? ` at ${e.location}` : ""}${e.event_type ? ` (${e.event_type})` : ""}${e.description ? ` — ${String(e.description).slice(0, 200)}` : ""}`
  );
  parts.push(`CALENDAR — NEXT 7 DAYS:\n${eventLines.join("\n") || "- no events scheduled"}`);

  // Announcements (published + unexpired)
  const annLines = (announcements.data ?? [])
    .filter((a: any) => !a.expires_at || new Date(a.expires_at) > now)
    .map((a: any) => `- ${a.title}: ${String(a.body ?? "").replace(/<[^>]+>/g, " ").slice(0, 400)}`);
  parts.push(`CURRENT ANNOUNCEMENTS:\n${annLines.join("\n") || "- none"}`);

  // Training
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

  // Sales scripts (the company's actual method)
  const scriptCards = await loadScriptCards(admin, vert);
  if (scriptCards.length > 0) {
    parts.push(`SALES SCRIPTS AND METHOD (the company's own material — quote it directly when asked what to say):\n${formatScriptCards(scriptCards)}`);
  }

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

/**
 * Owner/admin only. Read-only live data pulled with the service client. Every
 * block names its source table so answers can cite it. No writes.
 */
async function buildOwnerDataContext(admin: any) {
  const [people, enrollments, revenue, goalRow] = await Promise.all([
    admin
      .from("profiles")
      .select("user_id, full_name, office_name, vertical, rep_year, direct_manager, departure_type, departure_reason, committed_last_day, next_year_status, archived")
      .eq("archived", false)
      .limit(1000),
    admin.from("rep_vertical_enrollments").select("user_id, vertical, status").limit(2000),
    admin.from("rep_revenue").select("user_id, month, revenue").limit(5000),
    admin.from("app_settings").select("key, value").in("key", ["season_revenue_goal", "season_revenue_goal_note"]),
  ]);

  const rows = (people.data ?? []) as any[];
  const parts: string[] = [];

  const byOffice = new Map<string, number>();
  for (const p of rows) {
    const k = p.office_name || "No office";
    byOffice.set(k, (byOffice.get(k) ?? 0) + 1);
  }
  parts.push(
    `ACTIVE COUNT BY OFFICE (source table: profiles):\n${
      [...byOffice.entries()].map(([k, v]) => `- ${k}: ${v}`).join("\n") || "- none"
    }`
  );

  const byVertical = new Map<string, number>();
  for (const e of (enrollments.data ?? []) as any[]) {
    const k = `${e.vertical} (${e.status})`;
    byVertical.set(k, (byVertical.get(k) ?? 0) + 1);
  }
  parts.push(
    `COUNT BY INDUSTRY (source table: rep_vertical_enrollments):\n${
      [...byVertical.entries()].map(([k, v]) => `- ${k}: ${v}`).join("\n") || "- none"
    }`
  );

  const noLastDay = rows.filter((p) => !p.committed_last_day).map((p) => p.full_name);
  const noReason = rows.filter((p) => p.departure_type && !p.departure_reason).map((p) => p.full_name);
  const noStatus = rows.filter((p) => !p.next_year_status).map((p) => p.full_name);
  parts.push(
    `ROSTER GAPS (source table: profiles — fix them in the Roster Sweep):\n` +
      `- No committed last day (${noLastDay.length}): ${noLastDay.slice(0, 60).join(", ") || "none"}\n` +
      `- No departure reason (${noReason.length}): ${noReason.slice(0, 60).join(", ") || "none"}\n` +
      `- No next-season status (${noStatus.length}): ${noStatus.slice(0, 60).join(", ") || "none"}`
  );

  const revByUser = new Map<string, number>();
  for (const r of (revenue.data ?? []) as any[]) {
    revByUser.set(r.user_id, (revByUser.get(r.user_id) ?? 0) + Number(r.revenue ?? 0));
  }
  const teamCount = new Map<string, number>();
  const teamRev = new Map<string, number>();
  for (const p of rows) {
    const leader = p.direct_manager;
    if (!leader) continue;
    teamCount.set(leader, (teamCount.get(leader) ?? 0) + 1);
    teamRev.set(leader, (teamRev.get(leader) ?? 0) + (revByUser.get(p.user_id) ?? 0));
  }
  const leaderLines = [...teamCount.entries()]
    .sort((a, b) => (teamRev.get(b[0]) ?? 0) - (teamRev.get(a[0]) ?? 0))
    .slice(0, 40)
    .map(([leader, count]) => `- ${leader}: ${count} reps, $${Math.round(teamRev.get(leader) ?? 0).toLocaleString()} recorded revenue`);
  parts.push(
    `LEADER SCORECARD (source tables: profiles, rep_revenue):\n${leaderLines.join("\n") || "- none"}`
  );

  const underLed = rows.filter((p) => !p.direct_manager).map((p) => p.full_name);
  parts.push(
    `NO MANAGER ASSIGNED (${underLed.length}) (source table: profiles):\n${
      underLed.slice(0, 60).map((n) => `- ${n}`).join("\n") || "- none"
    }`
  );

  const total = [...revByUser.values()].reduce((a, b) => a + b, 0);
  const settings = new Map<string, string>(((goalRow.data ?? []) as any[]).map((r) => [r.key, r.value ?? ""]));
  const goal = Number(settings.get("season_revenue_goal") || 0);
  parts.push(
    `SEASON REVENUE (source tables: rep_revenue, app_settings):\n` +
      `- Recorded revenue: $${Math.round(total).toLocaleString()}\n` +
      `- Season goal: ${goal ? `$${goal.toLocaleString()}` : "not set"}${
        goal ? ` (${((total / goal) * 100).toFixed(1)}% of goal)` : ""
      }` +
      (settings.get("season_revenue_goal_note") ? `\n- Goal note: ${settings.get("season_revenue_goal_note")}` : "")
  );

  const lookup = rows
    .slice(0, 600)
    .map(
      (p) =>
        `- ${p.full_name} | office: ${p.office_name || "not set"} | manager: ${p.direct_manager || "not set"} | year: ${
          p.rep_year || "not set"
        } | next season: ${p.next_year_status || "not set"} | last day: ${p.committed_last_day || "not set"}`
    );
  parts.push(`PERSON LOOKUP (source table: profiles):\n${lookup.join("\n") || "- none"}`);

  return `\n\n=== LIVE DATA (owner/admin only, read-only) ===\n${parts.join("\n\n")}\n=== LIVE DATA END ===`;
}

async function loadScriptCards(admin: any, vertical = "Pest") {
  const { data } = await admin
    .from("scripts")
    .select("category, title, body")
    .or(`vertical.is.null,vertical.eq.${vertical}`)
    .eq("is_active", true)
    .order("display_order");
  return (data ?? []) as Array<{ category: string; title: string; body: string }>;
}

function formatScriptCards(scripts: Array<{ category: string; title: string; body: string }>) {
  return scripts
    .map((s) => `--- ${s.category} / ${s.title} ---\n${(s.body ?? "").trim()}`)
    .join("\n\n");
}

async function buildPracticeContext(admin: any) {
  const scripts = await loadScriptCards(admin);
  const { data: drills } = await admin
    .from("training_drills")
    .select("scenario, model_answer")
    .eq("is_active", true)
    .order("display_order");

  if (scripts.length === 0 && (!drills || drills.length === 0)) {
    return `\n\nSCRIPT CATEGORIES: none configured yet — use generic, realistic door objections (not interested, already have someone, too expensive, bad timing, need to ask my spouse, in the middle of something).`;
  }

  const parts: string[] = [];

  if (drills && drills.length > 0) {
    const objectionLines = drills.map(
      (d: any) => `- Homeowner line: "${d.scenario}"\n  Model rebuttal the rep was taught: ${String(d.model_answer ?? "").replace(/\n+/g, " ")}`
    );
    parts.push(
      `OBJECTIONS YOU MUST USE (pick from this exact set — do not invent other objections):\n${objectionLines.join("\n")}`
    );
  }

  if (scripts.length > 0) {
    parts.push(
      `THE SALES SYSTEM THE REP WAS TAUGHT (judge their handling against these when giving post-session feedback; never quote it during the roleplay):\n${formatScriptCards(scripts)}`
    );
  }

  return `\n\n${parts.join("\n\n")}`;
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

    const body = await req.json().catch(() => null) as { messages?: Message[]; mode?: string; finish?: boolean } | null;
    const messages = body?.messages;
    const mode: "ask" | "practice" = body?.mode === "practice" ? "practice" : "ask";
    const finish = body?.finish === true;
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
    const rank = ["rookie", "recruiter", "manager", "admin", "owner"];
    const verifiedRole = (roleRows ?? []).reduce(
      (best: string, r: any) => (rank.indexOf(r.role) > rank.indexOf(best) ? r.role : best),
      "rookie"
    );

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemContent: string;
    let gatewayMessages: Message[];

    if (mode === "practice") {
      const practiceContext = await buildPracticeContext(admin);
      if (finish) {
        systemContent = PRACTICE_SYSTEM_PROMPT + practiceContext + "\n\n" + PRACTICE_FEEDBACK_PROMPT;
        gatewayMessages = [...messages, { role: "user", content: "[END PRACTICE — give feedback now]" }];
      } else {
        systemContent = PRACTICE_SYSTEM_PROMPT + practiceContext;
        gatewayMessages = messages;
      }
    } else {
      const context = await buildContext(admin, userId);
      const isStaff = verifiedRole === "admin" || verifiedRole === "owner";
      const dataContext = isStaff ? await buildOwnerDataContext(admin) : "";
      systemContent =
        SYSTEM_PROMPT +
        context +
        (isStaff
          ? "\n\nDATA MODE: the asking user is the owner or an admin. You may answer from the LIVE DATA block below as well. Name the source table for any number you give. Answer plainly, never write or change anything, and still refuse anything not present in the data."
          : "") +
        dataContext;
      gatewayMessages = messages;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemContent }, ...gatewayMessages],
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

    const rawLastQuestion = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const lastQuestion = mode === "practice"
      ? (finish ? "[practice] session ended — feedback requested" : `[practice] ${rawLastQuestion}`)
      : rawLastQuestion;

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
