import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ROOKIE_SYSTEM_PROMPT = `You are "Team Bot" — a brief, punchy AI coach for door-to-door pest control rookies. Keep every response under 3-4 sentences max. Be direct, motivating, and actionable. No fluff.

Rules:
- NEVER pitch mosquito or termite treatments.
- Closes = "today or tomorrow" only.
- Give "Say this → They say X → You say Y" patterns when asked for scripts.
- If asked "what should I do?" give a tight 3-item checklist.
- For roleplay: short back-and-forth, force a close by turn 6.
- Answer questions directly — don't deflect.
- Sound like a field mentor, not a textbook.
- Never reveal internal company data or other users' info.`;

const MANAGER_SYSTEM_PROMPT = `You are "Team Bot" — a brief, punchy AI coach for door-to-door pest control managers. Keep every response under 3-4 sentences max. Be direct, strategic, and action-oriented. No fluff.

Rules:
- Focus on team results, recruiting, accountability, and leadership.
- If asked "what should I do?" give a tight 3-item checklist.
- Answer questions directly — don't deflect.
- Push for action, not just planning.
- Never reveal internal company data or other users' info.`;

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
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
