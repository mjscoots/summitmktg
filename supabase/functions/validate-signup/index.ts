import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Define allowed origins for CORS
const allowedOrigins = [
  "https://summitmktg.lovable.app",
  "https://id-preview--1257bd97-61e1-4ead-9de9-5dad7ab016d6.lovable.app",
  "https://summitmktgsales.com",
  "https://www.summitmktgsales.com",
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && allowedOrigins.some(allowed => 
    origin === allowed || origin.endsWith('.lovable.app') || origin.endsWith('summitmktgsales.com')
  );
  
  return {
    "Access-Control-Allow-Origin": isAllowed && origin ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

// Validation regex patterns
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const nameRegex = /^[a-zA-Z\s\-']{1,100}$/;
const phoneRegex = /^[\d\s\-\(\)\+]{7,20}$/;

serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { accessCode, firstName, lastName, email, password, phone, directManager, role } = body;

    // Create admin client for rate limiting check
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get client IP for rate limiting
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("x-real-ip") || 
                     "unknown";
    
    // Check rate limit: 5 attempts per 15 minutes per IP
    const rateLimitKey = `signup:${clientIp}`;
    const { data: isAllowed, error: rateLimitError } = await supabaseAdmin
      .rpc("check_rate_limit", { 
        p_key: rateLimitKey, 
        p_max_attempts: 5, 
        p_window_seconds: 900 // 15 minutes
      });

    if (rateLimitError) {
      console.error("Rate limit check error:", rateLimitError);
      // Continue anyway - don't block if rate limiting fails
    } else if (!isAllowed) {
      return new Response(
        JSON.stringify({ error: "Too many signup attempts. Please try again in 15 minutes." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate required fields presence
    if (!accessCode || !firstName || !lastName || !email || !password || !phone || !directManager || !role) {
      return new Response(
        JSON.stringify({ error: "All fields are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize inputs by trimming
    const trimmedFirstName = String(firstName).trim();
    const trimmedLastName = String(lastName).trim();
    const trimmedEmail = String(email).trim().toLowerCase();
    const trimmedPhone = String(phone).trim();
    const trimmedDirectManager = String(directManager).trim();
    const trimmedAccessCode = String(accessCode).trim();

    // Validate email format
    if (!emailRegex.test(trimmedEmail)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate name fields (1-100 chars, letters/spaces/hyphens/apostrophes)
    if (!nameRegex.test(trimmedFirstName)) {
      return new Response(
        JSON.stringify({ error: "Invalid first name (1-100 characters, letters only)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!nameRegex.test(trimmedLastName)) {
      return new Response(
        JSON.stringify({ error: "Invalid last name (1-100 characters, letters only)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!nameRegex.test(trimmedDirectManager)) {
      return new Response(
        JSON.stringify({ error: "Invalid manager name (1-100 characters, letters only)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate phone format (7-20 chars with digits and formatting)
    if (!phoneRegex.test(trimmedPhone)) {
      return new Response(
        JSON.stringify({ error: "Invalid phone format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate password strength (server-side)
    if (password.length < 8 || password.length > 128) {
      return new Response(
        JSON.stringify({ error: "Password must be 8-128 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate access code length
    if (trimmedAccessCode.length < 1 || trimmedAccessCode.length > 100) {
      return new Response(
        JSON.stringify({ error: "Invalid access code" }),
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

    // Validate access code using the secure function
    const { data: isValid, error: validationError } = await supabaseAdmin
      .rpc("validate_access_code", { input_code: trimmedAccessCode });

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
    const fullName = `${trimmedFirstName} ${trimmedLastName}`;
    
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: trimmedEmail,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
        phone: trimmedPhone,
        direct_manager: trimmedDirectManager,
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
        first_name: trimmedFirstName,
        last_name: trimmedLastName,
        email: trimmedEmail,
        phone: trimmedPhone,
        direct_manager: trimmedDirectManager,
        role,
      });

    if (logError) {
      console.error("Signup log error:", logError);
      // Don't fail the signup if logging fails
    }

    // Sign in the user to get a session
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: trimmedEmail,
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
      { status: 500, headers: { ...getCorsHeaders(null), "Content-Type": "application/json" } }
    );
  }
});
