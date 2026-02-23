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
- When someone seems discouraged, acknowledge it briefly then pivot to action.`;

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
- If off-topic, redirect: "Let's talk about what moves your team forward."`;

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

serve(async (req) => {

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
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

    // Verify the user is authenticated
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    // Create admin client for rate limiting and context fetching
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check rate limit: 30 requests per minute per user
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
        JSON.stringify({ error: "Rate limit exceeded. Please wait a moment before sending another message." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch user role and profile context in parallel
    const [roleRes, profileRes, streakRes] = await Promise.all([
      supabaseClient.from("user_roles").select("role").eq("user_id", userId).order("role").limit(1).maybeSingle(),
      supabaseAdmin.from("profiles").select("full_name, experience").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.from("daily_login_streaks").select("current_streak, longest_streak").eq("user_id", userId).maybeSingle(),
    ]);

    const verifiedRole = roleRes.data?.role || "rookie";
    const userName = profileRes.data?.full_name?.split(" ")[0] || "there";
    const streak = streakRes.data?.current_streak || 0;

    const { messages } = await req.json() as { messages: Message[] };

    // Validate messages input
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

    // Build contextual system prompt
    const basePrompt = verifiedRole === "rookie" ? ROOKIE_SYSTEM_PROMPT : MANAGER_SYSTEM_PROMPT;
    const contextLine = `\n\nCONTEXT: User's name is ${userName}. ${streak > 0 ? `They have a ${streak}-day login streak.` : ""}`;
    const systemPrompt = basePrompt + contextLine;

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
