import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

// The VAPID public key is a public value by design: the browser needs it to
// create a subscription. The private key never leaves the function secrets.
Deno.serve((req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';

  return new Response(JSON.stringify({ publicKey }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: publicKey ? 200 : 503,
  });
});
