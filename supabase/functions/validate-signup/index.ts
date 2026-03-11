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

/** Normalize a name for matching: lowercase, first+last only */
function normalizeForMatch(name: string): string {
  const parts = name.toLowerCase().trim().split(/\s+/);
  if (parts.length <= 2) return parts.join(' ');
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { accessCode, firstName, lastName, email, password, phone, directManager, role } = body;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Rate limit
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("x-real-ip") || "unknown";
    const rateLimitKey = `signup:${clientIp}`;
    const { data: isAllowed, error: rateLimitError } = await supabaseAdmin
      .rpc("check_rate_limit", { p_key: rateLimitKey, p_max_attempts: 5, p_window_seconds: 900 });

    if (rateLimitError) {
      console.error("Rate limit check error:", rateLimitError);
    } else if (!isAllowed) {
      return new Response(
        JSON.stringify({ error: "Too many signup attempts. Please try again in 15 minutes." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate required fields
    if (!accessCode || !firstName || !lastName || !email || !password || !phone || !directManager || !role) {
      return new Response(
        JSON.stringify({ error: "All fields are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmedFirstName = String(firstName).trim();
    const trimmedLastName = String(lastName).trim();
    const trimmedEmail = String(email).trim().toLowerCase();
    const trimmedPhone = String(phone).trim();
    const trimmedDirectManager = String(directManager).trim();
    const trimmedAccessCode = String(accessCode).trim();

    if (!emailRegex.test(trimmedEmail)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    if (!phoneRegex.test(trimmedPhone)) {
      return new Response(
        JSON.stringify({ error: "Invalid phone format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 8 || password.length > 128) {
      return new Response(
        JSON.stringify({ error: "Password must be 8-128 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (trimmedAccessCode.length < 1 || trimmedAccessCode.length > 100) {
      return new Response(
        JSON.stringify({ error: "Invalid access code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["rookie", "manager"].includes(role)) {
      return new Response(
        JSON.stringify({ error: "Invalid role selected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate access code
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

    // ── ACCOUNT CLAIMING: Check if a preloaded person record already exists ──
    const fullName = `${trimmedFirstName} ${trimmedLastName}`;
    const phoneDigits = trimmedPhone.replace(/\D/g, '');
    const normalizedName = normalizeForMatch(fullName);

    // Search for existing preloaded profile by email, phone, or name
    const { data: existingProfiles } = await supabaseAdmin
      .from("profiles")
      .select("user_id, full_name, email, phone, direct_manager, team_id, onboarding_status, region, office_name")
      .limit(500);

    let claimProfileId: string | null = null;
    let preservedFields: Record<string, unknown> = {};

    if (existingProfiles && existingProfiles.length > 0) {
      for (const p of existingProfiles) {
        const emailMatch = p.email?.toLowerCase() === trimmedEmail;
        const profilePhoneDigits = (p.phone || '').replace(/\D/g, '');
        const phoneMatch = phoneDigits.length >= 7 && profilePhoneDigits.length >= 7 && phoneDigits === profilePhoneDigits;
        const nameMatch = normalizeForMatch(p.full_name) === normalizedName;

        if (emailMatch || phoneMatch || nameMatch) {
          claimProfileId = p.user_id;
          // Preserve existing fields that were imported
          if (p.direct_manager) preservedFields.direct_manager = p.direct_manager;
          if (p.team_id) preservedFields.team_id = p.team_id;
          if (p.onboarding_status && p.onboarding_status !== 'pending') preservedFields.onboarding_status = p.onboarding_status;
          if (p.region) preservedFields.region = p.region;
          if (p.office_name) preservedFields.office_name = p.office_name;
          break;
        }
      }
    }

    if (claimProfileId) {
      // Person record exists — check if auth account already exists for this user_id
      const { data: existingAuthUser } = await supabaseAdmin.auth.admin.getUserById(claimProfileId);

      if (existingAuthUser?.user) {
        // Auth account exists — update password and sign in
        await supabaseAdmin.auth.admin.updateUserById(claimProfileId, {
          password,
          email: trimmedEmail,
          email_confirm: true,
        });

        // Update profile: mark approved, fill in signup data while preserving imported fields
        const profileUpdate: Record<string, unknown> = {
          approved: true,
          status: "active",
          full_name: fullName,
          phone: trimmedPhone,
        };
        // Only set direct_manager if not already set from import
        if (!preservedFields.direct_manager) {
          profileUpdate.direct_manager = trimmedDirectManager;
        }

        await supabaseAdmin
          .from("profiles")
          .update(profileUpdate)
          .eq("user_id", claimProfileId);

        // Sign in
        const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        if (signInError) {
          return new Response(
            JSON.stringify({ success: true, message: "Account claimed. Please log in.", requiresLogin: true }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, session: signInData.session, user: signInData.user }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ── Standard signup: create new auth account ──
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: trimmedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone: trimmedPhone,
        direct_manager: preservedFields.direct_manager || trimmedDirectManager,
        selected_role: role,
      },
    });

    if (authError) {
      console.error("Auth error:", authError);

      // If email already exists, it might be an unclaimed preloaded account
      if (authError.message?.includes("already been registered") || authError.message?.includes("already exists")) {
        // Try to sign in with these credentials
        const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        if (!signInError && signInData?.session) {
          // Update the profile to be approved
          await supabaseAdmin
            .from("profiles")
            .update({ approved: true, status: "active", phone: trimmedPhone })
            .eq("user_id", signInData.user.id);

          return new Response(
            JSON.stringify({ success: true, session: signInData.session, user: signInData.user }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ error: "An account with this email already exists. Please log in instead." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If we matched a preloaded profile, claim it for the new auth user
    if (claimProfileId && authData?.user) {
      // The handle_new_user trigger may have created a duplicate profile for the new auth user
      // Delete it so we can reassign the preloaded profile to this auth user
      if (claimProfileId !== authData.user.id) {
        await supabaseAdmin
          .from("profiles")
          .delete()
          .eq("user_id", authData.user.id);
      }

      // Update the preloaded profile to point to the new auth user
      const profileUpdate: Record<string, unknown> = {
        user_id: authData.user.id,
        approved: true,
        status: "active",
        full_name: fullName,
        phone: trimmedPhone,
        email: trimmedEmail,
      };
      if (!preservedFields.direct_manager) {
        profileUpdate.direct_manager = trimmedDirectManager;
      }

      await supabaseAdmin
        .from("profiles")
        .update(profileUpdate)
        .eq("user_id", claimProfileId);

      // Also ensure user_roles is set
      await supabaseAdmin
        .from("user_roles")
        .upsert(
          { user_id: authData.user.id, role: role || "rookie" },
          { onConflict: "user_id,role" }
        );
    }

    // Log signup
    const { error: logError } = await supabaseAdmin
      .from("signup_logs")
      .insert({
        user_id: authData.user?.id,
        first_name: trimmedFirstName,
        last_name: trimmedLastName,
        email: trimmedEmail,
        phone: trimmedPhone,
        direct_manager: preservedFields.direct_manager as string || trimmedDirectManager,
        role,
      });

    if (logError) {
      console.error("Signup log error:", logError);
    }

    // Sign in
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (signInError) {
      return new Response(
        JSON.stringify({ success: true, message: "Account created. Please log in.", requiresLogin: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, session: signInData.session, user: signInData.user }),
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
