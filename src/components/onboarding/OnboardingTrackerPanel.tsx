import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  EMPTY_ONBOARDING,
  ONBOARDING_STEPS,
  type ManualStep,
  type OnboardingState,
} from '@/lib/onboardingSteps';
import PlacePersonSheet from '@/components/onboarding/PlacePersonSheet';

interface TrackerRow {
  user_id: string;
  full_name: string | null;
  team_name: string | null;
  manager_name: string | null;
  is_active: boolean;
  agreement_checked_by: string | null;
  payroll_checked_by: string | null;
  state: OnboardingState;
}

/**
 * Who is stuck on which onboarding step. A manager sees their own people, a
 * pillar leader sees their system, the owner sees everyone. The two manual
 * steps are ticked here and record who ticked them.
 */
export function OnboardingTrackerPanel({ canPlace = false }: { canPlace?: boolean }) {
  const { activeVertical } = useWorkspace();
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState<TrackerRow[]>([]);
  const [loading, setLoading] = useState(true);

  // The Today screen can hand this panel the people it counted as stuck.
  const stuckIds = useMemo<string[]>(() => {
    if (searchParams.get('onboarding') !== 'stuck') return [];
    try {
      const raw = sessionStorage.getItem('day-stuck-ids');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
      return [];
    }
  }, [searchParams]);

  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'stuck'>(
    stuckIds.length > 0 ? 'stuck' : 'all'
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [placing, setPlacing] = useState<TrackerRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any).rpc('onboarding_tracker', {
      _vertical: activeVertical,
      _only_active: false,
    });
    setRows(((data as TrackerRow[] | null) || []).map((r) => ({ ...r, state: r.state || EMPTY_ONBOARDING })));
    setLoading(false);
  }, [activeVertical]);

  useEffect(() => {
    void load();
  }, [load]);

  const shown = useMemo(
    () =>
      rows.filter((r) =>
        filter === 'all'
          ? true
          : filter === 'stuck'
            ? stuckIds.includes(r.user_id)
            : filter === 'active'
              ? r.is_active
              : !r.is_active
      ),
    [rows, filter, stuckIds]
  );


  const fully = rows.filter((r) => r.state.fully_onboarded).length;

  const tick = async (row: TrackerRow, step: ManualStep, on: boolean) => {
    setBusy(`${row.user_id}-${step}`);
    const { data, error } = await (supabase as any).rpc('set_onboarding_step', {
      _user_id: row.user_id,
      _step: step,
      _on: on,
    });
    setBusy(null);
    const res = (data as { success?: boolean; error?: string } | null) || null;
    if (error || !res?.success) {
      toast.error(res?.error || error?.message || 'That did not go through');
      return;
    }
    void load();
  };

  return (
    <section className="rounded-2xl border border-white/[0.06] bg-card/60 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[15px] font-semibold text-foreground">Onboarding tracker</p>
        <p className="text-[13px] tabular-nums text-muted-foreground">
          {fully} of {rows.length} fully onboarded
        </p>
      </div>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Five steps per person. Tapping a step you own ticks it and records your name.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {([...(stuckIds.length > 0 ? (['stuck'] as const) : []), 'all', 'active', 'inactive'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={
              filter === f
                ? 'min-h-11 rounded-full bg-primary px-4 text-[13px] font-semibold text-primary-foreground'
                : 'min-h-11 rounded-full border border-white/[0.08] px-4 text-[13px] text-muted-foreground'
            }
          >
            {f === 'stuck'
              ? 'Stuck 7 days or more'
              : f === 'all'
                ? 'Everyone'
                : f === 'active'
                  ? 'Active'
                  : 'Inactive'}
          </button>
        ))}
      </div>


      {loading ? (
        <Loader2 className="mt-4 h-4 w-4 animate-spin text-muted-foreground" />
      ) : shown.length === 0 ? (
        <p className="mt-4 text-[13px] text-muted-foreground">Nobody to show here yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {shown.map((row) => (
            <div key={row.user_id} className="rounded-xl border border-white/[0.06] bg-background/40 p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-foreground">
                    {row.full_name || 'Unnamed'}
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    {row.team_name || 'No pillar'} · {row.manager_name || 'No manager'} ·{' '}
                    {row.is_active ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <p className="text-[13px] tabular-nums text-muted-foreground">
                  {row.state.done} of {row.state.total}
                </p>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                {ONBOARDING_STEPS.map((step) => {
                  const done = Boolean(row.state[step.key]);
                  const key = `${row.user_id}-${step.key}`;
                  const who =
                    step.key === 'agreement_signed'
                      ? row.agreement_checked_by
                      : step.key === 'payroll_setup'
                        ? row.payroll_checked_by
                        : null;

                  if (!step.manual) {
                    return (
                      <span
                        key={step.key}
                        className={
                          done
                            ? 'inline-flex min-h-11 items-center gap-1 rounded-full bg-primary/15 px-3 text-[12px] font-semibold text-primary'
                            : 'inline-flex min-h-11 items-center gap-1 rounded-full border border-white/[0.08] px-3 text-[12px] text-muted-foreground'
                        }
                      >
                        {done && <Check className="h-3 w-3" />}
                        {step.label}
                      </span>
                    );
                  }

                  return (
                    <button
                      key={step.key}
                      type="button"
                      disabled={busy === key}
                      onClick={() => tick(row, step.key as ManualStep, !done)}
                      title={who ? `Ticked by ${who}` : undefined}
                      className={
                        done
                          ? 'inline-flex min-h-11 items-center gap-1 rounded-full bg-primary/15 px-3 text-[12px] font-semibold text-primary'
                          : 'inline-flex min-h-11 items-center gap-1 rounded-full border border-white/[0.08] px-3 text-[12px] text-muted-foreground'
                      }
                    >
                      {busy === key ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        done && <Check className="h-3 w-3" />
                      )}
                      {step.label}
                    </button>
                  );
                })}
              </div>

              {canPlace && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 min-h-11"
                  onClick={() => setPlacing(row)}
                >
                  Place under a manager
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {placing && (
        <PlacePersonSheet
          userId={placing.user_id}
          fullName={placing.full_name || 'This person'}
          open
          onOpenChange={(o) => !o && setPlacing(null)}
          onPlaced={load}
        />
      )}
    </section>
  );
}

export default OnboardingTrackerPanel;
