import { useEffect, useState } from 'react';
import { Loader2, Phone, MessageSquare, Lock } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { isStaffTier, type Tier } from '@/lib/tiers';
import BeforeTheyLeft from '@/components/leads/BeforeTheyLeft';
import {
  CALL_OUTCOMES,
  LEAD_STAGES,
  PRIVATE_NOTE_KINDS,
  leadActions,
  money,
  smsHref,
  telHref,
  useLeadDetail,
  type LeadSnapshot,
} from '@/hooks/useLeads';


interface Props {
  leadId: string | null;
  tier: Tier;
  onClose: () => void;
  onChanged?: () => void;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="micro-label">{label}</p>
      <p className="truncate text-[13px] text-foreground tabular-nums">{value}</p>
    </div>
  );
}

export default function LeadDrawer({ leadId, tier, onClose, onChanged }: Props) {
  const { detail, loading, reload } = useLeadDetail(leadId);
  const staff = isStaffTier(tier);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<string>('no_answer');
  const [callbackAt, setCallbackAt] = useState('');
  const [logBody, setLogBody] = useState('');
  const [notes, setNotes] = useState('');
  const [noteKind, setNoteKind] = useState('note');
  const [privateBody, setPrivateBody] = useState('');
  const [tag, setTag] = useState('');
  const [managers, setManagers] = useState<{ user_id: string; full_name: string }[]>([]);
  const [cycleDays, setCycleDays] = useState('14');


  const lead = detail?.lead;
  const snapshotRaw = (lead?.profile_snapshot as (LeadSnapshot & { note?: string | null }) | null) || null;
  const snapshot = snapshotRaw as LeadSnapshot | null;
  const notesAllowed = tier !== 'sales';
  const publicNote = (snapshotRaw?.note as string | null) || null;

  const lastSeasonLine = [
    lead?.season_revenue != null ? `${money(lead.season_revenue as number)} serviced` : null,
    lead?.rev_per_day != null ? `${money(lead.rev_per_day as number)} a day` : null,
    lead?.days_in_market != null ? `${lead.days_in_market} days` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const datesLine = [
    lead?.start_date ? `Started ${new Date(lead.start_date as string).toLocaleDateString()}` : null,
    lead?.committed_last_day
      ? `Last day ${new Date(lead.committed_last_day as string).toLocaleDateString()}`
      : null,
    lead?.former_manager_name ? `Was with ${lead.former_manager_name}` : null,
    lead?.recruiter_name ? `Recruited by ${lead.recruiter_name}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const designatedAt = (lead?.designated_at as string | null) || null;
  const leadCycleDays = (lead?.cycle_days as number | null) ?? 14;
  const cyclesInDays = designatedAt
    ? Math.max(
        Math.ceil(
          (new Date(designatedAt).getTime() + Math.max(leadCycleDays, 1) * 86400000 - Date.now()) / 86400000
        ),
        0
      )
    : null;


  useEffect(() => {
    setNotes((lead?.notes as string) || '');
  }, [lead?.id, lead?.notes]);

  useEffect(() => {
    setCycleDays(String((lead?.cycle_days as number | null) ?? 14));
  }, [lead?.id, lead?.cycle_days]);


  useEffect(() => {
    if (!staff || !leadId) return;
    supabase
      .from('profiles')
      .select('user_id, full_name')
      .eq('approved', true)
      .eq('archived', false)
      .order('full_name')
      .then(({ data }) => {
        setManagers(
          ((data as { user_id: string | null; full_name: string | null }[]) || [])
            .filter((r): r is { user_id: string; full_name: string } => !!r.user_id && !!r.full_name)
        );
      });
  }, [staff, leadId]);

  const run = async (fn: () => Promise<{ error: { message: string } | null }>, ok: string) => {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success(ok);
      reload();
      onChanged?.();
    }
  };

  return (
    <Sheet open={!!leadId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-[520px]">
        {loading && !detail ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !lead ? (
          <p className="pt-10 text-sm text-muted-foreground">This lead is not available to you.</p>
        ) : (
          <>
            <SheetHeader className="text-left">
              <SheetTitle className="text-lg">{lead.full_name}</SheetTitle>
              <SheetDescription className="text-[12px]">
                {[lead.team_name, lead.rep_year].filter(Boolean).join(' · ') || 'No team on file'}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {lead.system && (
                <span className="rounded-full border border-border/60 bg-surface px-2 py-0.5 text-[11px] text-muted-foreground">
                  {lead.system as string}
                </span>
              )}
              {lead.signed_2027 && (
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  Signed for 2027
                </span>
              )}
              {lead.stage && (
                <span className="rounded-full border border-border/60 bg-surface px-2 py-0.5 text-[11px] text-muted-foreground">
                  {String(lead.stage).replace(/_/g, ' ')}
                </span>
              )}
            </div>

            {lastSeasonLine && (
              <p className="mt-3 text-[13px] text-foreground">{lastSeasonLine}</p>
            )}
            {datesLine && <p className="mt-1 text-[12px] text-muted-foreground">{datesLine}</p>}
            {publicNote && (
              <div className="mt-3 rounded-[var(--radius)] border border-border/60 bg-surface p-3">
                <p className="micro-label mb-1">Note from the sheet</p>
                <p className="text-[13px] leading-snug text-foreground">{publicNote}</p>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {telHref(lead.phone) && (
                <a
                  href={telHref(lead.phone) as string}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-primary/25 bg-primary/10 px-3 text-[13px] font-semibold text-primary"
                >
                  <Phone className="h-3.5 w-3.5" /> {lead.phone}
                </a>
              )}
              {smsHref(lead.phone) && (
                <a
                  href={smsHref(lead.phone) as string}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border/60 bg-surface px-3 text-[13px] font-semibold text-foreground"
                >
                  <MessageSquare className="h-3.5 w-3.5" /> Text
                </a>
              )}
              {!lead.phone && <p className="text-[12px] text-muted-foreground">No phone on file</p>}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Field label="Season revenue" value={money(lead.season_revenue)} />
              <Field label="Revenue per day" value={money(lead.rev_per_day)} />
              <Field label="Days in market" value={lead.days_in_market != null ? String(lead.days_in_market) : '—'} />
              <Field label="Calls logged" value={String(lead.call_count ?? 0)} />
              <Field label="Former manager" value={lead.former_manager_name || '—'} />
              <Field label="Recruiter" value={lead.recruiter_name || '—'} />
              <Field label="Team" value={lead.team_name || '—'} />
              <Field label="Signed" value={lead.signed_2027 ? 'Yes' : 'No'} />
              <Field label="Designated to" value={detail?.designated_to_name || 'Free'} />
              <Field
                label="Last contact"
                value={lead.last_contact_at ? new Date(lead.last_contact_at as string).toLocaleDateString() : '—'}
              />
            </div>

            {(lead.tags?.length ?? 0) > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {(lead.tags as string[]).map((t) => (
                  <span key={t} className="rounded-full border border-border/60 bg-surface px-2 py-0.5 text-[11px] text-muted-foreground">
                    {t}
                  </span>
                ))}
              </div>
            )}

            {lead.designated_to && (
              <p className="mt-4 text-[12px] text-muted-foreground">
                {lead.hold
                  ? 'On hold — this lead will not cycle.'
                  : cyclesInDays != null
                    ? `Cycles in ${cyclesInDays} day${cyclesInDays === 1 ? '' : 's'} without activity.`
                    : 'No designation date on file yet.'}
              </p>
            )}


            <BeforeTheyLeft
              snapshot={snapshot}
              aiSummary={(lead.ai_summary as string | null) || null}
              profileUserId={staff ? detail?.profile?.user_id || null : null}
            />



            {/* Log a call */}
            <div className="mt-6 rounded-[var(--radius)] border border-border/60 bg-surface p-3">
              <p className="micro-label mb-2">Log a call</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Select value={outcome} onValueChange={setOutcome}>
                  <SelectTrigger className="h-10 text-[13px] sm:w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CALL_OUTCOMES.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="text-[13px]">
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {outcome === 'callback' && (
                  <Input
                    type="datetime-local"
                    value={callbackAt}
                    onChange={(e) => setCallbackAt(e.target.value)}
                    className="h-10 text-[13px]"
                  />
                )}
              </div>
              <textarea
                value={logBody}
                onChange={(e) => setLogBody(e.target.value)}
                rows={2}
                maxLength={2000}
                placeholder="What was said"
                className="mt-2 w-full resize-y rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-[13px] outline-none focus:border-primary/40"
              />
              <button
                disabled={busy || (outcome === 'callback' && !callbackAt)}
                onClick={() =>
                  run(
                    () =>
                      leadActions.log(
                        lead.id,
                        'call',
                        outcome,
                        logBody || null,
                        outcome === 'callback' && callbackAt ? new Date(callbackAt).toISOString() : null
                      ),
                    'Call logged'
                  ).then(() => {
                    setLogBody('');
                    setCallbackAt('');
                  })
                }
                className="mt-2 min-h-11 w-full rounded-xl bg-primary text-[13px] font-semibold text-primary-foreground disabled:opacity-60"
              >
                Save call
              </button>
            </div>

            {/* Stage and notes */}
            <div className="mt-4 grid gap-3">
              <div>
                <p className="micro-label mb-1.5">Stage</p>
                <Select
                  value={(lead.stage as string) || 'new'}
                  onValueChange={(v) => run(() => leadActions.setStage(lead.id, v), 'Stage updated')}
                >
                  <SelectTrigger className="h-10 text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_STAGES.filter((s) => staff || s !== 'excluded').map((s) => (
                      <SelectItem key={s} value={s} className="text-[13px]">
                        {s.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="micro-label mb-1.5">Shared notes</p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={() => {
                    if (notes !== ((lead.notes as string) || '')) run(() => leadActions.setNotes(lead.id, notes), 'Notes saved');
                  }}
                  rows={3}
                  maxLength={4000}
                  className="w-full resize-y rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-[13px] outline-none focus:border-primary/40"
                />
              </div>
            </div>

            {/* Staff controls */}
            {staff && (
              <div className="mt-4 rounded-[var(--radius)] border border-border/60 bg-surface p-3">
                <p className="micro-label mb-2">Admin controls</p>
                <div className="flex flex-col gap-2">
                  <Select value="" onValueChange={(v) => run(() => leadActions.designate(lead.id, v), 'Lead designated')}>
                    <SelectTrigger className="h-10 text-[13px]">
                      <SelectValue placeholder="Designate to" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[260px]">
                      {managers.map((m) => (
                        <SelectItem key={m.user_id} value={m.user_id} className="text-[13px]">
                          {m.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    disabled={busy}
                    onClick={() => run(() => leadActions.free(lead.id), 'Lead freed')}
                    className="min-h-11 rounded-xl border border-border/60 bg-background/50 text-[13px] font-semibold disabled:opacity-60"
                  >
                    Move to free pool
                  </button>
                  <div className="flex gap-2">
                    <Input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Tag" maxLength={40} className="h-10 text-[13px]" />
                    <button
                      disabled={busy || !tag.trim()}
                      onClick={() => run(() => leadActions.addTag(lead.id, tag.trim()), 'Tag added').then(() => setTag(''))}
                      className="min-h-11 shrink-0 rounded-xl border border-border/60 bg-background/50 px-3 text-[13px] font-semibold disabled:opacity-60"
                    >
                      Add tag
                    </button>
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="micro-label mb-1">Cycle days</p>
                      <Input
                        value={cycleDays}
                        onChange={(e) => setCycleDays(e.target.value.replace(/[^0-9]/g, ''))}
                        inputMode="numeric"
                        className="h-10 text-[13px]"
                      />
                    </div>
                    <button
                      disabled={busy}
                      onClick={() =>
                        run(
                          () =>
                            leadActions.setCycling(
                              lead.id,
                              Math.max(Number(cycleDays) || 14, 1),
                              !!lead.hold
                            ),
                          'Cycle days saved'
                        )
                      }
                      className="min-h-11 shrink-0 rounded-xl border border-border/60 bg-background/50 px-3 text-[13px] font-semibold disabled:opacity-60"
                    >
                      Save
                    </button>
                    <button
                      disabled={busy}
                      onClick={() =>
                        run(
                          () =>
                            leadActions.setCycling(
                              lead.id,
                              Math.max(Number(cycleDays) || 14, 1),
                              !lead.hold
                            ),
                          lead.hold ? 'Hold removed' : 'Lead on hold'
                        )
                      }
                      className="min-h-11 shrink-0 rounded-xl border border-border/60 bg-background/50 px-3 text-[13px] font-semibold disabled:opacity-60"
                    >
                      {lead.hold ? 'Remove hold' : 'Hold'}
                    </button>
                  </div>

                </div>
              </div>
            )}

            {/* Private notes */}
            {notesAllowed && (
              <div className="mt-4 rounded-[var(--radius)] border border-border/60 bg-surface p-3">
                <p className="micro-label mb-2 flex items-center gap-1.5">
                  <Lock className="h-3 w-3" /> Private notes
                </p>
                <div className="flex gap-2">
                  <Select value={noteKind} onValueChange={setNoteKind}>
                    <SelectTrigger className="h-10 w-[140px] text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIVATE_NOTE_KINDS.map((k) => (
                        <SelectItem key={k.value} value={k.value} className="text-[13px]">
                          {k.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={privateBody}
                    onChange={(e) => setPrivateBody(e.target.value)}
                    placeholder="Private note"
                    maxLength={2000}
                    className="h-10 text-[13px]"
                  />
                  <button
                    disabled={busy || !privateBody.trim()}
                    onClick={() =>
                      run(() => leadActions.privateNote(lead.id, noteKind, privateBody.trim()), 'Note saved').then(() =>
                        setPrivateBody('')
                      )
                    }
                    className="min-h-11 shrink-0 rounded-xl bg-primary px-3 text-[13px] font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    Save
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  {(detail?.private_notes || []).map((n) => (
                    <div key={n.id} className="rounded-lg border border-border/50 bg-background/40 p-2">
                      <p className="micro-label">{n.kind.replace('_', ' ')}</p>
                      <p className="text-[13px] text-foreground">{n.body}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {[n.author_name || 'Manager', new Date(n.created_at).toLocaleDateString()].join(' · ')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* History */}
            <div className="mt-4 mb-8">
              <p className="micro-label mb-2">History</p>
              <div className="space-y-2">
                {(detail?.activities || []).length === 0 && (
                  <p className="text-[13px] text-muted-foreground">No activity logged yet.</p>
                )}
                {(detail?.activities || []).map((a) => (
                  <div key={a.id} className={cn('rounded-lg border border-border/50 bg-background/40 p-2')}>
                    <p className="text-[12px] font-semibold text-foreground">
                      {a.kind}
                      {a.outcome ? ` · ${a.outcome.replace('_', ' ')}` : ''}
                    </p>
                    {a.body && <p className="text-[13px] text-muted-foreground">{a.body}</p>}
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {a.actor_name || 'Someone'} · {new Date(a.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
