// Optional Meta-only browser measurement. No ID means no script or requests.
type Pixel = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push: Pixel;
  loaded: boolean;
  version: string;
};

declare global {
  interface Window {
    fbq?: Pixel;
    _fbq?: Pixel;
  }
}

const PUBLIC_ROOTS = ['recruiting', 'ticket', 'parents', 'industries', 'join', 'invite', 'p', 'apply'];
export function isPublicRecruitingPath(path: string): boolean {
  return path === '/' || PUBLIC_ROOTS.includes(path.split('/')[1]);
}

export function validMetaPixelId(id: unknown): id is string {
  return typeof id === 'string' && /^\d{5,30}$/.test(id);
}

// No banner is installed in this dormant pass. Unknown/consent regions stay blocked.
const CONSENT_REGIONS = new Set(['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IS', 'IE', 'IT', 'LV', 'LI', 'LT', 'LU', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB', 'CH']);
export function regionPermitsMeta(region: string): boolean {
  return /^[A-Z]{2}$/.test(region) && !['XX', 'T1'].includes(region) && !CONSENT_REGIONS.has(region);
}

let permission: Promise<boolean> | undefined;
let initialized = false;
let lastPageKey: string | undefined;

function optedOut(): boolean {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.globalPrivacyControl === true || navigator.doNotTrack === '1';
}

function allowed(): Promise<boolean> {
  if (optedOut()) return Promise.resolve(false);
  if (!permission) {
    permission = (async () => {
      try {
        const response = await fetch('/cdn-cgi/trace', { signal: AbortSignal.timeout(2000), credentials: 'omit' });
        if (!response.ok) return false;
        const values = Object.fromEntries((await response.text()).split('\n').map(line => line.split('=')));
        return values.h === window.location.hostname && regionPermitsMeta(values.loc || '');
      } catch { return false; }
    })();
  }
  return permission;
}

function init(id: string): Pixel {
  if (!window.fbq) {
    const pixel: Pixel = Object.assign(function (...args: unknown[]) {
      if (pixel.callMethod) pixel.callMethod.apply(pixel, args);
      else pixel.queue.push(args);
    }, { queue: [] as unknown[][], loaded: true, version: '2.0' }) as Pixel;
    pixel.push = pixel;
    window.fbq = pixel;
    window._fbq = window._fbq || pixel;
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);
  }
  if (!initialized) {
    window.fbq('init', id, {}, { agent: 'lovable' });
    // Never scrape application fields or send contact matching data.
    window.fbq('set', 'autoConfig', false, id);
    initialized = true;
  }
  return window.fbq;
}

export function pausePublicMetaPixel(): void {
  window.fbq?.('consent', 'revoke');
  lastPageKey = undefined;
}

export async function trackPublicMeta(event: 'PageView' | 'Lead' | 'SchedulingClick', pageKey?: string): Promise<void> {
  const id: unknown = import.meta.env.VITE_META_PIXEL_ID;
  if (!validMetaPixelId(id) || !isPublicRecruitingPath(window.location.pathname)) return;
  // Unknown/consent-region visits are blocked, not queued for a later replay.
  if (!(await allowed()) || optedOut() || !isPublicRecruitingPath(window.location.pathname)) {
    window.fbq?.('consent', 'revoke');
    return;
  }
  if (event === 'PageView') {
    if (pageKey === lastPageKey) return;
    lastPageKey = pageKey;
  }
  const pixel = init(id);
  pixel('consent', 'grant');
  pixel(event === 'SchedulingClick' ? 'trackCustom' : 'track', event, {}, { eventID: crypto.randomUUID() });
}