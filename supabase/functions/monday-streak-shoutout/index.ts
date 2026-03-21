import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get top 10 current streaks
    const { data: streaks, error } = await supabase
      .rpc("get_streak_leaderboard", { _limit: 10 });

    if (error) throw error;

    if (!streaks || streaks.length === 0) {
      return new Response(JSON.stringify({ message: "No active streaks to shout out" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build shoutout message
    const lines = streaks.map((s: any, i: number) => {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
      const name = s.nickname || s.full_name?.split(" ")[0] || "Unknown";
      return `${medal} **${name}** — ${s.current_streak} day streak 🔥`;
    });

    const message = `## 🏔️ Monday Streak Shoutout!\n\nTop 10 streaks heading into this week:\n\n${lines.join("\n")}\n\n*Keep grinding. Consistency wins.*`;

    // Post as announcement
    const { error: annError } = await supabase.from("announcement_posts").insert({
      title: "🔥 Monday Streak Shoutout — Top 10",
      body: message,
      category: "recognition",
      status: "published",
      published_at: new Date().toISOString(),
      is_auto_generated: true,
      source_type: "monday_shoutout",
      is_important: false,
      is_pinned: false,
    });

    if (annError) throw annError;

    // Also post in chat (general channel)
    const { data: channels } = await supabase
      .from("chat_channels")
      .select("slug")
      .eq("slug", "general")
      .single();

    if (channels) {
      // Find a bot/system user or use the first admin
      const { data: adminRole } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "owner")
        .limit(1)
        .single();

      if (adminRole) {
        await supabase.from("chat_messages").insert({
          content: message,
          user_id: adminRole.user_id,
          channel: "general",
          is_ai: true,
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, streaks_count: streaks.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
