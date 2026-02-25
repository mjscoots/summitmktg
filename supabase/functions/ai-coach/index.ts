import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

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

MEMORY:
- You have access to previous conversations. Reference them naturally when relevant.
- If they asked about objection handling before, build on that. Don't repeat advice.
- Track their progress over time and acknowledge growth.

SMART COACHING:
- Reference their actual training progress when relevant. If they're behind, push them.
- If their streak is high, celebrate it. If it broke, address it.
- If they haven't completed the Summer Checklist, make it urgent.
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
- Never reveal internal company data or other users' info beyond what's in context.
- If off-topic, redirect: "Let's talk about what moves your team forward."

MEMORY:
- You have access to previous conversations. Reference them naturally.
- If they discussed a problem rep before, follow up on it.
- Track patterns across sessions — recurring issues signal deeper problems.

SMART COACHING:
- Reference their team's actual metrics when relevant.
- Compare team performance week-over-week when data allows.
- If team members are behind on training, flag specific names and percentages.
- Use leaderboard data to identify who needs attention vs who to celebrate.
- If Summer Checklist stragglers exist, push for immediate follow-up.
- Reference inactive team members as accountability gaps.
- Identify patterns: who's trending up, who's trending down.`;

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

async function buildUserContext(supabaseAdmin: any, userId: string, role: string) {
  const contextParts: string[] = [];

  try {
    const currentWeek = new Date();
    currentWeek.setDate(currentWeek.getDate() - currentWeek.getDay());
    const weekStart = currentWeek.toISOString().split('T')[0];

    const lastWeek = new Date(currentWeek);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastWeekStart = lastWeek.toISOString().split('T')[0];

    const fetches: Promise<any>[] = [
      // 0: Profile
      supabaseAdmin.from("profiles")
        .select("full_name, experience, onboarding_status, team_id, direct_manager, time_this_week_minutes, last_active_at, status")
        .eq("user_id", userId).maybeSingle(),
      // 1: Streak
      supabaseAdmin.from("daily_login_streaks")
        .select("current_streak, longest_streak, total_days_active")
        .eq("user_id", userId).maybeSingle(),
      // 2: Leaderboard this week
      supabaseAdmin.from("leaderboard_points")
        .select("training_points, total_points")
        .eq("user_id", userId).eq("week_start", weekStart).maybeSingle(),
      // 3: Bootcamp progress
      supabaseAdmin.from("bootcamp_progress")
        .select("bootcamp_completed, phase_1_complete, phase_2_complete, phase_3_complete, bootcamp_exempt")
        .eq("user_id", userId).maybeSingle(),
      // 4: Lesson progress count
      supabaseAdmin.from("lesson_progress")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId).not("completed_at", "is", null),
      // 5: Total lessons
      supabaseAdmin.from("training_lessons")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      // 6: Video progress count
      supabaseAdmin.from("video_progress")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId).eq("watched", true),
      // 7: Total required videos
      supabaseAdmin.from("training_videos")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true).eq("is_required", true),
      // 8: Completed lesson IDs for gap analysis
      supabaseAdmin.from("lesson_progress")
        .select("lesson_id")
        .eq("user_id", userId).not("completed_at", "is", null),
      // 9: All active lessons with module/course info
      supabaseAdmin.from("training_lessons")
        .select("id, title, display_order, module_id, training_modules(title, display_order, course_id, training_courses(title, target_role))")
        .eq("is_active", true)
        .order("display_order"),
      // 10: Previous conversation memory (last 20 messages)
      supabaseAdmin.from("ai_coach_conversations")
        .select("role, content, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
      // 11: Leaderboard last week (for comparison)
      supabaseAdmin.from("leaderboard_points")
        .select("training_points, total_points")
        .eq("user_id", userId).eq("week_start", lastWeekStart).maybeSingle(),
      // 12: Recent daily training time (last 7 days)
      supabaseAdmin.from("daily_training_time")
        .select("date, total_minutes")
        .eq("user_id", userId)
        .gte("date", lastWeek.toISOString().split('T')[0])
        .order("date", { ascending: false })
        .limit(7),
    ];

    // Manager-specific fetches
    if (role === "manager" || role === "admin") {
      // 13: Team members with richer data
      fetches.push(
        supabaseAdmin.from("profiles")
          .select("user_id, full_name, onboarding_status, time_this_week_minutes, last_active_at, status, direct_manager")
          .neq("status", "nlc")
          .neq("user_id", userId)
          .limit(100)
      );
      // 14: All rookie streaks for team analysis
      fetches.push(
        supabaseAdmin.from("daily_login_streaks")
          .select("user_id, current_streak, longest_streak")
          .gt("current_streak", 0)
      );
      // 15: All bootcamp progress
      fetches.push(
        supabaseAdmin.from("bootcamp_progress")
          .select("user_id, bootcamp_completed, bootcamp_exempt")
      );
      // 16: All lesson progress for team training %
      fetches.push(
        supabaseAdmin.from("lesson_progress")
          .select("user_id, lesson_id")
          .not("completed_at", "is", null)
      );
      // 17: Team leaderboard this week
      fetches.push(
        supabaseAdmin.from("leaderboard_points")
          .select("user_id, total_points, training_points")
          .eq("week_start", weekStart)
          .order("total_points", { ascending: false })
          .limit(20)
      );
      // 18: Streak breaks (last 7 days)
      fetches.push(
        supabaseAdmin.from("streak_breaks")
          .select("user_id, streak_count, broke_at")
          .gte("broke_at", lastWeek.toISOString())
          .order("broke_at", { ascending: false })
          .limit(15)
      );
    }

    const results = await Promise.all(fetches);
    const [profileRes, streakRes, leaderboardRes, bootcampRes, lessonsCompleted, totalLessons, videosWatched, totalVideos, completedLessonIds, allLessonsRes, prevConvos, lastWeekLb, dailyTime] = results;

    const profile = profileRes.data;
    const streak = streakRes.data;
    const lb = leaderboardRes.data;
    const bc = bootcampRes.data;

    if (profile) {
      contextParts.push(`Name: ${profile.full_name}`);
      contextParts.push(`Experience: ${profile.experience || 'rookie'}`);
      contextParts.push(`Onboarding: ${profile.onboarding_status || 'pending'}`);
      contextParts.push(`Time on platform this week: ${profile.time_this_week_minutes || 0} minutes`);
      if (profile.direct_manager) contextParts.push(`Manager: ${profile.direct_manager}`);
    }

    if (streak) {
      contextParts.push(`Login streak: ${streak.current_streak} days (best: ${streak.longest_streak}, total active: ${streak.total_days_active})`);
    }

    // Training progress
    const completedCount = lessonsCompleted.count || 0;
    const totalCount = totalLessons.count || 0;
    const videoDone = videosWatched.count || 0;
    const videoTotal = totalVideos.count || 0;
    const totalItems = totalCount + videoTotal;
    const totalDone = completedCount + videoDone;
    if (totalItems > 0) {
      const pct = Math.round((totalDone / totalItems) * 100);
      contextParts.push(`Overall Training: ${totalDone}/${totalItems} items complete (${pct}%)`);
      contextParts.push(`  Lessons: ${completedCount}/${totalCount} | Videos: ${videoDone}/${videoTotal}`);
    }

    // Week-over-week comparison
    if (lb && lastWeekLb?.data) {
      const thisWeekPts = lb.total_points || lb.training_points || 0;
      const lastWeekPts = lastWeekLb.data.total_points || lastWeekLb.data.training_points || 0;
      const diff = thisWeekPts - lastWeekPts;
      contextParts.push(`Points this week: ${thisWeekPts} (${diff >= 0 ? '+' : ''}${diff} vs last week)`);
    } else if (lb) {
      contextParts.push(`Points this week: ${lb.total_points || lb.training_points || 0}`);
    }

    // Daily training pattern
    if (dailyTime?.data?.length > 0) {
      const days = dailyTime.data.map((d: any) => `${d.date}: ${d.total_minutes}m`).join(', ');
      contextParts.push(`Recent daily training: ${days}`);
    }

    // Incomplete lessons for recommendations
    const doneIds = new Set((completedLessonIds?.data || []).map((r: any) => r.lesson_id));
    const allLessons = allLessonsRes?.data || [];
    const incomplete = allLessons
      .filter((l: any) => !doneIds.has(l.id))
      .filter((l: any) => {
        const targetRole = l.training_modules?.training_courses?.target_role;
        if (role === 'rookie' && targetRole === 'manager') return false;
        return true;
      });

    if (incomplete.length > 0) {
      const byModule: Record<string, { course: string; module: string; lessons: string[] }> = {};
      for (const l of incomplete) {
        const modTitle = l.training_modules?.title || 'Unknown Module';
        const courseTitle = l.training_modules?.training_courses?.title || 'Unknown Course';
        const key = `${courseTitle}::${modTitle}`;
        if (!byModule[key]) byModule[key] = { course: courseTitle, module: modTitle, lessons: [] };
        byModule[key].lessons.push(l.title);
      }

      contextParts.push(`\nINCOMPLETE TRAINING (${incomplete.length} lessons remaining):`);
      const entries = Object.values(byModule).slice(0, 8);
      for (const entry of entries) {
        const lessonList = entry.lessons.slice(0, 5).join(', ');
        const extra = entry.lessons.length > 5 ? ` (+${entry.lessons.length - 5} more)` : '';
        contextParts.push(`• ${entry.course} → ${entry.module}: ${lessonList}${extra}`);
      }
      if (Object.keys(byModule).length > 8) {
        contextParts.push(`  ...and ${Object.keys(byModule).length - 8} more modules`);
      }
      contextParts.push(`When suggesting training, recommend SPECIFIC lesson titles from the list above.`);
    }

    if (bc) {
      if (bc.bootcamp_exempt) contextParts.push(`Summer Checklist: Exempt`);
      else if (bc.bootcamp_completed) contextParts.push(`Summer Checklist: ✅ Completed`);
      else {
        const phases = [bc.phase_1_complete, bc.phase_2_complete, bc.phase_3_complete];
        contextParts.push(`Summer Checklist: ${phases.filter(Boolean).length}/3 phases — NOT COMPLETE`);
      }
    } else {
      contextParts.push(`Summer Checklist: NOT STARTED`);
    }

    // Previous conversation summary for memory
    if (prevConvos?.data?.length > 0) {
      const prevMessages = prevConvos.data.reverse(); // oldest first
      const summary = prevMessages.map((m: any) => 
        `[${m.role}]: ${m.content.slice(0, 150)}${m.content.length > 150 ? '...' : ''}`
      ).join('\n');
      contextParts.push(`\nPREVIOUS CONVERSATION HISTORY (last ${prevMessages.length} messages):\n${summary}`);
      contextParts.push(`Use this history to provide continuity. Reference past topics naturally. Don't repeat the same advice.`);
    }

    // === MANAGER-SPECIFIC ENRICHED CONTEXT ===
    if ((role === "manager" || role === "admin") && results[13]?.data) {
      const teamMembers = results[13].data;
      const streakMap = new Map((results[14]?.data || []).map((s: any) => [s.user_id, s]));
      const bootcampMap = new Map((results[15]?.data || []).map((b: any) => [b.user_id, b]));
      const lessonProgressByUser = new Map<string, number>();
      for (const lp of (results[16]?.data || [])) {
        lessonProgressByUser.set(lp.user_id, (lessonProgressByUser.get(lp.user_id) || 0) + 1);
      }
      const lbEntries = results[17]?.data || [];
      const lbMap = new Map(lbEntries.map((e: any) => [e.user_id, e]));
      const streakBreaks = results[18]?.data || [];

      const total = teamMembers.length;
      const now = Date.now();
      const threeDays = 3 * 24 * 60 * 60 * 1000;

      // Categorize members
      const inactive3d: string[] = [];
      const notOnboarded: string[] = [];
      const noBootcamp: string[] = [];
      const topPerformers: { name: string; pts: number }[] = [];
      const lowTraining: { name: string; pct: number }[] = [];
      const highStreaks: { name: string; streak: number }[] = [];

      for (const m of teamMembers) {
        if (!m.last_active_at || now - new Date(m.last_active_at).getTime() > threeDays) {
          inactive3d.push(m.full_name);
        }
        if (!['onboarded', 'summer_ready'].includes(m.onboarding_status || '')) {
          notOnboarded.push(m.full_name);
        }
      const bp = bootcampMap.get(m.user_id) as any;
        if (bp && !bp.bootcamp_completed && !bp.bootcamp_exempt) {
          noBootcamp.push(m.full_name);
        }
        const lbEntry = lbMap.get(m.user_id) as any;
        if (lbEntry?.total_points > 50) {
          topPerformers.push({ name: m.full_name, pts: lbEntry.total_points });
        }
        const lessonsDone = lessonProgressByUser.get(m.user_id) || 0;
        if (totalCount > 0) {
          const pct = Math.round((lessonsDone / totalCount) * 100);
          if (pct < 30) lowTraining.push({ name: m.full_name, pct });
        }
        const s = streakMap.get(m.user_id) as any;
        if (s?.current_streak >= 5) {
          highStreaks.push({ name: m.full_name, streak: s.current_streak });
        }
      }

      contextParts.push(`\n═══ TEAM ANALYTICS (${total} members) ═══`);

      if (topPerformers.length > 0) {
        topPerformers.sort((a, b) => b.pts - a.pts);
        contextParts.push(`🏆 TOP PERFORMERS THIS WEEK:`);
        topPerformers.slice(0, 5).forEach((p, i) => contextParts.push(`  ${i + 1}. ${p.name} — ${p.pts} pts`));
      }

      if (highStreaks.length > 0) {
        highStreaks.sort((a, b) => b.streak - a.streak);
        contextParts.push(`🔥 ACTIVE STREAKS: ${highStreaks.slice(0, 5).map(s => `${s.name} (${s.streak}d)`).join(', ')}`);
      }

      if (inactive3d.length > 0) {
        contextParts.push(`👻 INACTIVE 3+ DAYS (${inactive3d.length}): ${inactive3d.slice(0, 8).join(', ')}${inactive3d.length > 8 ? ` +${inactive3d.length - 8} more` : ''}`);
      }

      if (notOnboarded.length > 0) {
        contextParts.push(`📋 NOT ONBOARDED (${notOnboarded.length}): ${notOnboarded.slice(0, 8).join(', ')}${notOnboarded.length > 8 ? ` +${notOnboarded.length - 8} more` : ''}`);
      }

      if (noBootcamp.length > 0) {
        contextParts.push(`🏔️ BOOTCAMP INCOMPLETE (${noBootcamp.length}): ${noBootcamp.slice(0, 8).join(', ')}${noBootcamp.length > 8 ? ` +${noBootcamp.length - 8} more` : ''}`);
      }

      if (lowTraining.length > 0) {
        lowTraining.sort((a, b) => a.pct - b.pct);
        contextParts.push(`📉 LOW TRAINING (<30%): ${lowTraining.slice(0, 8).map(l => `${l.name} (${l.pct}%)`).join(', ')}`);
      }

      if (streakBreaks.length > 0) {
        const breakNames = new Map<string, number>();
        for (const sb of streakBreaks) {
          const member = teamMembers.find((m: any) => m.user_id === sb.user_id);
          if (member) breakNames.set(member.full_name, sb.streak_count);
        }
        if (breakNames.size > 0) {
          contextParts.push(`💔 RECENT STREAK BREAKS: ${[...breakNames.entries()].slice(0, 5).map(([n, c]) => `${n} (lost ${c}d)`).join(', ')}`);
        }
      }

      contextParts.push(`\nAs a manager coach: identify bottlenecks, suggest specific people to follow up with, and provide actionable team strategies.`);
    }

  } catch (err) {
    console.error("Context fetch error:", err);
  }

  return contextParts.length > 0 ? `\n\nLIVE USER CONTEXT:\n${contextParts.join('\n')}` : '';
}

serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

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

    const { messages, save_messages } = await req.json() as { messages: Message[]; save_messages?: { user: string; assistant?: string } };

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

    // Save user message to conversation history (non-blocking)
    if (save_messages?.user) {
      supabaseAdmin.from("ai_coach_conversations").insert({
        user_id: userId,
        role: "user",
        content: save_messages.user.slice(0, 2000),
      }).then(() => {});
    }

    // Build rich context in parallel
    const userContext = await buildUserContext(supabaseAdmin, userId, verifiedRole);

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
