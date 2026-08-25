import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { getRate, PAY_SCALE_LABELS, PayScale } from '@/lib/commission';

const CARD = 'rounded-2xl border border-white/[0.06] bg-card/60 backdrop-blur-sm';

function toCsv(rows: Record<string, any>[]): string {
  if (!rows.length) return '';
  const headers = Array.from(
    rows.reduce<Set<string>>((set, r) => {
      Object.keys(r).forEach((k) => set.add(k));
      return set;
    }, new Set())
  );
  const escape = (v: any) => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
}

function download(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type ExportKey = 'leads' | 'profiles' | 'training' | 'forms' | 'announcements' | 'payroll';

const EXPORTS: { key: ExportKey; label: string; description: string }[] = [
  { key: 'leads', label: 'Leads', description: 'Every recruiting lead with status, ref code, and assigned rep.' },
  { key: 'profiles', label: 'Profiles + roles', description: 'Reps with role, team, status, and last activity.' },
  { key: 'training', label: 'Training progress', description: 'Lesson completions per rep.' },
  { key: 'forms', label: 'Form submissions', description: 'Manager meetings and weekly 1:1s.' },
  { key: 'announcements', label: 'Announcements', description: 'Posts with status, category, and publish dates.' },
];

function defaultStart() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

export function AdminExportTab() {
  const [busy, setBusy] = useState<ExportKey | null>(null);
  const [start, setStart] = useState(defaultStart());
  const [end, setEnd] = useState(() => new Date().toISOString().slice(0, 10));

  const run = async (key: ExportKey) => {
    setBusy(key);
    try {
      const db = supabase as any;
      let rows: Record<string, any>[] = [];

      if (key === 'payroll') {
        const startTs = new Date(`${start}T00:00:00`).toISOString();
        const endTs = new Date(`${end}T23:59:59`).toISOString();
        const [{ data: profiles }, { data: comp }, { data: signups }] = await Promise.all([
          db.from('profiles').select('user_id, full_name, email').eq('archived', false).order('full_name'),
          db.from('rep_commission').select('user_id, pay_scale, avg_account_value, active_revenue, rate_override, notes'),
          db.from('rep_signups').select('signed_by, signed_at').gte('signed_at', startTs).lte('signed_at', endTs),
        ]);
        const compMap = new Map((comp || []).map((c: any) => [c.user_id, c]));
        const signCount = new Map<string, number>();
        (signups || []).forEach((s: any) => {
          if (!s.signed_by) return;
          signCount.set(s.signed_by, (signCount.get(s.signed_by) || 0) + 1);
        });
        rows = (profiles || []).map((p: any) => {
          const c: any = compMap.get(p.user_id) || {};
          const scale = (c.pay_scale || 'rookie') as PayScale;
          const signs = signCount.get(p.user_id) || 0;
          const avg = Number(c.avg_account_value ?? 0);
          const periodRevenue = signs * avg;
          const revenueForTier = Number(c.active_revenue ?? 0) || periodRevenue;
          const rate = c.rate_override != null ? Number(c.rate_override) : getRate(scale, revenueForTier);
          return {
            rep_name: p.full_name,
            rep_email: p.email,
            period_start: start,
            period_end: end,
            signs_in_period: signs,
            pay_scale: PAY_SCALE_LABELS[scale],
            avg_account_value_usd: avg || '',
            period_revenue_usd: Math.round(periodRevenue),
            revenue_used_for_tier_usd: Math.round(revenueForTier),
            commission_rate_pct: (rate * 100).toFixed(1),
            gross_estimate_usd: Math.round(periodRevenue * rate),
            notes: c.notes || '',
          };
        }).filter((r: any) => r.signs_in_period > 0 || r.revenue_used_for_tier_usd > 0);
      } else if (key === 'leads') {
        const { data, error } = await db
          .from('recruiting_leads')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        rows = data || [];
      } else if (key === 'profiles') {
        const [{ data: profiles, error }, { data: roles }] = await Promise.all([
          db
            .from('profiles')
            .select('user_id, full_name, email, phone, team_id, status, approved, direct_manager, last_active_at, created_at')
            .order('full_name'),
          db.from('user_roles').select('user_id, role'),
        ]);
        if (error) throw error;
        const roleMap = new Map<string, string[]>();
        (roles || []).forEach((r: any) => {
          roleMap.set(r.user_id, [...(roleMap.get(r.user_id) || []), r.role]);
        });
        rows = (profiles || []).map((p: any) => ({
          ...p,
          roles: (roleMap.get(p.user_id) || []).join('|'),
        }));
      } else if (key === 'training') {
        const [{ data: progress, error }, { data: lessons }, { data: profiles }] = await Promise.all([
          db.from('lesson_progress').select('user_id, lesson_id, completed_at, created_at'),
          db.from('training_lessons').select('id, title'),
          db.from('profiles').select('user_id, full_name'),
        ]);
        if (error) throw error;
        const lessonMap = new Map((lessons || []).map((l: any) => [l.id, l.title]));
        const nameMap = new Map((profiles || []).map((p: any) => [p.user_id, p.full_name]));
        rows = (progress || []).map((p: any) => ({
          rep: nameMap.get(p.user_id) || p.user_id,
          lesson: lessonMap.get(p.lesson_id) || p.lesson_id,
          completed_at: p.completed_at,
          started_at: p.created_at,
        }));
      } else if (key === 'forms') {
        const [{ data: meetings }, { data: rookie }, { data: manager }] = await Promise.all([
          db.from('manager_meeting_submissions').select('*'),
          db.from('weekly_one_on_ones_rookie').select('*'),
          db.from('weekly_one_on_ones_manager').select('*'),
        ]);
        rows = [
          ...(meetings || []).map((r: any) => ({ form: 'manager_meeting', ...r })),
          ...(rookie || []).map((r: any) => ({ form: 'one_on_one_rookie', ...r })),
          ...(manager || []).map((r: any) => ({ form: 'one_on_one_manager', ...r })),
        ];
      } else {
        const { data, error } = await db
          .from('announcement_posts')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        rows = data || [];
      }

      if (!rows.length) {
        toast.info('Nothing to export yet.');
        return;
      }

      const stamp = new Date().toISOString().slice(0, 10);
      download(`summit-${key}-${stamp}.csv`, toCsv(rows));
      toast.success(`Exported ${rows.length} rows`);
    } catch (err) {
      console.error(err);
      toast.error('Export failed — you may not have access to that data.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Export data</h2>
        <p className="text-sm text-muted-foreground">
          Downloads run with your own permissions. Files are CSV and open in Excel or Sheets.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {EXPORTS.map((e) => (
          <div key={e.key} className={cn(CARD, 'p-4')}>
            <h3 className="text-sm font-semibold text-foreground">{e.label}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{e.description}</p>
            <button
              onClick={() => run(e.key)}
              disabled={busy !== null}
              className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-primary/40 px-3 text-xs font-semibold uppercase tracking-wide text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50">
              {busy === e.key ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download CSV
            </button>
          </div>
        ))}

        {/* Payroll prep — date range driven */}
        <div className={cn(CARD, 'p-4 sm:col-span-2')}>
          <h3 className="text-sm font-semibold text-foreground">Payroll prep</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Per rep: signs in the selected period, their pay tier and rate from the Money system, and computed gross
            (period revenue = signs x average account value; gross = period revenue x rate).
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="text-xs text-muted-foreground">
              From
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="ml-2 min-h-10 rounded-lg border border-white/[0.08] bg-card/50 px-2 text-xs text-foreground"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              To
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="ml-2 min-h-10 rounded-lg border border-white/[0.08] bg-card/50 px-2 text-xs text-foreground"
              />
            </label>
            <button
              onClick={() => run('payroll')}
              disabled={busy !== null}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-primary/40 px-3 text-xs font-semibold uppercase tracking-wide text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50">
              {busy === 'payroll' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download CSV
            </button>
          </div>
        </div>

        <BackupsPanel />
      </div>
    </div>
  );
}
