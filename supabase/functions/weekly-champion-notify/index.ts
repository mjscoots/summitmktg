import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Calculate LAST week's Monday (PST)
    // This function runs Monday 00:05 PST, so "last week" = 7 days ago's Monday
    const now = new Date();
    // Convert to PST
    const pstOffset = -8 * 60; // PST is UTC-8
    const pstNow = new Date(now.getTime() + (pstOffset + now.getTimezoneOffset()) * 60000);
    const pstDay = pstNow.getDay(); // 0=Sun
    const diffToMonday = pstDay === 0 ? -6 : 1 - pstDay;
    const thisMonday = new Date(pstNow);
    thisMonday.setDate(pstNow.getDate() + diffToMonday);
    thisMonday.setHours(0, 0, 0, 0);

    // Last week's Monday
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);
    const lastMondayStr = `${lastMonday.getFullYear()}-${String(lastMonday.getMonth() + 1).padStart(2, "0")}-${String(lastMonday.getDate()).padStart(2, "0")}`;

    console.log(`[weekly-champion] Checking week_start: ${lastMondayStr}`);

    // Get top 3 from last week's leaderboard_points
    const { data: topEntries, error: topErr } = await supabase
      .from("leaderboard_points")
      .select("user_id, total_points, training_points")
      .eq("week_start", lastMondayStr)
      .order("total_points", { ascending: false })
      .limit(3);

    if (topErr) {
      console.error("[weekly-champion] Error fetching top entries:", topErr);
      return new Response(JSON.stringify({ error: topErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!topEntries || topEntries.length === 0) {
      console.log("[weekly-champion] No leaderboard data for last week");
      return new Response(JSON.stringify({ message: "No data for last week" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter to only rookies
    const userIds = topEntries.map((e) => e.user_id);
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", userIds);

    const rookieIds = new Set(
      (roles || []).filter((r) => r.role === "rookie").map((r) => r.user_id)
    );

    const rookieTop = topEntries.filter((e) => rookieIds.has(e.user_id));
    if (rookieTop.length === 0) {
      console.log("[weekly-champion] No rookie entries last week");
      return new Response(JSON.stringify({ message: "No rookie entries" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get names for top rookies
    const rookieUserIds = rookieTop.map((e) => e.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, nickname")
      .in("user_id", rookieUserIds);

    const nameMap = new Map(
      (profiles || []).map((p) => [
        p.user_id,
        p.nickname || p.full_name.split(" ")[0],
      ])
    );

    // Build the notification message
    const medals = ["🥇", "🥈", "🥉"];
    const lines = rookieTop.map((e, i) => {
      const name = nameMap.get(e.user_id) || "Unknown";
      const pts = e.total_points || 0;
      return `${medals[i]} ${name} — ${pts.toLocaleString()} pts`;
    });

    const title = `🏆 Last Week's Top Performers`;
    const message = lines.join("\n");

    // Get all managers and admins to notify
    const { data: managerRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["manager", "admin"]);

    if (!managerRoles || managerRoles.length === 0) {
      console.log("[weekly-champion] No managers to notify");
      return new Response(JSON.stringify({ message: "No managers" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert notifications for each manager
    const notifications = managerRoles.map((m) => ({
      user_id: m.user_id,
      title,
      message,
      link: "/app/leaderboard",
    }));

    const { error: insertErr } = await supabase
      .from("user_notifications")
      .insert(notifications);

    if (insertErr) {
      console.error("[weekly-champion] Insert error:", insertErr);
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(
      `[weekly-champion] Notified ${managerRoles.length} managers about ${rookieTop.length} top performers`
    );

    return new Response(
      JSON.stringify({
        success: true,
        notified: managerRoles.length,
        topPerformers: rookieTop.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[weekly-champion] Unexpected error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
