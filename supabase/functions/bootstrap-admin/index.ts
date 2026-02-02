import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Check if admin already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const adminExists = existingUsers?.users?.some(u => u.email === "mjscoots9@gmail.com");

    if (adminExists) {
      return new Response(
        JSON.stringify({ message: "Admin account already exists", exists: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Create the admin account
    const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: "mjscoots9@gmail.com",
      phone: "+17078353345",
      password: "Learn760!",
      email_confirm: true,
      user_metadata: {
        full_name: "Mathew Daniel Joyce",
        phone: "707-835-3345",
        selected_role: "admin",
      },
    });

    if (createError) {
      throw createError;
    }

    // The trigger will create the profile and user_role automatically
    // But let's also ensure admin role is set
    if (authUser?.user) {
      // Update the user_roles to ensure admin is set
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .upsert({
          user_id: authUser.user.id,
          role: "admin"
        }, { onConflict: "user_id,role" });

      if (roleError) {
        console.error("Role assignment error:", roleError);
      }

      // Update profile to mark password as already changed (admin gets immediate access)
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({ 
          password_changed: true,
          otp_verified: true 
        })
        .eq("user_id", authUser.user.id);

      if (profileError) {
        console.error("Profile update error:", profileError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Admin account created successfully",
        email: "mjscoots9@gmail.com"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Bootstrap error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
