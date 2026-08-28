import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FiberContact {
  name: string;
  phone: string;
  role: string;
}

export interface FiberBlitz {
  place: string;
  timing: string;
  approximate?: boolean;
  /** Stable key for opt-ins; derived from the place when missing. */
  key?: string;
  start_date?: string;
  end_date?: string;
  capacity?: number;
}

/** Stable opt-in key for a blitz entry. */
export function blitzKey(b: FiberBlitz): string {
  return (
    b.key ||
    b.place
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') ||
    'blitz'
  );
}


export interface FiberFaq {
  id: string;
  question: string;
  answer: string;
}

function parse<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function readSettings(keys: string[]): Promise<Record<string, string>> {
  const { data } = await (supabase as any).from('app_settings').select('key, value').in('key', keys);
  const out: Record<string, string> = {};
  for (const row of (data as { key: string; value: string | null }[]) || []) {
    if (row.value) out[row.key] = row.value;
  }
  return out;
}

/** Contacts, the Gainz join link and the Fiber questions, all owner-editable. */
export function useFiberHub() {
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<FiberContact[]>([]);
  const [joinLink, setJoinLink] = useState<string>('');
  const [faq, setFaq] = useState<FiberFaq[]>([]);

  const load = useCallback(async () => {
    const [settings, faqRes] = await Promise.all([
      readSettings(['fiber_contacts', 'fiber_join_link']),
      (supabase as any)
        .from('assistant_faq')
        .select('id, question, answer, display_order')
        .eq('vertical', 'Fiber')
        .eq('published', true)
        .order('display_order'),
    ]);
    setContacts(parse<FiberContact[]>(settings.fiber_contacts, []));
    setJoinLink(settings.fiber_join_link || '');
    setFaq(((faqRes.data as FiberFaq[]) || []));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { loading, contacts, joinLink, faq, reload: load };
}

/** The upcoming blitz list, exactly as the owner keeps it in settings. */
export function useFiberBlitzes() {
  const [loading, setLoading] = useState(true);
  const [blitzes, setBlitzes] = useState<FiberBlitz[]>([]);

  useEffect(() => {
    void (async () => {
      const settings = await readSettings(['fiber_blitzes']);
      setBlitzes(parse<FiberBlitz[]>(settings.fiber_blitzes, []));
      setLoading(false);
    })();
  }, []);

  return { loading, blitzes };
}
