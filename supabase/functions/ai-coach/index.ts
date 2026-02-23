import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ROOKIE_SYSTEM_PROMPT = `You are "Summit Coach" — a high-energy, street-smart AI mentor for door-to-door pest control rookies. You've been in the field for years and know what works.

PERSONALITY:
- Confident, direct, and motivating — like a great field trainer
- Use short punchy sentences. Max 4-5 sentences per response.
- Celebrate wins. Push through excuses. Always end with a clear action step.
- Use casual language ("crush it", "let's go", "that's money") but stay professional

EXPERTISE:
- Door-to-door sales scripts, objection handling, closing techniques
- Time management on the doors, route planning, energy management
- Mindset coaching: handling rejection, staying motivated, building confidence
- Product knowledge: general pest control (NEVER pitch mosquito or termite treatments)

SCRIPT FORMAT (when asked):
Give "Say this → They say X → You say Y" patterns. Keep it conversational and natural.

ROLEPLAY:
When doing roleplay, play the homeowner. Be realistic — give common objections. Force a close by turn 6. After the roleplay, give 2 specific improvements.

RULES:
- Closes = "today or tomorrow" only. Never schedule far out.
- If asked "what should I do?" give a tight 3-item action checklist.
- Never reveal internal company data, other users' info, or compensation details.
- If someone asks something off-topic, redirect: "Let's focus on what's gonna make you money today."
- When someone seems discouraged, acknowledge it briefly then pivot to action.

SMART COACHING:
- Reference their actual training progress when relevant. If they're behind, push them.
- If their streak is high, celebrate it. If it broke, address it.
- If they haven't completed bootcamp, make it urgent.
- Use their leaderboard position to fuel competition.
- If they ask about something they've already trained on, reference the specific module.`;

const MANAGER_SYSTEM_PROMPT = `You are "Summit Coach" — a sharp, results-driven AI advisor for door-to-door pest control managers and team leaders. You think like a VP of Sales.

PERSONALITY:
- Strategic, direct, and accountability-focused
- Max 4-5 sentences per response. Every word should drive action.
- Push for metrics, not feelings. "What did the numbers say?"
- Speak like an experienced operator, not a consultant

EXPERTISE:
- Team building, recruiting, and retention strategies
- Running effective morning meetings and field rides
- Holding 1-on-1s that actually move the needle
- Reading team data: training completion, activity metrics, leaderboard trends
- Identifying and developing top performers vs managing out underperformers

FRAMEWORKS:
- For team problems: Diagnose → Root cause → 1 action this week
- For recruiting: Pipeline → Interview → Onboard → First 48 hours
- For accountability: Set expectation → Inspect → Consequence or reward

RULES:
- Always push for specifics: "How many doors?" "What's their completion %?"
- If asked "what should I do?" give a tight 3-item checklist with owners and deadlines.
- Never reveal internal company data or other users' info.
- If off-topic, redirect: "Let's talk about what moves your team forward."

SMART COACHING:
- Reference their team's actual metrics when relevant.
- If team members are behind on training, flag it specifically.
- Use leaderboard data to identify who needs attention.
- If bootcamp stragglers exist, push for immediate follow-up.
- Reference inactive team members as accountability gaps.`;

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

async function buildUserContext(supabaseAdmin: any, userId: string, role: string) {
  const contextParts: string[] = [];

  try {
    // Fetch profile, streak, and leaderboard in parallel
    const currentWeek = new Date();
    currentWeek.setDate(currentWeek.getDate() - currentWeek.getDay());
    const weekStart = currentWeek.toISOString().split('T')[0];

    const fetches: Promise<any>[] = [
      // Profile with team
      supabaseAdmin.from("profiles")
        .select("full_name, experience, onboarding_status, team_id, direct_manager, time_this_week_minutes, last_active_at, status")
        .eq("user_id", userId).maybeSingle(),
      // Streak
      supabaseAdmin.from("daily_login_streaks")
        .select("current_streak, longest_streak, total_days_active")
        .eq("user_id", userId).maybeSingle(),
      // Leaderboard this week
      supabaseAdmin.from("leaderboard_points")
        .select("training_points, total_points")
        .eq("user_id", userId).eq("week_start", weekStart).maybeSingle(),
      // Bootcamp progress
      supabaseAdmin.from("bootcamp_progress")
        .select("bootcamp_completed, phase_1_complete, phase_2_complete, phase_3_complete, bootcamp_exempt")
        .eq("user_id", userId).maybeSingle(),
      // Lesson progress count
      supabaseAdmin.from("lesson_progress")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId).not("completed_at", "is", null),
      // Total lessons
      supabaseAdmin.from("training_lessons")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      // Video progress count
      supabaseAdmin.from("video_progress")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId).eq("watched", true),
      // Total required videos
      supabaseAdmin.from("training_videos")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true).eq("is_required", true),
    ];

    // For managers, also fetch team data
    if (role === "manager" || role === "admin") {
      fetches.push(
        // Team members count & training stats
        supabaseAdmin.from("profiles")
          .select("full_name, onboarding_status, time_this_week_minutes, last_active_at, status")
          .neq("status", "nlc")
          .neq("user_id", userId)
          .limit(50)
      );
    }

    const results = await Promise.all(fetches);
    const [profileRes, streakRes, leaderboardRes, bootcampRes, lessonsCompleted, totalLessons, videosWatched, totalVideos] = results;

    const profile = profileRes.data;
    const streak = streakRes.data;
    const lb = leaderboardRes.data;
    const bc = bootcampRes.data;

    if (profile) {
      contextParts.push(`Name: ${profile.full_name}`);
      contextParts.push(`Experience: ${profile.experience || 'rookie'}`);
      contextParts.push(`Onboarding: ${profile.onboarding_status || 'pending'}`);
      contextParts.push(`Time on platform this week: ${profile.time_this_week_minutes || 0} minutes`);
      if (profile.status) contextParts.push(`Account status: ${profile.status}`);
    }

    if (streak) {
      contextParts.push(`Login streak: ${streak.current_streak} days (best: ${streak.longest_streak}, total active: ${streak.total_days_active})`);
    }

    // Training progress
    const completedCount = lessonsCompleted.count || 0;
    const totalCount = totalLessons.count || 0;
    const videoDone = videosWatched.count || 0;
    const videoTotal = totalVideos.count || 0;
    if (totalCount > 0) {
      const pct = Math.round((completedCount / totalCount) * 100);
      contextParts.push(`Training: ${completedCount}/${totalCount} lessons done (${pct}%)`);
    }
    if (videoTotal > 0) {
      contextParts.push(`Videos: ${videoDone}/${videoTotal} watched`);
    }

    if (lb) {
      contextParts.push(`This week: ${lb.total_points || lb.training_points || 0} leaderboard points`);
    }

    if (bc) {
      if (bc.bootcamp_exempt) {
        contextParts.push(`Bootcamp: Exempt`);
      } else if (bc.bootcamp_completed) {
        contextParts.push(`Bootcamp: ✅ Completed`);
      } else {
        const phases = [bc.phase_1_complete, bc.phase_2_complete, bc.phase_3_complete];
        const done = phases.filter(Boolean).length;
        contextParts.push(`Bootcamp: ${done}/3 phases done — NOT COMPLETE`);
      }
    } else {
      contextParts.push(`Bootcamp: NOT STARTED`);
    }

    // Manager team context
    if ((role === "manager" || role === "admin") && results[8]?.data) {
      const teamMembers = results[8].data;
      const total = teamMembers.length;
      const inactive3d = teamMembers.filter((m: any) => {
        if (!m.last_active_at) return true;
        const diff = Date.now() - new Date(m.last_active_at).getTime();
        return diff > 3 * 24 * 60 * 60 * 1000;
      });
      const notOnboarded = teamMembers.filter((m: any) => 
        !m.onboarding_status || m.onboarding_status === 'pending'
      );

      contextParts.push(`\nTEAM SNAPSHOT (${total} members):`);
      if (inactive3d.length > 0) {
        contextParts.push(`⚠️ ${inactive3d.length} inactive 3+ days: ${inactive3d.slice(0, 5).map((m: any) => m.full_name).join(', ')}${inactive3d.length > 5 ? '...' : ''}`);
      }
      if (notOnboarded.length > 0) {
        contextParts.push(`⚠️ ${notOnboarded.length} not fully onboarded: ${notOnboarded.slice(0, 5).map((m: any) => m.full_name).join(', ')}${notOnboarded.length > 5 ? '...' : ''}`);
      }
    }

  } catch (err) {
    console.error("Context fetch error:", err);
  }

  return contextParts.length > 0 ? `\n\nLIVE USER CONTEXT:\n${contextParts.join('\n')}` : '';
}

serve(async (req) => {

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Rate limit: 30/min
    const rateLimitKey = `ai-coach:${userId}`;
    const { data: isAllowed, error: rateLimitError } = await supabaseAdmin
      .rpc("check_rate_limit", { 
        p_key: rateLimitKey, 
        p_max_attempts: 30, 
        p_window_seconds: 60
      });

    if (rateLimitError) {
      console.error("Rate limit check error:", rateLimitError);
    } else if (!isAllowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please wait a moment." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch role
    const { data: roleData } = await supabaseClient
      .from("user_roles").select("role").eq("user_id", userId).order("role").limit(1).maybeSingle();
    const verifiedRole = roleData?.role || "rookie";

    // Build rich context in parallel
    const userContext = await buildUserContext(supabaseAdmin, userId, verifiedRole);

    const { messages } = await req.json() as { messages: Message[] };

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid messages format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    for (const msg of messages) {
      if (!msg.role || !msg.content || typeof msg.content !== 'string') {
        return new Response(
          JSON.stringify({ error: "Invalid message structure" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (msg.content.length > 10000) {
        return new Response(
          JSON.stringify({ error: "Message too long (max 10,000 characters)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const basePrompt = verifiedRole === "rookie" ? ROOKIE_SYSTEM_PROMPT : MANAGER_SYSTEM_PROMPT;
    const systemPrompt = basePrompt + userContext;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Contact your admin." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service temporarily unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("AI coach error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
