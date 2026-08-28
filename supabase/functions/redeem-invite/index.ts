import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const body = await req.json();
    const action = body.action === "redeem" ? "redeem" : "preview";
    const token = String(body.token || "").trim();
    if (!token) return json({ status: "invalid" }, 400);

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    if (action === "preview") {
      const { data, error } = await admin.rpc("invite_preview", { p_token: token });
      if (error) return json({ status: "invalid" }, 400);
      return json(data);
    }

    // 20 redemption attempts per IP per hour, on top of the per-token limit.
    const { data: ipAllowed } = await admin.rpc("check_rate_limit", {
      p_key: `invite_redeem_ip_${ip}`,
      p_max_attempts: 20,
      p_window_seconds: 3600,
    });
    if (!ipAllowed) return json({ status: "rate_limited" }, 429);

    const { data: claim, error: claimError } = await admin.rpc("redeem_invite", {
      p_token: token,
      p_first_name: String(body.first_name || ""),
      p_last_name: String(body.last_name || ""),
      p_email: String(body.email || ""),
      p_phone: body.phone ? String(body.phone) : null,
    });
    if (claimError) return json({ status: "invalid" }, 400);
    const invite = claim as Record<string, unknown>;
    if (invite?.status !== "ok") return json(invite, 200);

    const email = String(invite.email);
    const fullName = String(invite.full_name);
    const role = String(invite.role || "rep");
    // 'rep' is the invite wording; the app stores rookie for a field rep.
    const appRole = role === "rep" ? "rookie" : role === "vertical lead" ? "manager" : role;

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: crypto.randomUUID() + crypto.randomUUID(),
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone: invite.phone || undefined,
        selected_role: appRole,
        approved: true,
      },
    });

    if (createError || !created?.user) {
      return json({ status: "error", message: createError?.message || "Could not create the account" }, 500);
    }

    const userId = created.user.id;

    let managerName: string | null = null;
    if (invite.manager_id) {
      const { data: mgr } = await admin
        .from("profiles")
        .select("full_name")
        .eq("user_id", invite.manager_id as string)
        .maybeSingle();
      managerName = mgr?.full_name ?? null;
    }

    await admin
      .from("profiles")
      .update({
        phone: (invite.phone as string) || null,
        team_id: (invite.team_id as string) || null,
        manager_id: (invite.manager_id as string) || null,
        direct_manager: managerName,
        // Pass 89 — Pest is the default placement unless the invite named another vertical.
        active_vertical: (invite.vertical as string) || "Pest",
        region: (invite.region as string) || null,
        vertical: (invite.vertical as string) || "Pest",
        status: "active",
        approved: true,
      })
      .eq("user_id", userId);

    if (appRole !== "rookie") {
      await admin.from("user_roles").insert({ user_id: userId, role: appRole });
      await admin.from("user_roles").delete().eq("user_id", userId).eq("role", "rookie");
    }

    {
      const enrollVertical = (invite.vertical as string) || "Pest";
      let regionId: string | null = null;
      if (invite.region) {
        const { data: reg } = await admin
          .from("regions")
          .select("id")
          .eq("vertical", enrollVertical)
          .eq("name", invite.region as string)
          .maybeSingle();
        regionId = reg?.id ?? null;
      }
      await admin.from("rep_vertical_enrollments").insert({
        user_id: userId,
        vertical: enrollVertical,
        status: "active",
        source_type: "other",
        sourced_by: "leader",
        region_id: regionId,
        paired_manager: (invite.manager_id as string) || null,
        activated_at: new Date().toISOString(),
      });
      // The region also lives on the profile: home and the region roster read it there.
      if (regionId) {
        await admin.from("profiles").update({ region_id: regionId }).eq("user_id", userId);
      }
    }

    if (invite.manager_id) {
      await admin.from("downline_edges").insert({
        parent_user_id: invite.manager_id as string,
        child_user_id: userId,
      });
    }

    await admin.rpc("finalize_invite", { p_token: token, p_user_id: userId });

    return json({ status: "ok", email });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ status: "error", message }, 500);
  }
});
