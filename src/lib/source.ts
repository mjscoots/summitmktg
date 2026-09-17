import { supabase } from '@/integrations/supabase/client';

export type SourceType =
  | 'golden_ticket'
  | 'rep_referral'
  | 'partner'
  | 'organic'
  | 'other'
  | 'application';

export interface SourceAttribution {
  source_type: SourceType;
  source_code: string | null;
  referrer_user_id: string | null;
  partner_id: string | null;
  /** First name of the rep who sent them, when the code resolves to one. */
  referrer_name?: string | null;
}

const STORAGE_KEY = 'summit_source_attribution';
/** Pass 224 - the raw code, kept the instant it is seen, before any lookup. */
const CODE_KEY = 'summit_source_code';

export const ORGANIC: SourceAttribution = {
  source_type: 'organic',
  source_code: null,
  referrer_user_id: null,
  partner_id: null,
  referrer_name: null,
};

/**
 * Pass 224 - a code in the URL used to be read only by the pages that lead
 * straight into the form, so anyone who landed on the cover with a code and
 * tapped Get in lost it. This runs at boot on every route and remembers the
 * raw code for the rest of the visit, whatever the visitor does next.
 */
export function rememberCodeFromUrl(): string | null {
  try {
    const code = (new URLSearchParams(window.location.search).get('ref') || '').trim().slice(0, 60);
    if (code) sessionStorage.setItem(CODE_KEY, code);
    return code || sessionStorage.getItem(CODE_KEY);
  } catch {
    return null;
  }
}

export function readStoredCode(): string | null {
  try {
    return sessionStorage.getItem(CODE_KEY);
  } catch {
    return null;
  }
}

/** Resolve a referral code to its source. Unknown codes degrade to organic. */
export async function resolveSourceCode(code: string | null): Promise<SourceAttribution> {
  if (!code) return ORGANIC;
  try {
    const { data, error } = await (supabase as any).rpc('resolve_source_code', { p_code: code.slice(0, 60) });
    if (error || !data) return ORGANIC;
    return {
      source_type: (data.source_type || 'organic') as SourceType,
      source_code: data.source_code ?? null,
      referrer_user_id: data.referrer_user_id ?? null,
      partner_id: data.partner_id ?? null,
      referrer_name: data.referrer_name ?? null,
    };
  } catch {
    return ORGANIC;
  }
}

/** Store an attribution so it survives navigation from /join or /ticket into the form. */
export function storeSource(source: SourceAttribution) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(source));
  } catch {
    /* ignore */
  }
}

export function readStoredSource(): SourceAttribution {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return ORGANIC;
    const parsed = JSON.parse(raw);
    return { ...ORGANIC, ...parsed };
  } catch {
    return ORGANIC;
  }
}

/**
 * Reads ?ref= from the current URL, falling back to the code remembered at
 * boot or a previously resolved attribution, then resolves and persists it.
 */
export async function captureSourceFromUrl(): Promise<SourceAttribution> {
  const code = rememberCodeFromUrl();
  if (!code) return readStoredSource();
  const stored = readStoredSource();
  if (stored.source_code && stored.source_code.toLowerCase() === code.toLowerCase()) return stored;
  const resolved = await resolveSourceCode(code);
  storeSource(resolved);
  return resolved;
}
