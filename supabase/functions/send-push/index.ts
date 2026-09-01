import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as webpush from 'jsr:@negrel/webpush@0.5.0';

/**
 * Pass 147 sender. A trigger on user_notifications posts the new row id here.
 * The row is re-read with the service role, the person's preferences are
 * checked, and push_sent_at is stamped so a replayed call sends nothing.
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Notification source keys map onto the preference switches people already own.
const PREF_BY_SOURCE: Record<string, string> = {
  appstall: 'new_leads',
  blitz_promo: 'calendar_events',
  event: 'calendar_events',
  reminder: 'calendar_events',
  announcement: 'announcements',
  chat: 'chat_mentions',
  lead: 'new_leads',
  lead_expiry: 'lead_expiry',
  training: 'training_quiz',
  leaderboard: 'leaderboard',
  bootcamp: 'bootcamp_reminders',
  streak: 'streak_milestones',
};

let appServer: webpush.ApplicationServer | null = null;

async function applicationServer() {
  if (appServer) return appServer;

  const privateJwk = JSON.parse(Deno.env.get('VAPID_PRIVATE_KEY')!);
  const publicJwk = {
    kty: 'EC',
    crv: 'P-256',
    x: privateJwk.x,
    y: privateJwk.y,
    key_ops: ['verify'],
    ext: true,
  };

  const vapidKeys = await webpush.importVapidKeys(
    { publicKey: publicJwk, privateKey: privateJwk } as unknown as webpush.JsonWebKeyPair,
    { extractable: false }
  );

  appServer = await webpush.ApplicationServer.new({
    contactInformation: Deno.env.get('VAPID_SUBJECT') ?? 'mailto:push@summitmktgsales.com',
    vapidKeys,
  });
  return appServer;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    });

  let notificationId = '';
  try {
    const body = await req.json();
    notificationId = typeof body?.notification_id === 'string' ? body.notification_id : '';
  } catch {
    return json({ error: 'notification_id is required' }, 400);
  }
  if (!/^[0-9a-f-]{36}$/i.test(notificationId)) {
    return json({ error: 'notification_id is required' }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const { data: note } = await admin
    .from('user_notifications')
    .select('id, user_id, title, message, link, push_sent_at, digested, deliver_after, source_key')
    .eq('id', notificationId)
    .maybeSingle();

  if (!note) return json({ skipped: 'not found' });
  if (note.push_sent_at) return json({ skipped: 'already sent' });
  if (note.digested) return json({ skipped: 'digested' });
  if (note.deliver_after && new Date(note.deliver_after) > new Date()) {
    return json({ skipped: 'held for quiet hours' });
  }

  const { data: prefs } = await admin
    .from('notification_preferences')
    .select('*')
    .eq('user_id', note.user_id)
    .maybeSingle();

  if (!prefs?.push_enabled) return json({ skipped: 'push off' });

  const sourcePrefix = (note.source_key ?? '').split(':')[0];
  const prefColumn = PREF_BY_SOURCE[sourcePrefix];
  if (prefColumn && (prefs as Record<string, unknown>)[prefColumn] === false) {
    return json({ skipped: 'preference off' });
  }

  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', note.user_id);

  if (!subs || subs.length === 0) return json({ skipped: 'no devices' });

  const payload = JSON.stringify({
    title: note.title,
    body: note.message,
    link: note.link ?? '/app',
    tag: note.id,
  });

  const server = await applicationServer();
  let sent = 0;
  const dead: string[] = [];

  for (const sub of subs) {
    try {
      const subscriber = server.subscribe({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      } as unknown as PushSubscriptionJSON);
      await subscriber.pushTextMessage(payload, {});
      sent += 1;
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const text = String(err);
      if (status === 404 || status === 410 || /\b(404|410)\b/.test(text)) {
        dead.push(sub.endpoint);
      } else {
        console.error('push failed', sub.id, text);
      }
    }
  }

  if (dead.length > 0) {
    await admin.from('push_subscriptions').delete().in('endpoint', dead);
  }

  await admin
    .from('user_notifications')
    .update({ push_sent_at: new Date().toISOString() })
    .eq('id', note.id);

  return json({ sent, removed: dead.length });
});
