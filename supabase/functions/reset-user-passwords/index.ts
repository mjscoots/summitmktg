import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = [
  "https://summitmktg.lovable.app",
  "https://id-preview--1257bd97-61e1-4ead-9de9-5dad7ab016d6.lovable.app",
  "https://summitmktgsales.com",
  "https://www.summitmktgsales.com",
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && (
    allowedOrigins.includes(origin) || 
    origin.endsWith('.lovable.app')
  );
  return {
    "Access-Control-Allow-Origin": isAllowed && origin ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify the caller's token and get their user ID
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify caller is admin using database lookup
    const { data: callerRole, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !callerRole) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all users who haven't changed their password
    const { data: profilesToReset, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("user_id, email, full_name")
      .or("password_changed.eq.false,password_changed.is.null");

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    if (!profilesToReset || profilesToReset.length === 0) {
      return new Response(
        JSON.stringify({ message: "No users need password reset", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const defaultPassword = "summit2026";
    const results = {
      success: [] as string[],
      failed: [] as { email: string; error: string }[],
    };

    for (const profile of profilesToReset) {
      try {
        // Reset password to default
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          profile.user_id,
          { password: defaultPassword }
        );

        if (updateError) {
          results.failed.push({
            email: profile.email,
            error: updateError.message,
          });
        } else {
          results.success.push(profile.email);
        }
      } catch (error) {
        results.failed.push({
          email: profile.email,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: `Reset ${results.success.length} passwords to "${defaultPassword}"`,
        success: results.success,
        failed: results.failed,
        totalProcessed: profilesToReset.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    console.error("Password reset error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
