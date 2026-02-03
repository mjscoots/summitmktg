import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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

  // This function is disabled for security reasons
  // User seeding with embedded PII data has been removed
  // Use bulk-create-users with admin authentication instead
  return new Response(
    JSON.stringify({ 
      error: "This function is disabled for security reasons. Use bulk-create-users with admin authentication instead.",
      disabled: true 
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
  );
});
