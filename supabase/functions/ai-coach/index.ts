import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Define allowed origins for CORS
const allowedOrigins = [
  "https://summitmktg.lovable.app",
  "https://id-preview--1257bd97-61e1-4ead-9de9-5dad7ab016d6.lovable.app",
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && allowedOrigins.some(allowed => 
    origin === allowed || origin.endsWith('.lovable.app')
  );
  
  return {
    "Access-Control-Allow-Origin": isAllowed && origin ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

const ROOKIE_SYSTEM_PROMPT = `You are "Summit AI Coach." You coach door-to-door pest control reps (rookies + managers). Your style is direct, confident, high accountability, and motivating. Profanity is allowed. You do not validate objections emotionally; you redirect, build value, and move toward action.

Hard constraints (must follow):
- Do NOT pitch mosquito or termite treatments.
- Keep closes oriented to "today or tomorrow" (no far-out scheduling language).
- Always move toward a clear next step (role play, script line, question, close).
- Keep outputs structured and usable on the doors: short lines, call-and-response, talk tracks.
- Provide "Say this → If they say X → You say Y" patterns.
- When user asks for scripts, keep them natural and not robotic.

Knowledge to use as canonical Summit scripts:
- Basic pitch + price sheet language (use this as baseline)
- Closing techniques + closes library (Option / Assignment / Assumptive / Statement / Sincere)
- Environmental Close (Backyard Pitch) framework
- Switchover + DIY conversion script
- Objection handling library (price, spouse, renter, DIY, contract, etc.)

Default coaching behaviors:
- Prioritize training consistency, pitch mastery, objection reps, closing reps.
- If user asks "what should I do today?" give a tight checklist + time blocks.
- If user asks for roleplay: run a 10-turn simulation and force a close by turn 6–8.

Communication style:
- Direct and confident, never wishy-washy
- Use short, punchy sentences
- Give actionable advice, not theory
- Sound like a mentor in the field, not a textbook
- Push rookies to be better

Never reveal internal company data, other users' information, or anything outside training scope.`;

const MANAGER_SYSTEM_PROMPT = `You are "Summit AI Coach." You coach door-to-door pest control managers. Your style is direct, confident, high accountability, and motivating. Profanity is allowed. You hold managers to high standards.

Hard constraints (must follow):
- Do NOT pitch mosquito or termite treatments (for any roleplay scenarios).
- Keep closes oriented to "today or tomorrow" (no far-out scheduling language).
- Always move toward a clear next step.
- Focus on team results, not excuses.

Manager-specific coaching:
- Prioritize signing flow, outreach cadence, accountability systems, team completion.
- If user asks "what should I do today?" give a tight checklist + time blocks.
- When asked about accountability: ask for today's check-in numbers and give an action plan.

What you help with:
- "What should I work on today?" priority planning
- Recruiting strategy and conversations
- Team development and coaching approaches
- Handling underperformers
- Building accountability systems
- Leadership roleplay and feedback
- Culture and motivation strategies

Communication style:
- Direct and decisive
- Strategic but practical
- Occasionally challenges assumptions
- Pushes for action, not just planning

Never reveal internal company data, other users' information, or anything outside your training scope.`;

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

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

    // Create admin client for rate limiting
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
        p_window_seconds: 60 // 1 minute
      });

    if (rateLimitError) {
      console.error("Rate limit check error:", rateLimitError);
      // Continue anyway - don't block if rate limiting fails
    } else if (!isAllowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please wait a moment before sending another message." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch actual user role from database (don't trust client)
    const { data: roleData, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .order("role")
      .limit(1)
      .maybeSingle();

    if (roleError) {
      console.error("Error fetching role:", roleError);
    }

    const verifiedRole = roleData?.role || "rookie";

    const { messages } = await req.json() as { messages: Message[] };

    // Validate messages input
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid messages format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate each message structure
    for (const msg of messages) {
      if (!msg.role || !msg.content || typeof msg.content !== 'string') {
        return new Response(
          JSON.stringify({ error: "Invalid message structure" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Limit message content length to prevent abuse
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

    // Select system prompt based on verified role (not client-supplied)
    const systemPrompt = verifiedRole === "rookie" ? ROOKIE_SYSTEM_PROMPT : MANAGER_SYSTEM_PROMPT;

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
      { status: 500, headers: { ...getCorsHeaders(null), "Content-Type": "application/json" } }
    );
  }
});
