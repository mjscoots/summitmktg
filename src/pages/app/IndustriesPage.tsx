import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Bug, Wifi, HeartHandshake, Users, Check, Lock, CircleDot, Upload,
  GraduationCap, ShieldCheck, ListChecks, Loader2, ArrowLeft,
} from 'lucide-react';

const CARD = 'bg-card/60 backdrop-blur-sm border border-white/[0.06] rounded-xl p-4 sm:p-5';

interface HubVertical {
  vertical: string;
  label: string;
  description: string | null;
  is_configured: boolean;
  step_count: number;
  active_count: number;
  lead: { full_name: string | null; avatar_url: string | null } | null;
  my_enrollment: { status: string; current_step: number } | null;
}

interface PathStep {
  id: string;
  display_order: number;
  title: string;
  description: string | null;
  step_type: 'task' | 'upload' | 'training' | 'approval';
  course_id: string | null;
  course_slug: string | null;
  course_title: string | null;
  completed_at: string | null;
  file_path: string | null;
  state: 'done' | 'current' | 'locked';
}

interface PathData {
  vertical?: string;
  label?: string;
  is_configured?: boolean;
  enrollment?: { status: string; current_step: number } | null;
  steps: PathStep[];
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Pest: Bug,
  Fiber: Wifi,
  Life: HeartHandshake,
};

const STEP_ICONS: Record<PathStep['step_type'], React.ComponentType<{ className?: string }>> = {
  task: ListChecks,
  upload: Upload,
  training: GraduationCap,
  approval: ShieldCheck,
};

export default function IndustriesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const openVertical = searchParams.get('v');

  const [verticals, setVerticals] = useState<HubVertical[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);

  const loadHub = useCallback(async () => {
    const { data } = await supabase.rpc('get_industry_hub' as never);
    const rows = ((data as unknown as { verticals: HubVertical[] })?.verticals) || [];
    setVerticals(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    loadHub();
  }, [user?.id, loadHub]);

  const join = async (v: HubVertical) => {
    setJoining(v.vertical);
    const { data, error } = await supabase.rpc('join_vertical' as never, { _vertical: v.vertical } as never);
    setJoining(null);
    const res = data as unknown as { success: boolean; configured: boolean; error?: string } | null;
    if (error || !res?.success) {
      toast({ title: 'Could not join', description: res?.error || error?.message, variant: 'destructive' });
      return;
    }
    if (!res.configured) {
      toast({ title: 'Request received', description: "Setup steps are being finalized — you'll be notified." });
    } else {
      setSearchParams({ v: v.vertical });
    }
    loadHub();
  };

  if (openVertical) {
    return (
      <MyPathView
        vertical={openVertical}
        onBack={() => {
          setSearchParams({});
          loadHub();
        }}
      />
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-5xl space-y-4 px-3 py-4 sm:px-5">
        <PageBackButton />
        <header>
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Industries</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            The lines of business you can run with Summit. Join one to see its setup checklist.
          </p>
        </header>

        {loading ? (
          <div className={CARD}>
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {verticals.map((v) => {
              const Icon = ICONS[v.vertical] || ListChecks;
              const enr = v.my_enrollment;
              return (
                <div key={v.vertical} className={cn(CARD, 'flex flex-col gap-3')}>
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary/25 to-primary/5">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <h2 className="text-sm font-semibold text-foreground">{v.label}</h2>
                  </div>

                  <p className="text-[13px] leading-relaxed text-muted-foreground">
                    {v.description || 'Description not added yet.'}
                  </p>

                  <div className="space-y-2 text-[12px] text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5" />
                      <span className="tabular-nums">{v.active_count}</span>
                      <span>active {v.active_count === 1 ? 'rep' : 'reps'}</span>
                    </div>
                    {v.lead?.full_name && (
                      <div className="flex items-center gap-2">
                        <UserAvatar
                          fullName={v.lead.full_name}
                          avatarUrl={v.lead.avatar_url}
                          size="sm"
                        />
                        <span className="text-foreground/80">{v.lead.full_name}</span>
                        <span>runs this</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-auto pt-1">
                    {enr?.status === 'active' ? (
                      <div className="flex items-center gap-2 text-[13px] font-medium text-emerald-400">
                        <Check className="h-4 w-4" /> You're active here
                      </div>
                    ) : enr?.status === 'onboarding' ? (
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => setSearchParams({ v: v.vertical })}
                      >
                        Continue setup (step {enr.current_step} of {v.step_count})
                      </Button>
                    ) : enr?.status === 'interested' ? (
                      <p className="text-[12px] text-muted-foreground">
                        Setup steps are being finalized — you'll be notified.
                      </p>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full"
                        disabled={joining === v.vertical}
                        onClick={() => join(v)}
                      >
                        {joining === v.vertical ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Join'}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function MyPathView({ vertical, onBack }: { vertical: string; onBack: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<PathData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: res } = await supabase.rpc('get_my_vertical_path' as never, { _vertical: vertical } as never);
    setData((res as unknown as PathData) || { steps: [] });
    setLoading(false);
  }, [vertical]);

  useEffect(() => {
    load();
  }, [load]);

  const completeTask = async (step: PathStep, filePath?: string) => {
    setBusy(step.id);
    const { data: res, error } = await supabase.rpc('complete_vertical_step' as never, {
      _step_id: step.id,
      _file_path: filePath ?? null,
    } as never);
    setBusy(null);
    const out = res as unknown as { success: boolean; error?: string } | null;
    if (error || !out?.success) {
      toast({ title: 'Could not save', description: out?.error || error?.message, variant: 'destructive' });
      return;
    }
    load();
  };

  const upload = async (step: PathStep, file: File) => {
    if (!user?.id) return;
    setBusy(step.id);
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${user.id}/${vertical}/${Date.now()}-${safe}`;
    const { error } = await supabase.storage.from('vertical-proof').upload(path, file);
    setBusy(null);
    if (error) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
      return;
    }
    completeTask(step, path);
  };

  const steps = data?.steps || [];
  const done = steps.filter((s) => s.state === 'done').length;

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-3xl space-y-4 px-3 py-4 sm:px-5">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Industries
        </button>

        <header>
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
            {data?.label || vertical} setup
          </h1>
          {steps.length > 0 && (
            <p className="mt-1 text-[13px] tabular-nums text-muted-foreground">
              {done} of {steps.length} steps complete
            </p>
          )}
        </header>

        {loading ? (
          <div className={CARD}>
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : !data?.is_configured ? (
          <div className={CARD}>
            <p className="text-sm text-muted-foreground">
              Setup steps are being finalized — you'll be notified.
            </p>
          </div>
        ) : (
          <ol className="space-y-3">
            {steps.map((s) => {
              const Icon = STEP_ICONS[s.step_type];
              return (
                <li
                  key={s.id}
                  className={cn(
                    CARD,
                    'flex gap-3',
                    s.state === 'locked' && 'opacity-55',
                    s.state === 'current' && 'border-primary/30'
                  )}
                >
                  <div className="pt-0.5">
                    {s.state === 'done' ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : s.state === 'current' ? (
                      <CircleDot className="h-4 w-4 text-primary" />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">{s.title}</p>
                    </div>
                    {s.description && (
                      <p className="mt-1 text-[13px] text-muted-foreground">{s.description}</p>
                    )}

                    {s.state === 'done' && s.completed_at && (
                      <p className="mt-1.5 text-[11px] tabular-nums text-muted-foreground">
                        Done {new Date(s.completed_at).toLocaleDateString()}
                      </p>
                    )}

                    {s.state === 'current' && (
                      <div className="mt-3">
                        {s.step_type === 'task' && (
                          <Button size="sm" disabled={busy === s.id} onClick={() => completeTask(s)}>
                            {busy === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Mark done'}
                          </Button>
                        )}
                        {s.step_type === 'upload' && (
                          <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-border/60 px-3 text-[13px] font-medium text-foreground hover:bg-white/5">
                            {busy === s.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4" />
                            )}
                            Upload file
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) upload(s, f);
                              }}
                            />
                          </label>
                        )}
                        {s.step_type === 'training' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              navigate(s.course_slug ? `/app/training/${s.course_slug}` : '/app/training')
                            }
                          >
                            {s.course_title ? `Open ${s.course_title}` : 'Open training'}
                          </Button>
                        )}
                        {s.step_type === 'approval' && (
                          <p className="text-[12px] text-muted-foreground">
                            Waiting on a manager to sign off.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
            {steps.length === 0 && (
              <li className={CARD}>
                <p className="text-sm text-muted-foreground">No steps yet.</p>
              </li>
            )}
          </ol>
        )}
      </div>
    </AppLayout>
  );
}
