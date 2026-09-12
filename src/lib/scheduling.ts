import { supabase } from '@/integrations/supabase/client';

/**
 * Pass 188 - the scheduling link used by the end of the application.
 *
 * The public setting owner_calendly wins when it points at a real booking
 * page. An empty setting, or the bare profile URL, falls back to the constant.
 */
export const SCHEDULING_FALLBACK = 'https://calendly.com/mathewjoyce/sales-opportunity';
const BARE_PROFILE = 'https://calendly.com/mathewjoyce';

const trimSlash = (value: string) => value.replace(/\/+$/, '');

export async function loadSchedulingUrl(): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('get_public_setting', { _key: 'owner_calendly' });
    if (error) return SCHEDULING_FALLBACK;
    const value = ((data as string | null) || '').trim();
    if (!value || trimSlash(value) === BARE_PROFILE) return SCHEDULING_FALLBACK;
    return value;
  } catch {
    return null;
  }
}
