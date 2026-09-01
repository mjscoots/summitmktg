import { supabase } from '@/integrations/supabase/client';

/**
 * Pass 147 — real web push for the installed app.
 *
 * The worker at /sw.js is registered only once a person turns push on. People
 * who never opt in keep no worker at all.
 */

const SW_PATH = '/sw.js';
const OPTED_IN_KEY = 'summit_push_opted_in';

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    typeof Notification !== 'undefined'
  );
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

export function isIOSSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function pushOptedIn(): boolean {
  try {
    return localStorage.getItem(OPTED_IN_KEY) === '1';
  } catch {
    return false;
  }
}

function setOptedIn(value: boolean) {
  try {
    if (value) localStorage.setItem(OPTED_IN_KEY, '1');
    else localStorage.removeItem(OPTED_IN_KEY);
  } catch {
    /* private mode */
  }
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

function keyToBase64(key: ArrayBuffer | null): string {
  if (!key) return '';
  const bytes = new Uint8Array(key);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

let cachedPublicKey: string | null = null;

async function fetchPublicKey(): Promise<string | null> {
  if (cachedPublicKey) return cachedPublicKey;
  const { data, error } = await supabase.functions.invoke('push-config');
  const key = (data as { publicKey?: string } | null)?.publicKey;
  if (error || !key) return null;
  cachedPublicKey = key;
  return key;
}

export type PushEnableResult = 'enabled' | 'denied' | 'unsupported' | 'error';

export async function enablePush(): Promise<PushEnableResult> {
  if (!pushSupported()) return 'unsupported';

  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';

  try {
    const publicKey = await fetchPublicKey();
    if (!publicKey) return 'error';

    const registration = await navigator.serviceWorker.register(SW_PATH);
    await navigator.serviceWorker.ready;

    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      }));

    const { error } = await (supabase as any).rpc('save_push_subscription', {
      _endpoint: subscription.endpoint,
      _p256dh: keyToBase64(subscription.getKey('p256dh')),
      _auth: keyToBase64(subscription.getKey('auth')),
      _user_agent: navigator.userAgent.slice(0, 200),
    });
    if (error) return 'error';

    setOptedIn(true);
    return 'enabled';
  } catch {
    return 'error';
  }
}

export async function disablePush(): Promise<boolean> {
  setOptedIn(false);
  let endpoint: string | null = null;

  try {
    const registration = await navigator.serviceWorker.getRegistration(SW_PATH);
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      endpoint = subscription.endpoint;
      await subscription.unsubscribe();
    }
    await registration?.unregister();
  } catch {
    /* the row still has to go */
  }

  const { error } = await (supabase as any).rpc('remove_push_subscription', { _endpoint: endpoint });
  return !error;
}
