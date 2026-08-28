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
}

const STORAGE_KEY = 'summit_source_attribution';

export const ORGANIC: SourceAttribution = {
  source_type: 'organic',
  source_code: null,
  referrer_user_id: null,
  partner_id: null,
};

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
 * Reads ?ref= from the current URL (falling back to a previously stored value),
 * resolves it, and persists the result.
 */
export async function captureSourceFromUrl(): Promise<SourceAttribution> {
  const params = new URLSearchParams(window.location.search);
  const code = (params.get('ref') || '').trim();
  if (!code) return readStoredSource();
  const resolved = await resolveSourceCode(code);
  storeSource(resolved);
  return resolved;
}
