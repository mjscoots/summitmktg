import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // Get all pending pitch requests
    const { data: pendingRequests, error } = await supabase
      .from("pitch_approval_requests")
      .select("id, user_id, lesson_id, submitted_at")
      .eq("status", "pending");

    if (error) throw error;
    if (!pendingRequests || pendingRequests.length === 0) {
      return new Response(JSON.stringify({ message: "No pending requests" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = Date.now();
    let reminders = 0;

    for (const req of pendingRequests) {
      const submittedAt = new Date(req.submitted_at).getTime();
      const hoursElapsed = (now - submittedAt) / (1000 * 60 * 60);

      if (hoursElapsed < 24) continue;

      // Get rookie profile and their manager
      const { data: rookieProfile } = await supabase
        .from("profiles")
        .select("full_name, direct_manager, team_id")
        .eq("user_id", req.user_id)
        .single();

      if (!rookieProfile) continue;

      // Get lesson title
      const { data: lesson } = await supabase
        .from("training_lessons")
        .select("title")
        .eq("id", req.lesson_id)
        .single();

      const lessonTitle = lesson?.title || "Unknown";

      // Determine who to notify based on elapsed time
      const targets: string[] = [];

      // 24h+ → notify manager
      if (rookieProfile.direct_manager) {
        const { data: manager } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("full_name", rookieProfile.direct_manager)
          .maybeSingle();
        if (manager) targets.push(manager.user_id);
      }

      // 48h+ → also notify pillar
      if (hoursElapsed >= 48 && rookieProfile.team_id) {
        const { data: team } = await supabase
          .from("teams")
          .select("leader_id")
          .eq("id", rookieProfile.team_id)
          .single();
        if (team?.leader_id && !targets.includes(team.leader_id)) {
          targets.push(team.leader_id);
        }
      }

      // 72h+ → also notify admins
      if (hoursElapsed >= 72) {
        const { data: admins } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");
        (admins || []).forEach((a) => {
          if (!targets.includes(a.user_id)) targets.push(a.user_id);
        });
      }

      // Dedup: check if reminder was already sent in last 12 hours
      for (const targetId of targets) {
        const { count } = await supabase
          .from("user_notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", targetId)
          .ilike("title", `%${rookieProfile.full_name}%pitch%`)
          .gte("created_at", new Date(now - 12 * 60 * 60 * 1000).toISOString());

        if (count && count > 0) continue;

        const hours = Math.floor(hoursElapsed);
        await supabase.from("user_notifications").insert({
          user_id: targetId,
          title: `⚠️ Overdue: ${rookieProfile.full_name}'s ${lessonTitle} pitch (${hours}h)`,
          message: `This pitch has been pending for ${hours}+ hours. Please review promptly.`,
          link: "/app/pitch-approvals",
        });
        reminders++;
      }
    }

    return new Response(
      JSON.stringify({ message: `Sent ${reminders} reminders` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
