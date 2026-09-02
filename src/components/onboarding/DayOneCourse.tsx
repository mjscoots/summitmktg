import { useMemo, useState } from 'react';
import { CheckCircle2, Play } from 'lucide-react';
import { VideoPlayer } from '@/components/VideoPlayer';
import { useRecruitGate, type DayOneItem } from '@/hooks/useRecruitGate';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { celebrate } from '@/lib/celebrate';
import { cn } from '@/lib/utils';

/**
 * Pass 155 - the day one watch course as an embeddable block. Same course list,
 * same video_progress writes and same completion record as the full page, so a
 * pending person waiting on their industry is never counted twice.
 */
export function DayOneCourse() {
  const { user } = useAuth();
  const gate = useRecruitGate();
  const [openId, setOpenId] = useState<string | null>(null);

  const items = gate.items;
  const current: DayOneItem | undefined = useMemo(
    () => items.find((i) => i.video_id === openId) || items.find((i) => !i.done),
    [items, openId],
  );

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
    if (wasLast) void celebrate('graduation');
  };

  if (gate.isLoading || gate.total === 0) return null;

  const pct = gate.total ? Math.round((gate.done / gate.total) * 100) : 0;
  const finished = gate.done >= gate.total;

  return (
    <div className="mt-8 text-left">
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm font-semibold text-foreground">
          {finished ? 'Day one done' : 'Watch these first'}
        </p>
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
        <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
          <VideoPlayer
            src={current.video_url}
            title={current.title}
            onEnded={() => void markWatched(current.video_id)}
            onTimeUpdate={(t, d) => {
              if (d && !current.done && t / d > 0.95) void markWatched(current.video_id, d);
            }}
          />
          <div className="p-4">
            <p className="text-sm font-medium text-foreground">{current.title}</p>
            {current.category && <p className="text-xs text-muted-foreground">{current.category}</p>}
          </div>
        </div>
      )}

      <div className="mt-4 space-y-2">
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
    </div>
  );
}

export default DayOneCourse;
