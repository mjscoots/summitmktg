import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const adminEmail = "mjscoots9@gmail.com";
    const newPassword = "Learn760!";

    // Get user ID from profiles table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("email", adminEmail)
      .maybeSingle();

    if (profileError) {
      throw new Error(`Profile lookup error: ${profileError.message}`);
    }

    if (!profile?.user_id) {
      throw new Error("No profile found for admin email");
    }

    // Update password using the user_id from profile
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      profile.user_id,
      { password: newPassword }
    );

    if (updateError) {
      throw new Error(`Update password error: ${updateError.message}`);
    }

    // Ensure admin role
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: profile.user_id, role: "admin" }, { onConflict: "user_id" });

    // Mark as verified
    await supabaseAdmin
      .from("profiles")
      .update({ password_changed: true, otp_verified: true })
      .eq("user_id", profile.user_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Password reset! Login with ${adminEmail} / ${newPassword}`,
        userId: profile.user_id 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
