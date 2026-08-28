import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Lock, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VideoPlayer } from '@/components/VideoPlayer';
import { Wordmark } from '@/components/brand/Wordmark';
import { useRecruitGate, type DayOneItem } from '@/hooks/useRecruitGate';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { celebrate } from '@/lib/celebrate';
import { cn } from '@/lib/utils';

/**
 * Pass 119 — the day-one watch course. A brand new recruit sees this and
 * nothing else until the last item is watched, then the app opens on the spot.
 */
export default function RecruitCoursePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const gate = useRecruitGate();
  const [openId, setOpenId] = useState<string | null>(null);
  const [justFinished, setJustFinished] = useState(false);

  const items = gate.items;
  const current: DayOneItem | undefined = useMemo(
    () => items.find((i) => i.video_id === openId) || items.find((i) => !i.done),
    [items, openId],
  );

  // Nobody who is not gated should sit here.
  useEffect(() => {
    if (!gate.isLoading && !gate.locked && !justFinished) {
      navigate('/app', { replace: true });
    }
  }, [gate.isLoading, gate.locked, justFinished, navigate]);

  const markWatched = async (videoId: string, seconds?: number) => {
    if (!user?.id) return;
    await supabase.from('video_progress').upsert(
      {
        user_id: user.id,
        video_id: videoId,
        watched: true,
        watched_at: new Date().toISOString(),
        ...(seconds ? { duration: Math.round(seconds) } : {}),
      },
      { onConflict: 'user_id,video_id' },
    );
    const wasLast = items.filter((i) => !i.done).length <= 1;
    await gate.refresh();
    if (wasLast) {
      setJustFinished(true);
      void celebrate('graduation');
    }
  };

  const pct = gate.total ? Math.round((gate.done / gate.total) * 100) : 0;

  if (gate.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="text-sm text-muted-foreground">Loading</span>
      </div>
    );
  }

  if (justFinished) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5">
        <div className="w-full max-w-md rounded-2xl border border-[hsl(var(--workspace-accent)/0.35)] bg-card p-8 text-center animate-in fade-in zoom-in-95 duration-300 motion-reduce:animate-none">
          <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-[hsl(var(--workspace-accent))]" />
          <h1 className="text-xl font-semibold text-foreground">Day one done</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {gate.total} of {gate.total} watched. The rest of the app is open.
          </p>
          <Button className="mt-6 min-h-12 w-full" onClick={() => navigate('/app', { replace: true })}>
            Open the app
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-5 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <Wordmark variant="hero" height={64} className="mx-auto !h-auto w-full max-w-[200px]" />

        <div className="mt-8 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> Day one
          </div>
          <h1 className="mt-2 text-xl font-semibold text-foreground">Watch these first</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {gate.done} of {gate.total} watched
            {gate.minutes > 0 ? ` · ${gate.minutes} minutes in` : ''}
          </p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--workspace-accent))] to-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {current?.video_url && (
          <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card">
            <VideoPlayer
              src={current.video_url}
              title={current.title}
              onEnded={() => void markWatched(current.video_id)}
              onTimeUpdate={(_t, d) => {
                if (d && !current.done && _t / d > 0.95) void markWatched(current.video_id, d);
              }}
            />
            <div className="p-4">
              <p className="text-sm font-medium text-foreground">{current.title}</p>
              {current.category && <p className="text-xs text-muted-foreground">{current.category}</p>}
            </div>
          </div>
        )}

        <div className="mt-5 space-y-2">
          {items.map((item) => (
            <button
              key={item.video_id}
              type="button"
              onClick={() => setOpenId(item.video_id)}
              className={cn(
                'flex min-h-12 w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                item.video_id === current?.video_id
                  ? 'border-[hsl(var(--workspace-accent)/0.4)] bg-muted/40'
                  : 'border-border bg-card hover:bg-muted/30',
              )}
            >
              {item.done ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[hsl(var(--workspace-accent))]" />
              ) : (
                <Play className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-foreground">{item.title}</span>
                {item.category && (
                  <span className="block truncate text-xs text-muted-foreground">{item.category}</span>
                )}
              </span>
              <span className="text-xs text-muted-foreground">{item.position}</span>
            </button>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Your manager can see your progress here.
        </p>
      </div>
    </div>
  );
}
