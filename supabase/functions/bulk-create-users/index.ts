import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface UserData {
  full_name: string;
  email: string;
  phone: string;
  role: "rookie" | "manager" | "admin";
  direct_manager: string;
  team_name: string;
  password?: string;
  onboarding_status?: string;
  rep_status?: "active" | "nlc";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Verify caller via token
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerId = userData.user.id;

    // Verify caller is admin/owner
    const { data: callerRole, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .in("role", ["admin", "owner"])
      .maybeSingle();

    if (roleError || !callerRole) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { users, is_import } = await req.json() as { users: UserData[]; is_import?: boolean };

    if (!Array.isArray(users) || users.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid input: users array required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    for (const u of users) {
      try {
        if (!u.email || !u.full_name) {
          results.failed.push({ email: u.email || "unknown", error: "Email and full_name are required" });
          continue;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(u.email)) {
          results.failed.push({ email: u.email, error: "Invalid email format" });
          continue;
        }

        const password = u.password || crypto.randomUUID().slice(0, 16);

        const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: u.email,
          phone: u.phone ? `+1${u.phone.replace(/\D/g, "")}` : undefined,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: u.full_name,
            phone: u.phone,
            direct_manager: u.direct_manager,
            selected_role: u.role || "rookie",
          },
        });

        if (createError) {
          if (createError.message?.includes("already been registered") || createError.message?.includes("already exists")) {
            const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
            const existingUser = existingUsers?.users?.find(eu => eu.email === u.email);
            if (existingUser) {
              const importedStatus = u.rep_status === "nlc" ? "nlc" : "active";
              const updateData: Record<string, unknown> = {
                status: importedStatus,
                ...(u.onboarding_status ? { onboarding_status: u.onboarding_status } : {}),
              };
              // For imports: don't overwrite approved status if already set to true
              if (!is_import) updateData.approved = true;
              await supabaseAdmin.from("profiles").update(updateData).eq("user_id", existingUser.id);
            }
            results.success.push(`${u.email} (already exists)`);
            continue;
          }
          throw createError;
        }

        if (authUser?.user) {
          // For imports: keep approved=false — person is "Not In-App" until they actually sign up
          // For admin-created users: auto-approve as "In-App"
          const profileUpdates: Record<string, unknown> = is_import
            ? { approved: false, status: "active" }
            : { approved: true, status: "active" };

          if (u.onboarding_status) {
            profileUpdates.onboarding_status = u.onboarding_status;
          }
          await supabaseAdmin
            .from("profiles")
            .update(profileUpdates)
            .eq("user_id", authUser.user.id);

          // Also set role
          await supabaseAdmin
            .from("user_roles")
            .upsert(
              { user_id: authUser.user.id, role: u.role || "rookie" },
              { onConflict: "user_id,role" }
            );

          results.success.push(u.email);
        }
      } catch (error) {
        results.failed.push({
          email: u.email,
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
