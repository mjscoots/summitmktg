import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { users, admin_email } = await req.json() as { users: UserData[]; admin_email: string };

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !caller) {
      throw new Error("Invalid authentication");
    }

    // Check if caller is admin
    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .single();

    if (!callerRole && caller.email !== admin_email) {
      throw new Error("Only admins can bulk create users");
    }

    const results: { success: string[]; failed: { email: string; error: string }[] } = {
      success: [],
      failed: [],
    };

    for (const userData of users) {
      try {
        // Create auth user with default password
        const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: userData.email,
          phone: userData.phone ? `+1${userData.phone.replace(/\D/g, "")}` : undefined,
          password: userData.password || "summit2026",
          email_confirm: true,
          user_metadata: {
            full_name: userData.full_name,
            phone: userData.phone,
            direct_manager: userData.direct_manager,
            selected_role: userData.role,
          },
        });

        if (createError) {
          // User might already exist, try to get them
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
