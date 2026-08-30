import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { prepareChatImage } from '@/lib/chatImage';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const TYPES: { value: string; label: string }[] = [
  { value: 'bug', label: 'Bug' },
  { value: 'idea', label: 'Idea' },
  { value: 'confusing', label: 'Confusing' },
  { value: 'other', label: 'Other' },
];

export const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'Looking into it',
  fixed: 'Fixed',
  wont_fix: 'Not planned',
};

interface MyReport {
  id: string;
  feedback_type: string;
  message: string;
  status: string;
  created_at: string;
}

/** Build version string when the bundler exposes one, otherwise nothing. */
function buildCommit(): string | null {
  const env = import.meta.env as Record<string, string | undefined>;
  return env.VITE_APP_COMMIT || env.VITE_BUILD_ID || null;
}

/**
 * One form for bug reports and ideas. Route, device and build details are
 * captured quietly so nobody has to describe where they were.
 */
export function FeedbackDialog({ trigger }: { trigger: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('bug');
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [reports, setReports] = useState<MyReport[]>([]);

  const loadReports = async () => {
    if (!user) return;
    const { data } = await (supabase.from('app_feedback' as any) as any)
      .select('id, feedback_type, message, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setReports((data as MyReport[]) || []);
  };

  useEffect(() => {
    if (open) void loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id]);

  const submit = async () => {
    if (!user || !message.trim()) return;
    setSaving(true);
    try {
      let screenshotPath: string | null = null;
      if (file) {
        const prepared = await prepareChatImage(file);
        const blob = prepared ? prepared.blob : file;
        const ext = prepared ? prepared.ext : (file.name.split('.').pop() || 'png');
        const path = `${user.id}/feedback-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('chat-uploads')
          .upload(path, blob, { contentType: blob.type || 'application/octet-stream' });
        if (upErr) throw upErr;
        screenshotPath = path;
      }

      const { error } = await (supabase.from('app_feedback' as any) as any).insert({
        user_id: user.id,
        feedback_type: type,
        message: message.trim(),
        page_path: location.pathname,
        device_info: navigator.userAgent,
        app_commit: buildCommit(),
        screenshot_path: screenshotPath,
      });
      if (error) throw error;

      setDone(true);
      setMessage('');
      setFile(null);
      await loadReports();
    } catch (err) {
      console.error('Feedback submit failed', err);
      toast.error('That did not send. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setDone(false);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Report an issue or idea</DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="space-y-4">
            <p className="text-[15px] text-foreground">Got it. We read every one.</p>
            <Button variant="secondary" className="min-h-[44px] w-full" onClick={() => setDone(false)}>
              Send another
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={cn(
                    'min-h-[44px] rounded-lg border px-3 text-[13px] font-semibold transition-colors',
                    type === t.value
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What happened, or what would make this better?"
              rows={5}
            />

            <div className="flex items-center gap-2">
              <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border border-border px-3 text-[13px] text-muted-foreground hover:text-foreground">
                <ImagePlus className="h-4 w-4" />
                {file ? 'Screenshot added' : 'Add a screenshot'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
              {file && (
                <button
                  onClick={() => setFile(null)}
                  aria-label="Remove screenshot"
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <Button onClick={submit} disabled={saving || !message.trim()} className="min-h-[44px] w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
            </Button>
          </div>
        )}

        <div className="mt-2 space-y-2 border-t border-border pt-4">
          <p className="eyebrow">My reports</p>
          {reports.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">Nothing sent yet.</p>
          ) : (
            reports.map((r) => (
              <div key={r.id} className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {TYPES.find((t) => t.value === r.feedback_type)?.label ?? 'Other'}
                  </span>
                  <span className="text-[11px] font-semibold text-primary">
                    {STATUS_LABELS[r.status] ?? 'Open'}
                  </span>
                </div>
                <p className="mt-1 text-[13px] text-foreground">{r.message}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {r.created_at ? format(new Date(r.created_at), 'MMM d') : ''}
                </p>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
