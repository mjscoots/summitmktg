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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Reps can self-delete; prevent privileged account self-deletion here.
    const { data: roleRows } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const hasPrivilegedRole = (roleRows || []).some((r) => r.role === "admin" || r.role === "owner");
    if (hasPrivilegedRole) {
      return new Response(JSON.stringify({ error: "Privileged accounts must be deleted by an owner" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    // Delete owned rows
    await supabaseAdmin.from("chat_read_receipts").delete().eq("user_id", userId);
    await supabaseAdmin.from("chat_reactions").delete().eq("user_id", userId);
    await supabaseAdmin.from("chat_poll_votes").delete().eq("user_id", userId);
    await supabaseAdmin.from("chat_messages").delete().eq("user_id", userId);
    await supabaseAdmin.from("ai_coach_conversations").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_priority_tasks").delete().eq("user_id", userId);
    await supabaseAdmin.from("event_notifications").delete().eq("user_id", userId);
    await supabaseAdmin.from("calendar_event_assignees").delete().eq("user_id", userId);
    await supabaseAdmin.from("calendar_attendance").delete().eq("user_id", userId);
    await supabaseAdmin.from("bootcamp_progress").delete().eq("user_id", userId);
    await supabaseAdmin.from("lesson_progress").delete().eq("user_id", userId);
    await supabaseAdmin.from("video_progress").delete().eq("user_id", userId);
    await supabaseAdmin.from("daily_training_time").delete().eq("user_id", userId);
    await supabaseAdmin.from("leaderboard_points").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_training_achievements").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_notifications").delete().eq("user_id", userId);
    await supabaseAdmin.from("streak_breaks").delete().eq("user_id", userId);
    await supabaseAdmin.from("daily_login_streaks").delete().eq("user_id", userId);
    await supabaseAdmin.from("notification_preferences").delete().eq("user_id", userId);
    await supabaseAdmin.from("signup_logs").delete().eq("user_id", userId);
    await supabaseAdmin.from("inactivity_email_log").delete().eq("user_id", userId);
    await supabaseAdmin.from("inactive_users_log").delete().eq("user_id", userId);
    await supabaseAdmin.from("pitch_approval_requests").delete().eq("user_id", userId);
    await supabaseAdmin.from("weekly_one_on_ones_manager").delete().eq("submitted_by", userId);
    await supabaseAdmin.from("weekly_one_on_ones_rookie").delete().eq("submitted_by", userId);

    await supabaseAdmin.from("scheduling_requests").delete().eq("recipient_id", userId);
    await supabaseAdmin.from("scheduling_requests").delete().eq("requester_id", userId);

    await supabaseAdmin.from("downline_edges").delete().eq("parent_user_id", userId);
    await supabaseAdmin.from("downline_edges").delete().eq("child_user_id", userId);

    // Nullify references where user may be linked but not owner
    await supabaseAdmin.from("weekly_one_on_ones_manager").update({ manager_user_id: null }).eq("manager_user_id", userId);
    await supabaseAdmin.from("weekly_one_on_ones_rookie").update({ rookie_user_id: null }).eq("rookie_user_id", userId);
    await supabaseAdmin.from("rep_signups").update({ signed_by: null }).eq("signed_by", userId);
    await supabaseAdmin.from("team_resources").update({ added_by: null }).eq("added_by", userId);
    await supabaseAdmin.from("teams").update({ leader_id: null }).eq("leader_id", userId);
    await supabaseAdmin.from("calendar_events").update({ created_by: null }).eq("created_by", userId);
    await supabaseAdmin.from("calendar_events").update({ manager_id: null }).eq("manager_id", userId);
    await supabaseAdmin.from("training_videos").update({ added_by: null }).eq("added_by", userId);
    await supabaseAdmin.from("training_content").update({ last_edited_by: null }).eq("last_edited_by", userId);
    await supabaseAdmin.from("training_content_versions").update({ edited_by: null }).eq("edited_by", userId);
    await supabaseAdmin.from("team_scripts").update({ last_edited_by: null }).eq("last_edited_by", userId);

    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    await supabaseAdmin.from("profiles").delete().eq("user_id", userId);

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) throw new Error(deleteError.message);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
