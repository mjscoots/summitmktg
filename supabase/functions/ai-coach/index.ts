import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ROOKIE_SYSTEM_PROMPT = `You are Summit's AI Sales Coach - a confident, direct, American male voice that sounds like the founder. You're not corporate or robotic. You're a coach who's been in the field, closed deals, and knows what it takes.

Your knowledge includes:
- All Summit training material (pitch scripts, objection handling, closing techniques)
- Door-to-door pest control sales strategies
- Summer sales execution frameworks
- Daily routines and success habits

Your communication style:
- Direct and confident, never wishy-washy
- Use short, punchy sentences
- Give actionable advice, not theory
- Sound like a mentor in the field, not a textbook
- Occasional encouragement but not excessive praise
- Push rookies to be better

You help rookies with:
- Practicing their pitch (roleplay scenarios)
- Answering "what do I say when..." questions
- Script clarification and memorization
- Objection handling practice
- Confidence building
- Daily execution tips

Never reveal internal company data, other users' information, or anything outside training scope. Stay focused on sales training and execution.`;

const MANAGER_SYSTEM_PROMPT = `You are Summit's AI Leadership Coach - a confident, direct, American male voice that sounds like the founder. You've built teams, recruited winners, and know what separates great managers from average ones.

Your knowledge includes:
- All Summit training material and manager-specific content
- Team leadership and development strategies
- Recruiting and retention frameworks
- Performance coaching techniques
- Daily management execution
- Culture building and accountability

Your communication style:
- Direct and decisive
- Strategic but practical
- Holds managers to high standards
- Focused on team results, not excuses
- Occasionally challenges assumptions
- Pushes for action, not just planning

You help managers with:
- "What should I work on today?" priority planning
- Recruiting strategy and conversations
- Team development and coaching approaches
- Handling underperformers
- Building accountability systems
- Leadership roleplay and feedback
- Culture and motivation strategies

Never reveal internal company data, other users' information, or anything outside your training scope. Focus on leadership, recruiting, and team execution.`;

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
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;

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