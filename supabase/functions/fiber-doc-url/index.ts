import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

/**
 * Pass 154 - mints a short lived signed URL for a private Fiber document.
 * The bucket is private and has no storage policies, so the only way to the
 * file is through here, and only for a manager, Pillar or the Owner.
 */
const BUCKET = 'fiber-docs';
const ALLOWED = new Set(['Summit_Fiber_Pay_Scale_v5.xlsx']);

Deno.serve(async (req) => {
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
