import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = [
  "https://summitmktg.lovable.app",
  "https://summitmktgsales.com",
  "https://www.summitmktgsales.com",
  "http://localhost:8080",
];

// Pass 165 - the app's own origins only, never a wildcard.
function getCorsHeaders(origin: string | null) {
  const isAllowed = origin && (allowedOrigins.includes(origin) || origin.endsWith(".lovable.app"));
  return {
    "Access-Control-Allow-Origin": isAllowed && origin ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Vary": "Origin",
  };
}

const jsonWith = (corsHeaders: Record<string, string>) =>
  (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

/**
 * The permanent pillar recruit link. It creates the account pre-tagged with the
 * pillar, its leader and the pillar's industry, and leaves the person pending:
 * no industry membership row is written here, so they wait to be accepted.
 */
Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  const json = jsonWith(corsHeaders);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const body = await req.json();
    const token = String(body.token || "").trim();
    const firstName = String(body.first_name || "").trim();
    const lastName = String(body.last_name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = body.phone ? String(body.phone).trim() : null;

    if (!token || !firstName || !lastName || !email) {
      return json({ status: "invalid" }, 400);
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { data: ipAllowed } = await admin.rpc("check_rate_limit", {
      p_key: `pillar_join_ip_${ip}`,
      p_max_attempts: 20,
      p_window_seconds: 3600,
    });
    if (!ipAllowed) return json({ status: "rate_limited" }, 429);

    const { data: resolved, error: resolveError } = await admin.rpc("pillar_link_resolve", {
      p_token: token,
    });
    const pillar = (resolved || {}) as Record<string, unknown>;
    if (resolveError || pillar.valid !== true) return json({ status: "invalid" }, 400);

    const { data: existing } = await admin
      .from("profiles")
      .select("user_id")
      .ilike("email", email)
      .maybeSingle();
    if (existing) return json({ status: "account_exists" }, 200);

    const fullName = `${firstName} ${lastName}`.trim();

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: crypto.randomUUID() + crypto.randomUUID(),
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone: phone || undefined,
        selected_role: "rookie",
      },
    });

    if (createError || !created?.user) {
      const message = createError?.message || "Could not create the account";
      if (message.toLowerCase().includes("already")) return json({ status: "account_exists" }, 200);
      return json({ status: "error", message }, 500);
    }

    const userId = created.user.id;
    const leaderId = (pillar.leader_id as string) || null;

    let leaderName: string | null = null;
    if (leaderId) {
      const { data: leader } = await admin
        .from("profiles")
        .select("full_name")
        .eq("user_id", leaderId)
        .maybeSingle();
      leaderName = leader?.full_name ?? null;
    }

    await admin
      .from("profiles")
      .update({
        full_name: fullName,
        phone,
        team_id: (pillar.team_id as string) || null,
        manager_id: leaderId,
        direct_manager: leaderName,
        vertical: (pillar.vertical as string) || null,
        status: "pending",
        approved: false,
      })
      .eq("user_id", userId);

    if (leaderId) {
      await admin.from("downline_edges").insert({
        parent_user_id: leaderId,
        child_user_id: userId,
        edge_type: "manages",
      });
    }

    await admin.from("placement_log").insert({
      user_id: userId,
      placed_by: leaderId,
      team_id: (pillar.team_id as string) || null,
      manager_id: leaderId,
      vertical: (pillar.vertical as string) || null,
      action: "pillar_link_join",
    });

    return json({ status: "ok", email });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ status: "error", message }, 500);
  }
});
