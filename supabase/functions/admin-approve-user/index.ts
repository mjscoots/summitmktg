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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");

    // Use a user-scoped client to validate the JWT
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerUserId = claimsData.claims.sub;
    const callerUser = { id: callerUserId };

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUser.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, user_id, role: newRole } = await req.json();

    if (!action || !user_id) {
      return new Response(JSON.stringify({ error: "action and user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "approve") {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({ approved: true, status: "active" })
        .eq("user_id", user_id);
      if (profileError) throw new Error(profileError.message);

      // Only update role if explicitly provided; otherwise keep the role set during signup
      if (newRole) {
        const { error: roleUpdateError } = await supabaseAdmin
          .from("user_roles")
          .update({ role: newRole })
          .eq("user_id", user_id);
        if (roleUpdateError) throw new Error(roleUpdateError.message);
      }

      // Initialize bootcamp progress
      const { data: existing } = await supabaseAdmin
        .from("bootcamp_progress")
        .select("id")
        .eq("user_id", user_id)
        .maybeSingle();

      if (!existing) {
        await supabaseAdmin.from("bootcamp_progress").insert({
          user_id,
          phase_1_complete: false,
          phase_2_complete: false,
          phase_3_complete: false,
          bootcamp_completed: false,
        });
      }

      // Send approval email
      try {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("email, full_name")
          .eq("user_id", user_id)
          .maybeSingle();

        const resendKey = Deno.env.get("RESEND_API_KEY");
        if (resendKey && profile?.email) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Summit <onboarding@resend.dev>",
              to: [profile.email],
              subject: "Your Summit Account Has Been Approved",
              html: `
                <h2>Welcome to Summit, ${profile.full_name}!</h2>
                <p>Your account has been approved. You can now log in and begin your Boot Camp.</p>
                <p><a href="https://summitmktg.lovable.app/login">Log in to Summit</a></p>
              `,
            }),
          });
        }
      } catch (emailErr) {
        console.error("Approval email failed:", emailErr);
      }

      return new Response(JSON.stringify({ success: true, message: "User approved" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "reject") {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({ approved: false, status: "rejected" })
        .eq("user_id", user_id);
      if (profileError) throw new Error(profileError.message);

      return new Response(JSON.stringify({ success: true, message: "User rejected" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "promote_admin") {
      const { data: existingRole } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", user_id)
        .eq("role", "admin")
        .maybeSingle();

      if (!existingRole) {
        await supabaseAdmin.from("user_roles").update({ role: "admin" }).eq("user_id", user_id);
      }

      return new Response(JSON.stringify({ success: true, message: "User promoted to admin" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "demote_admin") {
      await supabaseAdmin.from("user_roles").update({ role: "manager" }).eq("user_id", user_id);

      return new Response(JSON.stringify({ success: true, message: "User demoted from admin" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "update_role") {
      if (!newRole) {
        return new Response(JSON.stringify({ error: "role is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await supabaseAdmin.from("user_roles").update({ role: newRole }).eq("user_id", user_id);

      return new Response(JSON.stringify({ success: true, message: `Role updated to ${newRole}` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "delete_user") {
      // Only super admin can delete users - verify caller email
      const { data: callerProfile } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("user_id", callerUser.id)
        .maybeSingle();

      if (callerProfile?.email !== "mjscoots9@gmail.com") {
        return new Response(JSON.stringify({ error: "Only super admin can delete users" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Prevent deleting self
      if (user_id === callerUser.id) {
        return new Response(JSON.stringify({ error: "Cannot delete your own account" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete related data first (order matters for foreign keys)
      await supabaseAdmin.from("chat_messages").delete().eq("user_id", user_id);
      await supabaseAdmin.from("user_priority_tasks").delete().eq("user_id", user_id);
      await supabaseAdmin.from("event_notifications").delete().eq("user_id", user_id);
      await supabaseAdmin.from("calendar_event_assignees").delete().eq("user_id", user_id);
      await supabaseAdmin.from("calendar_attendance").delete().eq("user_id", user_id);
      await supabaseAdmin.from("bootcamp_progress").delete().eq("user_id", user_id);
      await supabaseAdmin.from("lesson_progress").delete().eq("user_id", user_id);
      await supabaseAdmin.from("video_progress").delete().eq("user_id", user_id);
      await supabaseAdmin.from("leaderboard_points").delete().eq("user_id", user_id);
      await supabaseAdmin.from("user_training_achievements").delete().eq("user_id", user_id);
      await supabaseAdmin.from("user_notifications").delete().eq("user_id", user_id);
      await supabaseAdmin.from("streak_breaks").delete().eq("user_id", user_id);
      await supabaseAdmin.from("user_roles").delete().eq("user_id", user_id);
      // Nullify references in tables where the user isn't the owner
      await supabaseAdmin.from("weekly_one_on_ones_manager").update({ manager_user_id: null }).eq("manager_user_id", user_id);
      await supabaseAdmin.from("weekly_one_on_ones_rookie").update({ rookie_user_id: null }).eq("rookie_user_id", user_id);
      await supabaseAdmin.from("rep_signups").update({ signed_by: null }).eq("signed_by", user_id);
      await supabaseAdmin.from("team_resources").update({ added_by: null }).eq("added_by", user_id);
      await supabaseAdmin.from("teams").update({ leader_id: null }).eq("leader_id", user_id);
      await supabaseAdmin.from("profiles").delete().eq("user_id", user_id);

      // Delete auth user
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);
      if (deleteError) throw new Error(deleteError.message);

      return new Response(JSON.stringify({ success: true, message: "User permanently deleted" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
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
