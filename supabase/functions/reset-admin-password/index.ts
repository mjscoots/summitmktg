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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // This function is disabled in production for security
  // Password resets should use the standard auth flow
  return new Response(
    JSON.stringify({ 
      error: "This function is disabled for security reasons. Use the standard password reset flow.",
      disabled: true 
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
  );
});
