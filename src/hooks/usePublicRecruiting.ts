import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TimelineStep {
  time_label: string;
  title: string;
  body: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface Testimonial {
  rep_name: string;
  school: string | null;
  first_summer_figure: string | null;
  quote: string | null;
}

export interface RecruitingContent {
  settings: Record<string, string>;
  parents: Record<string, string>;
  timeline: TimelineStep[];
  faq: FaqItem[];
  testimonials: Testimonial[];
}

const EMPTY: RecruitingContent = {
  settings: {},
  parents: {},
  timeline: [],
  faq: [],
  testimonials: [],
};

/** Public (anon-safe) marketing content - only filled-in blocks come back. */
export function useRecruitingContent() {
  const [content, setContent] = useState<RecruitingContent | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await (supabase as any).rpc('get_recruiting_content');
      if (!alive) return;
      setContent({ ...EMPTY, ...((data as Partial<RecruitingContent>) || {}) });
    })();
    return () => {
      alive = false;
    };
  }, []);

  return content;
}

export interface PublicCounters {
  active_reps: number | null;
  signed_season: number | null;
  serviced_total: number;
  signed_2027: number;
}

/** Server-cached counters. Values below the owner's thresholds come back null. */
export function usePublicCounters() {
  const [counters, setCounters] = useState<PublicCounters | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await (supabase as any).rpc('get_public_counters');
      if (!alive) return;
      setCounters((data as PublicCounters) || {
        active_reps: null,
        signed_season: null,
        serviced_total: 0,
        signed_2027: 0,
      });
    })();
    return () => {
      alive = false;
    };
  }, []);

  return counters;
}
