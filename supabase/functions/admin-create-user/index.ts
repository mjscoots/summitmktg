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

    // Verify the caller is an admin or manager
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

    // Check if caller is admin ONLY
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUser.id)
      .eq("role", "admin");

    if (!roleData || roleData.length === 0) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: max 10 account creations per 5 minutes
    const { data: allowed } = await supabaseAdmin.rpc("check_rate_limit", {
      p_key: `admin_create_user_${callerUser.id}`,
      p_max_attempts: 10,
      p_window_seconds: 300,
    });
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in a few minutes." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { 
      email, 
      password = "summit2026", 
      full_name, 
      phone, 
      role = "rookie", 
      team_id, 
      direct_manager, 
      status = "active",
      send_welcome = true,
    } = body;

    if (!email || !full_name) {
      return new Response(JSON.stringify({ error: "Email and full name are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if profile already exists with this email
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, user_id, email")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingProfile) {
      return new Response(JSON.stringify({ error: "A member with this email already exists" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create the auth user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { 
        full_name,
        phone: phone || undefined,
        direct_manager: direct_manager || undefined,
        selected_role: role,
        approved: true,
      }
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // The handle_new_user trigger creates the profile and role automatically.
    // Now update the profile with additional fields.
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        phone: phone || null,
        team_id: team_id || null,
        direct_manager: direct_manager || null,
        status: status,
        approved: true,
      })
      .eq("user_id", newUser.user.id);

    if (updateError) {
      console.error("Profile update error:", updateError);
    }

    // Initialize bootcamp progress (locked by default)
    const { error: bootcampError } = await supabaseAdmin
      .from("bootcamp_progress")
      .insert({
        user_id: newUser.user.id,
        phase_1_complete: false,
        phase_2_complete: false,
        phase_3_complete: false,
        bootcamp_completed: false,
      });

    if (bootcampError) {
      console.error("Bootcamp progress init error:", bootcampError);
    }

    // Send welcome/invite email if requested
    if (send_welcome) {
      try {
        const resendKey = Deno.env.get("RESEND_API_KEY");
        if (resendKey) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Summit <noreply@summitmktgsales.com>",
              to: [normalizedEmail],
              subject: "Welcome to Summit — Your Account is Ready",
              html: `
                <h2>Welcome to Summit, ${full_name}!</h2>
                <p>Your account has been created. Here are your login details:</p>
                <p><strong>Email:</strong> ${normalizedEmail}</p>
                <p><strong>Temporary Password:</strong> ${password}</p>
                <p>Please log in and change your password immediately.</p>
                <p><a href="https://summitmktg.lovable.app/app/auth">Log in to Summit</a></p>
              `,
            }),
          });
        }
      } catch (emailErr) {
        console.error("Welcome email failed:", emailErr);
        // Don't fail the whole operation if email fails
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `${full_name} added successfully`,
      user_id: newUser.user.id,
    }), {
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
