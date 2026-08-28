import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { tierOf, type Tier } from '@/lib/tiers';

export type LeadScope = 'mine' | 'free' | 'all';

export interface LeadRow {
  id: string;
  profile_id: string | null;
  full_name: string;
  phone: string | null;
  email: string | null;
  system: string | null;
  roster_status: string | null;
  season_revenue: number | null;
  rev_per_day: number | null;
  start_date: string | null;
  days_in_market: number | null;
  committed_last_day: string | null;
  signed_2027: boolean | null;
  rep_year: string | null;
  recruiter_name: string | null;
  former_manager_name: string | null;
  team_name: string | null;
  role_title: string | null;
  tags: string[] | null;
  notes: string | null;
  stage: string | null;
  designation_status: string | null;
  designated_to: string | null;
  designated_to_name: string | null;
  designated_has_access: boolean | null;
  next_call_at: string | null;
  last_contact_at: string | null;
  call_count: number | null;
  do_not_call: boolean | null;
  last_outcome: string | null;
  on_roster: boolean | null;
  designated_at: string | null;
  cycle_days: number | null;
  hold: boolean | null;
  cycles_in_days: number | null;
}

export interface LeadSnapshot {
  captured_at?: string | null;
  full_name?: string | null;
  user_id?: string | null;
  ai_profile?: {
    summary?: string | null;
    strengths?: string[] | null;
    concerns?: string[] | null;
    goals?: string[] | null;
    last_built_at?: string | null;
  } | null;
  engagement?: {
    app_minutes_30d?: number | null;
    training_minutes_30d?: number | null;
    days_active_30d?: number | null;
    current_streak?: number | null;
    longest_streak?: number | null;
    total_days_active?: number | null;
    lessons_completed?: number | null;
  } | null;
  event_answers?: {
    event_title?: string | null;
    event_date?: string | null;
    answers?: Record<string, unknown> | null;
  }[] | null;
  departure?: {
    departure_type?: string | null;
    departure_reason?: string | null;
    last_day_worked?: string | null;
    archived_at?: string | null;
    revenue_to_date?: number | null;
  } | null;
}


export interface LeadFilters {
  search?: string | null;
  system?: string | null;
  rosterStatus?: string | null;
  stage?: string | null;
  designatedTo?: string | null;
  designation?: 'designated' | 'free' | null;
  tag?: string | null;
  hasPhone?: boolean | null;
  signed?: boolean | null;
  revMin?: number | null;
  revMax?: number | null;
  limit?: number;
}

export interface LeadActivity {
  id: string;
  kind: string;
  outcome: string | null;
  body: string | null;
  next_call_at: string | null;
  created_at: string;
  actor_name: string | null;
}

export interface LeadPrivateNote {
  id: string;
  kind: string;
  body: string | null;
  created_at: string;
  author_name?: string | null;
}

export interface LeadDetail {
  lead: Record<string, unknown> & LeadRow;
  designated_to_name: string | null;
  designated_has_access: boolean | null;
  profile: {
    id: string;
    user_id: string | null;
    full_name: string | null;
    approved: boolean | null;
    archived: boolean | null;
    status: string | null;
    revenue_to_date: number | null;
    last_sweep_at: string | null;
  } | null;
  activities: LeadActivity[];
  private_notes: LeadPrivateNote[] | null;
}

const rpc = (fn: string, args?: Record<string, unknown>) =>
  (supabase.rpc as any)(fn, args ?? {});

export function useTier(): Tier {
  const { role } = useAuth();
  return tierOf(role);
}

export function useLeadsList(scope: LeadScope, filters: LeadFilters, enabled = true) {
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const key = JSON.stringify({ scope, filters, enabled });

  const load = useCallback(async () => {
    if (!enabled) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: err } = await rpc('leads_list', {
      _scope: scope,
      _search: filters.search || null,
      _system: filters.system || null,
      _roster_status: filters.rosterStatus || null,
      _stage: filters.stage || null,
      _designated_to: filters.designatedTo || null,
      _designation: filters.designation || null,
      _tag: filters.tag || null,
      _has_phone: filters.hasPhone ?? null,
      _signed: filters.signed ?? null,
      _rev_min: filters.revMin ?? null,
      _rev_max: filters.revMax ?? null,
      _limit: filters.limit ?? 200,
    });
    if (err) setError(err.message);
    else {
      setError(null);
      setRows((data as LeadRow[]) || []);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    load();
  }, [load]);

  return { rows, loading, error, reload: load };
}

export function useLeadDetail(leadId: string | null) {
  const [detail, setDetail] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!leadId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    const { data } = await rpc('lead_detail', { _lead: leadId });
    setDetail((data as LeadDetail) || null);
    setLoading(false);
  }, [leadId]);

  useEffect(() => {
    load();
  }, [load]);

  return { detail, loading, reload: load };
}

export function useCallbacksDue() {
  const { user } = useAuth();
  const tier = useTier();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user || tier === 'sales') {
      setCount(0);
      return;
    }
    let cancelled = false;
    rpc('leads_callbacks_due').then(({ data }: { data: number | null }) => {
      if (!cancelled) setCount(data ?? 0);
    });
    return () => {
      cancelled = true;
    };
  }, [user, tier]);

  return count;
}

export const leadActions = {
  claim: (leadId: string) => rpc('lead_claim', { _lead: leadId }),
  free: (leadId: string) => rpc('lead_free', { _lead: leadId }),
  designate: (leadId: string, to: string) => rpc('lead_designate', { _lead: leadId, _to: to }),
  setStage: (leadId: string, stage: string) => rpc('lead_set_stage', { _lead: leadId, _stage: stage }),
  setNotes: (leadId: string, notes: string) => rpc('lead_set_notes', { _lead: leadId, _notes: notes }),
  addTag: (leadId: string, tag: string) => rpc('lead_add_tag', { _lead: leadId, _tag: tag }),
  setCycling: (leadId: string, cycleDays: number, hold: boolean) =>
    rpc('lead_set_cycling', { _lead: leadId, _cycle_days: cycleDays, _hold: hold }),

  privateNote: (leadId: string, kind: string, body: string) =>
    rpc('lead_private_note_add', { _lead: leadId, _kind: kind, _body: body }),
  log: (
    leadId: string,
    kind: 'call' | 'text' | 'note',
    outcome?: string | null,
    body?: string | null,
    nextCallAt?: string | null
  ) =>
    rpc('lead_log', {
      _lead: leadId,
      _kind: kind,
      _outcome: outcome ?? null,
      _body: body ?? null,
      _next_call_at: nextCallAt ?? null,
    }),
};

export const CALL_OUTCOMES: { value: string; label: string }[] = [
  { value: 'no_answer', label: 'No answer' },
  { value: 'callback', label: 'Call back' },
  { value: 'interested', label: 'Interested' },
  { value: 'not_interested', label: 'Not interested' },
  { value: 'signed', label: 'Signed' },
  { value: 'wrong_number', label: 'Wrong number' },
  { value: 'do_not_call', label: 'Do not call' },
];

/** One-tap outcomes for the re-sign week. */
export const RESIGN_OUTCOMES: { value: string; label: string; kind: 'call' | 'text' }[] = [
  { value: 'called', label: 'Called', kind: 'call' },
  { value: 'texted', label: 'Texted', kind: 'text' },
  { value: 'no_answer', label: 'No answer', kind: 'call' },
  { value: 'meeting_set', label: 'Meeting set', kind: 'call' },
  { value: 'signed', label: 'Signed for 2027', kind: 'call' },
  { value: 'not_coming_back', label: 'Not coming back', kind: 'call' },
];

export const NEXT_CALL_PRESETS: { label: string; days: number }[] = [
  { label: 'Tomorrow', days: 1 },
  { label: '3 days', days: 3 },
  { label: 'Next week', days: 7 },
];

export function inDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
}

export function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export function outcomeLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  const hit = RESIGN_OUTCOMES.find((o) => o.value === value) || CALL_OUTCOMES.find((o) => o.value === value);
  return hit ? hit.label : value.replace(/_/g, ' ');
}


export const LEAD_STAGES = [
  'new',
  'contacted',
  'callback',
  'interested',
  'not_interested',
  'signed',
  'dead',
  'excluded',
] as const;

export const PRIVATE_NOTE_KINDS: { value: string; label: string }[] = [
  { value: 'note', label: 'Note' },
  { value: 'mind', label: 'Mind' },
  { value: 'heart', label: 'Heart' },
  { value: 'feet', label: 'Feet' },
  { value: 'coming_back', label: 'Coming back' },
  { value: 'on_track', label: 'On track' },
];

export function money(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return `$${Math.round(Number(n)).toLocaleString()}`;
}

export function telHref(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, '');
  return digits ? `tel:${digits}` : null;
}

export function smsHref(phone: string | null | undefined, body?: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, '');
  if (!digits) return null;
  return body ? `sms:${digits}?&body=${encodeURIComponent(body)}` : `sms:${digits}`;
}
