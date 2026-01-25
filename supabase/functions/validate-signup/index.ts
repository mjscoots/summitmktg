import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { accessCode, firstName, lastName, email, password, phone, directManager, role } = await req.json();

    // Validate required fields
    if (!accessCode || !firstName || !lastName || !email || !password || !phone || !directManager || !role) {
      return new Response(
        JSON.stringify({ error: "All fields are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate role
    if (!["rookie", "manager"].includes(role)) {
      return new Response(
        JSON.stringify({ error: "Invalid role selected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client to validate access code
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Validate access code using the secure function
    const { data: isValid, error: validationError } = await supabaseAdmin
      .rpc("validate_access_code", { input_code: accessCode });

    if (validationError) {
      console.error("Access code validation error:", validationError);
      return new Response(
        JSON.stringify({ error: "Validation failed. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isValid) {
      return new Response(
        JSON.stringify({ error: "Invalid access code. Please contact your manager." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Access code is valid - create the user account
    const fullName = `${firstName} ${lastName}`;
    
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
        phone,
        direct_manager: directManager,
        selected_role: role,
      },
    });

    if (authError) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the successful signup
    const { error: logError } = await supabaseAdmin
      .from("signup_logs")
      .insert({
        user_id: authData.user?.id,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        direct_manager: directManager,
        role,
      });

    if (logError) {
      console.error("Signup log error:", logError);
      // Don't fail the signup if logging fails
    }

    // Sign in the user to get a session
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      // User was created but couldn't sign in automatically
      // They can still log in manually
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Account created. Please log in.",
          requiresLogin: true 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        session: signInData.session,
        user: signInData.user,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Signup error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
