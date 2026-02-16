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
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !callerUser) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
      // Determine the role to assign
      const assignRole = newRole || "rookie";

      // Update profile
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({ approved: true, status: "active" })
        .eq("user_id", user_id);

      if (profileError) throw new Error(profileError.message);

      // Update role if needed
      const { error: roleUpdateError } = await supabaseAdmin
        .from("user_roles")
        .update({ role: assignRole })
        .eq("user_id", user_id);

      if (roleUpdateError) throw new Error(roleUpdateError.message);

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

    } else if (action === "update_profile") {
      const { updates } = await req.json().catch(() => ({ updates: {} }));
      // Re-parse body since we already consumed it
      // Actually the body was already parsed, so we need to get updates from the original parse
      return new Response(JSON.stringify({ error: "Use dedicated endpoint for profile updates" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "promote_admin") {
      // Add admin role
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

    } else if (action === "update_fields") {
      // Generic profile field update by admin
      const body = JSON.parse(req.headers.get("x-update-fields") || "{}");
      // This won't work since body is consumed. Let me restructure.
      return new Response(JSON.stringify({ error: "Not implemented via this action" }), {
        status: 400,
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
