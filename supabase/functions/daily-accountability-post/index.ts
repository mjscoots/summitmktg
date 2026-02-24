import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get a system user ID (admin) for posting bot messages
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .limit(1)
      .single();

    const botUserId = adminRole?.user_id;
    if (!botUserId) {
      return new Response(
        JSON.stringify({ error: "No admin user found for bot posts" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete any existing accountability posts from today so we always get fresh data
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    await supabase
      .from("chat_messages")
      .delete()
      .eq("is_ai", true)
      .eq("channel", "general")
      .ilike("content", "%DAILY ACCOUNTABILITY%")
      .gte("created_at", todayStart.toISOString());

    // Fetch all rookies
    const { data: rookieRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "rookie");

    const rookieIds = (rookieRoles || []).map((r) => r.user_id);
    if (!rookieIds.length) {
      return new Response(
        JSON.stringify({ message: "No rookies found", posted: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch profiles, bootcamp progress, and activity in parallel
    const [profilesRes, bootcampRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("user_id, full_name, status, onboarding_status, last_active_at, team_id")
        .in("user_id", rookieIds)
        .eq("status", "active"),
      supabase
        .from("bootcamp_progress")
        .select("user_id, bootcamp_completed, bootcamp_exempt")
        .in("user_id", rookieIds),
    ]);

    const profiles = profilesRes.data || [];
    const bootcampMap = new Map(
      (bootcampRes.data || []).map((b) => [b.user_id, b])
    );

    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const bootcampIncomplete: string[] = [];
    const notOnboarded: string[] = [];
    const inactive: string[] = [];

    for (const p of profiles) {
      const bp = bootcampMap.get(p.user_id);

      // Bootcamp incomplete
      if (!bp?.bootcamp_completed && !bp?.bootcamp_exempt) {
        bootcampIncomplete.push(p.full_name);
      }

      // Not onboarded (not yet reached 'onboarded' or 'summer_ready')
      const onboardedStatuses = ["onboarded", "summer_ready"];
      if (!onboardedStatuses.includes(p.onboarding_status || "")) {
        notOnboarded.push(p.full_name);
      }

      // Inactive 3+ days
      if (!p.last_active_at || new Date(p.last_active_at) < threeDaysAgo) {
        inactive.push(p.full_name);
      }
    }

    // Build the post — cap at 10 names, add "View Full List" note
    const MAX_NAMES = 10;
    const sections: string[] = [];

    const formatNameList = (names: string[], label: string, emoji: string): string => {
      const displayed = names.slice(0, MAX_NAMES);
      const remaining = names.length - displayed.length;
      const nameStr = displayed.map(n => `• ${n}`).join("\n");
      const extra = remaining > 0 ? `\n_...and ${remaining} more — see Team page for full list_` : "";
      return `${emoji} **${label}** (${names.length})\n${nameStr}${extra}`;
    };

    if (bootcampIncomplete.length > 0) {
      sections.push(formatNameList(bootcampIncomplete, "BOOT CAMP INCOMPLETE", "🏔️"));
    }

    if (notOnboarded.length > 0) {
      sections.push(formatNameList(notOnboarded, "NOT ONBOARDED", "📋"));
    }

    if (inactive.length > 0) {
      sections.push(formatNameList(inactive, "GHOST MODE — 3+ DAYS INACTIVE", "👻"));
    }

    if (sections.length === 0) {
      return new Response(
        JSON.stringify({ message: "Everyone is on track! No post needed.", posted: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const content = `📢 **DAILY ACCOUNTABILITY REPORT**\n\n${sections.join("\n\n")}\n\n---\nManagers — if your people are on this list, it's your job to get them off it. ⚔️`;

    await supabase.from("chat_messages").insert({
      user_id: botUserId,
      is_ai: true,
      content,
      channel: "general",
    });

    return new Response(
      JSON.stringify({
        message: "Posted daily accountability",
        posted: true,
        bootcamp_incomplete: bootcampIncomplete.length,
        not_onboarded: notOnboarded.length,
        inactive: inactive.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error posting daily accountability:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
