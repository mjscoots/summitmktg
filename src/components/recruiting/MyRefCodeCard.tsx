import { useEffect, useState } from 'react';
import { Ticket, Share2, Check, Link as LinkIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * Every approved, active rep has a personal ref code. Anyone who submits the
 * ticket form through this link is attributed to them.
 *
 * Pass 224 - the link is now one tap to send: native share where the phone
 * offers it, copy everywhere else.
 */
function useMyRefLink() {
  const { activeVertical } = useWorkspace();
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await (supabase as any).rpc('get_my_ref_code');
      if (alive) setCode((data as string) || null);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const path = code
    ? `/?ref=${encodeURIComponent(code)}&industry=${encodeURIComponent(activeVertical)}`
    : '';
  const url = code ? `${window.location.origin}${path}` : '';
  return { code, url };
}

function useShareLink(url: string) {
  const [done, setDone] = useState(false);

  const share = async () => {
    if (!url) return;
    const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ title: 'Trinity Sales', text: 'This is the crew I sell with.', url });
        return;
      } catch {
        /* cancelled or unavailable - fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setDone(true);
      toast.success('Link copied', { description: url });
      setTimeout(() => setDone(false), 1800);
    } catch {
      toast.error('Could not copy link');
    }
  };

  return { share, done, canShare: typeof (navigator as Navigator & { share?: unknown }).share === 'function' };
}

/** One line, one tap. Sits at the top of the recruits screen. */
export function ShareMyLinkBar({ className }: { className?: string }) {
  const { code, url } = useMyRefLink();
  const { share, done, canShare } = useShareLink(url);

  if (!code) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border border-border/50 bg-card px-3 py-2.5',
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-foreground">Send your link</p>
        <p className="truncate text-[11px] text-muted-foreground">Anyone who applies from it is credited to you</p>
      </div>
      <button
        type="button"
        onClick={share}
        className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 text-[13px] font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-transform active:scale-[0.98]"
      >
        {done ? <Check className="h-4 w-4" /> : canShare ? <Share2 className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
        {done ? 'Copied' : canShare ? 'Share' : 'Copy'}
      </button>
    </div>
  );
}

export function MyRefCodeCard() {
  const { code, url } = useMyRefLink();
  const { share, done, canShare } = useShareLink(url);

  if (!code) return null;

  return (
    <div className="bg-card rounded-xl border border-border/50 p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Ticket className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-foreground">My link</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Anyone who applies from this link is credited to you.
          </p>

          <div className="mt-4 rounded-xl border border-border/60 bg-surface px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Your code
            </p>
            <p className="mt-0.5 break-all font-mono text-sm font-bold text-foreground">{code}</p>
            <p className="mt-2 break-all text-xs text-muted-foreground">{url}</p>
          </div>

          <div className="mt-3">
            <button
              type="button"
              onClick={share}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-transform active:scale-[0.98]"
            >
              {done ? <Check className="h-4 w-4" /> : canShare ? <Share2 className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
              {done ? 'Copied' : canShare ? 'Share my link' : 'Copy my link'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
