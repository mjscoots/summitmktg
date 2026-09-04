import { createClient } from 'npm:@supabase/supabase-js@2';

/**
 * Pass 154 - mints a short lived signed URL for a private Fiber document.
 * The bucket is private and has no storage policies, so the only way to the
 * file is through here, and only for a manager, Pillar or the Owner.
 * Pass 165 pins the allowed origins to the app's own domains.
 */
const BUCKET = 'fiber-docs';
const ALLOWED = new Set(['Summit_Fiber_Pay_Scale_v5.xlsx']);

const allowedOrigins = [
  'https://summitmktg.lovable.app',
  'https://summitmktgsales.com',
  'https://www.summitmktgsales.com',
  'http://localhost:8080',
];

function getCorsHeaders(origin: string | null) {
  const isAllowed = origin && (allowedOrigins.includes(origin) || origin.endsWith('.lovable.app'));
  return {
    'Access-Control-Allow-Origin': isAllowed && origin ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    Vary: 'Origin',
  };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader) return json({ error: 'Sign in first' }, 401);

    const url = Deno.env.get('SUPABASE_URL')!;
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) return json({ error: 'Sign in first' }, 401);

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const [{ data: isManager }, { data: isAdmin }, { data: isOwner }] = await Promise.all([
      admin.rpc('is_effective_manager', { _uid: uid }),
      admin.rpc('has_role', { _user_id: uid, _role: 'admin' }),
      admin.rpc('has_role', { _user_id: uid, _role: 'owner' }),
    ]);
    if (!(isManager || isAdmin || isOwner)) {
      return json({ error: 'That file is for leaders' }, 403);
    }

    let path = 'Summit_Fiber_Pay_Scale_v5.xlsx';
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      if (typeof body?.path === 'string') path = body.path;
    }
    if (!ALLOWED.has(path)) return json({ error: 'Unknown file' }, 404);

    const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(path, 120);
    if (error || !data?.signedUrl) {
      console.error('signed url failed:', error?.message);
      return json({ error: 'Could not open the file' }, 500);
    }
    return json({ url: data.signedUrl }, 200);
  } catch (e) {
    console.error('fiber-doc-url failed:', e instanceof Error ? e.message : String(e));
    return json({ error: 'Could not open the file' }, 500);
  }
});
