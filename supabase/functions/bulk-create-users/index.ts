import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface UserData {
  full_name: string;
  email: string;
  phone?: string;
  role?: "rookie" | "manager" | "admin";
  direct_manager?: string;
  team_name?: string;
  password?: string;
  onboarding_status?: string;
  rep_status?: string;
  region?: string;
  office_name?: string;
  experience?: string;
  organization?: string;
  matched_user_id?: string;
  update_only?: boolean;
}

const PIPELINE_RANK: Record<string, number> = {
  pending: 0,
  contract_signed: 1,
  info_added: 2,
  onboarded: 3,
  summer_ready: 4,
};

function normalizePhoneE164(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length > 10) return `+${digits}`;
  return undefined;
}

function normalizeImportRepStatus(raw: string | undefined | null): "active" | "nlc" | undefined {
  if (!raw) return undefined;
  const value = raw.toLowerCase().trim().replace(/[_()]/g, " ").replace(/\s+/g, " ");
  if (!value) return undefined;
  if (/^active(s)?$/.test(value)) return "active";
  if (/^(inactive|disabled|deactivated|dropped|quit|terminated|released|cut)$/.test(value)) return "nlc";
  if (/\bno\s+longer\s+coming\b/.test(value)) return "nlc";
  if (/\bn\s*[- ]?\s*nlc(s)?\b/.test(value)) return "nlc";
  if (/\bnlc(s)?\b/.test(value)) return "nlc";
  return undefined;
}

function normalizeImportPipeline(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const v = raw.toLowerCase().replace(/[_\-]/g, " ").replace(/\s+/g, " ").trim();
  if (/\bsummer\s*ready\b/.test(v)) return "summer_ready";
  if (/\bonboard(ed|ing)?\b/.test(v)) return "onboarded";
  if (/\binfo\s*added\b/.test(v)) return "info_added";
  if (/\bcontract\s*signed\b/.test(v)) return "contract_signed";
  if (/\bprospect\s*added\b/.test(v) || /\bpending\b/.test(v)) return "pending";
  // Already normalized values
  if (PIPELINE_RANK[raw] !== undefined) return raw;
  return undefined;
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

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerId = userData.user.id;

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

    if (users.length > 100) {
      return new Response(
        JSON.stringify({ error: "Batch size limited to 100 users" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: {
      success: string[];
      updated: string[];
      failed: { email: string; error: string }[];
    } = {
      success: [],
      updated: [],
      failed: [],
    };

    for (const u of users) {
      try {
        if (!u.full_name) {
          results.failed.push({ email: u.email || "unknown", error: "full_name is required" });
          continue;
        }

        const normalizedRepStatus = normalizeImportRepStatus(u.rep_status);
        const normalizedPipeline = normalizeImportPipeline(u.onboarding_status);

        // ── UPDATE-ONLY MODE: just update an existing profile by user_id ──
        if (u.update_only && u.matched_user_id) {
          // Fetch current profile to compare pipeline
          const { data: currentProfile } = await supabaseAdmin
            .from("profiles")
            .select("onboarding_status, status, approved")
            .eq("user_id", u.matched_user_id)
            .maybeSingle();

          const updates: Record<string, unknown> = {};

          // Pipeline: only advance, never downgrade
          if (normalizedPipeline) {
            const currentRank = PIPELINE_RANK[currentProfile?.onboarding_status || "pending"] ?? 0;
            const importedRank = PIPELINE_RANK[normalizedPipeline] ?? 0;
            if (importedRank > currentRank) {
              updates.onboarding_status = normalizedPipeline;
            }
          }

          // Rep status: apply ONLY for non-approved users (protect active app users)
          if (normalizedRepStatus && !currentProfile?.approved) {
            updates.status = normalizedRepStatus;
          }

          if (u.phone) updates.phone = u.phone;
          if (u.region) updates.region = u.region;
          if (u.office_name) updates.office_name = u.office_name;
          if (u.experience) updates.experience = u.experience;
          if (u.direct_manager) updates.direct_manager = u.direct_manager;
          if (u.organization) updates.organization = u.organization;

          if (Object.keys(updates).length > 0) {
            const { error: updateErr } = await supabaseAdmin
              .from("profiles")
              .update(updates)
              .eq("user_id", u.matched_user_id);

            if (updateErr) {
              console.error(`Update failed for ${u.full_name}:`, updateErr.message);
              results.failed.push({ email: u.email || u.full_name, error: updateErr.message });
            } else {
              const changeDesc = Object.keys(updates).join(", ");
              results.updated.push(`${u.full_name} (${changeDesc})`);
            }
          } else {
            results.updated.push(`${u.full_name} (no changes)`);
          }
          continue;
        }

        // ── CREATE MODE: create a new auth user + profile ──
        if (!u.email) {
          results.failed.push({ email: u.full_name, error: "Email is required for new users" });
          continue;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(u.email)) {
          results.failed.push({ email: u.email, error: "Invalid email format" });
          continue;
        }

        const password = u.password || crypto.randomUUID().slice(0, 16);
        const normalizedPhone = normalizePhoneE164(u.phone);

        const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: u.email,
          phone: normalizedPhone,
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
              // Fetch current profile for pipeline comparison
              const { data: currentProfile } = await supabaseAdmin
                .from("profiles")
                .select("onboarding_status, status, approved")
                .eq("user_id", existingUser.id)
                .maybeSingle();

              const updates: Record<string, unknown> = {};

              // Rep status: apply ONLY for non-approved users (protect active app users)
              if (normalizedRepStatus && !currentProfile?.approved) updates.status = normalizedRepStatus;

              // Pipeline: only advance
              if (normalizedPipeline) {
                const currentRank = PIPELINE_RANK[currentProfile?.onboarding_status || "pending"] ?? 0;
                const importedRank = PIPELINE_RANK[normalizedPipeline] ?? 0;
                if (importedRank > currentRank) {
                  updates.onboarding_status = normalizedPipeline;
                }
              }

              if (u.phone) updates.phone = u.phone;
              if (u.region) updates.region = u.region;
              if (u.office_name) updates.office_name = u.office_name;
              if (u.experience) updates.experience = u.experience;
              if (u.direct_manager) updates.direct_manager = u.direct_manager;
              if (u.organization) updates.organization = u.organization;

              if (Object.keys(updates).length > 0) {
                await supabaseAdmin.from("profiles").update(updates).eq("user_id", existingUser.id);
              }
            }
            results.updated.push(`${u.full_name} (existing)`);
            continue;
          }
          throw createError;
        }

        if (authUser?.user) {
          const importedStatus = normalizedRepStatus === "nlc" ? "nlc" : "active";
          const profileUpdates: Record<string, unknown> = is_import
            ? { approved: false, status: importedStatus }
            : { approved: true, status: importedStatus };

          if (normalizedPipeline) profileUpdates.onboarding_status = normalizedPipeline;
          if (u.phone) profileUpdates.phone = u.phone;
          if (u.region) profileUpdates.region = u.region;
          if (u.office_name) profileUpdates.office_name = u.office_name;
          if (u.experience) profileUpdates.experience = u.experience;
          if (u.direct_manager) profileUpdates.direct_manager = u.direct_manager;
          if (u.organization) profileUpdates.organization = u.organization;

          await supabaseAdmin
            .from("profiles")
            .update(profileUpdates)
            .eq("user_id", authUser.user.id);

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
          email: u.email || u.full_name,
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
