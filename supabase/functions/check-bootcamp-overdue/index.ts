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

    // Get configurable deadline hours (default 48)
    const { data: setting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "bootcamp_deadline_hours")
      .maybeSingle();

    const deadlineHours = setting?.value ? parseInt(setting.value, 10) : 48;

    // Find rookies who haven't completed bootcamp and are past the deadline
    const { data: rookieRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "rookie");

    if (!rookieRoles?.length) {
      return new Response(
        JSON.stringify({ message: "No rookies found", notified: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rookieIds = rookieRoles.map((r) => r.user_id);

    // Get bootcamp progress for rookies who haven't been notified yet
    const { data: bootcampData } = await supabase
      .from("bootcamp_progress")
      .select("user_id, bootcamp_completed, bootcamp_exempt, manager_notified_at")
      .in("user_id", rookieIds)
      .eq("bootcamp_completed", false)
      .eq("bootcamp_exempt", false)
      .is("manager_notified_at", null);

    if (!bootcampData?.length) {
      return new Response(
        JSON.stringify({ message: "No overdue reps to notify about", notified: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const overdueUserIds = bootcampData.map((b) => b.user_id);

    // Get profiles with created_at and manager info
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, created_at, direct_manager, team_id, status")
      .in("user_id", overdueUserIds)
      .eq("status", "active");

    if (!profiles?.length) {
      return new Response(
        JSON.stringify({ message: "No active overdue profiles", notified: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date();
    const overdueReps: typeof profiles = [];

    for (const p of profiles) {
      if (!p.created_at) continue;
      const createdAt = new Date(p.created_at);
      const deadlineAt = new Date(createdAt.getTime() + deadlineHours * 60 * 60 * 1000);
      if (now > deadlineAt) {
        overdueReps.push(p);
      }
    }

    if (!overdueReps.length) {
      return new Response(
        JSON.stringify({ message: "No reps past deadline yet", notified: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find managers by matching direct_manager name to profiles
    const managerNames = [...new Set(overdueReps.map((r) => r.direct_manager).filter(Boolean))];

    const { data: managerProfiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("full_name", managerNames);

    const managerMap = new Map<string, string>();
    (managerProfiles || []).forEach((m) => {
      managerMap.set(m.full_name, m.user_id);
    });

    // Create notifications for each manager about their overdue reps
    const notifications: Array<{
      user_id: string;
      title: string;
      message: string;
      link: string;
    }> = [];

    const notifiedUserIds: string[] = [];

    for (const rep of overdueReps) {
      const managerUserId = rep.direct_manager ? managerMap.get(rep.direct_manager) : null;
      if (!managerUserId) continue;

      const hoursOverdue = Math.floor(
        (now.getTime() - new Date(rep.created_at!).getTime()) / (1000 * 60 * 60) - deadlineHours
      );

      notifications.push({
        user_id: managerUserId,
        title: "Boot Camp Overdue",
        message: `${rep.full_name} has not completed boot camp (${hoursOverdue}h overdue).`,
        link: "/app/manager",
      });

      notifiedUserIds.push(rep.user_id);
    }

    // Insert notifications
    if (notifications.length > 0) {
      await supabase.from("user_notifications").insert(notifications);
    }

    // Mark reps as notified to avoid duplicate notifications
    if (notifiedUserIds.length > 0) {
      await supabase
        .from("bootcamp_progress")
        .update({ manager_notified_at: now.toISOString() })
        .in("user_id", notifiedUserIds);
    }

    return new Response(
      JSON.stringify({
        message: `Notified managers about ${notifications.length} overdue rep(s)`,
        notified: notifications.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error checking bootcamp overdue:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
