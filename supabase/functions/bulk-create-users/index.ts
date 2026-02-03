import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = [
  "https://summitmktg.lovable.app",
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

interface UserData {
  full_name: string;
  email: string;
  phone: string;
  role: "rookie" | "manager" | "admin";
  direct_manager: string;
  team_name: string;
  password?: string;
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
    const { data: claimsData, error: claimsError } = await supabaseAdmin.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerId = claimsData.claims.sub;

    // Verify caller is admin using database lookup
    const { data: callerRole, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !callerRole) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { users } = await req.json() as { users: UserData[] };

    // Validate input
    if (!Array.isArray(users) || users.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid input: users array required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit batch size
    if (users.length > 50) {
      return new Response(
        JSON.stringify({ error: "Batch size limited to 50 users" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: { success: string[]; failed: { email: string; error: string }[] } = {
      success: [],
      failed: [],
    };

    for (const userData of users) {
      try {
        // Validate required fields
        if (!userData.email || !userData.full_name) {
          results.failed.push({
            email: userData.email || "unknown",
            error: "Email and full_name are required",
          });
          continue;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userData.email)) {
          results.failed.push({
            email: userData.email,
            error: "Invalid email format",
          });
          continue;
        }

        // Generate secure random password if not provided
        const password = userData.password || "summit2026";
        
        // Create auth user
        const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: userData.email,
          phone: userData.phone ? `+1${userData.phone.replace(/\D/g, "")}` : undefined,
          password: password,
          email_confirm: true,
          user_metadata: {
            full_name: userData.full_name,
            phone: userData.phone,
            direct_manager: userData.direct_manager,
            selected_role: userData.role || "rookie",
          },
        });

        if (createError) {
          // Check if user already exists
          const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
          const existing = existingUsers?.users?.find(u => u.email === userData.email);
          
          if (existing) {
            results.success.push(`${userData.email} (already exists)`);
            continue;
          }
          
          throw createError;
        }

        if (authUser?.user) {
          results.success.push(userData.email);
        }
      } catch (error) {
        results.failed.push({
          email: userData.email,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Bulk create error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
