import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { PitchApprovalWithDetails } from '@/hooks/usePitchApprovals';
import { format } from 'date-fns';

interface PitchReviewModalProps {
  request: PitchApprovalWithDetails | null;
  open: boolean;
  onClose: () => void;
  onAction: () => void;
}

// Checklists per lesson type
const CHECKLISTS: Record<string, string[]> = {
  'fresh account': [
    'Door approach / Introduction',
    'Permission to enter',
    'Bug confession / Discovery',
    'Value stack',
    'Price presentation',
    'Close / Trial close',
  ],
  'switchover': [
    'Introduction & rapport',
    'Current provider discovery',
    'Pain points identified',
    'Value comparison',
    'Price presentation',
    'Close / Transition',
  ],
  'body language': [
    'Confident posture',
    'Eye contact',
    'Hand gestures',
    'Mirror homeowner energy',
  ],
  'objection': [
    'Price objection resolution',
    'Think-it-over objection',
    'Competitor comparison',
    'Timing objection',
  ],
  'closing': [
    'Hard close example',
    'Assignment close example',
    'Soft close example',
    'Option close example',
  ],
};

function getChecklist(title: string): string[] {
  const lower = title.toLowerCase();
  for (const [key, items] of Object.entries(CHECKLISTS)) {
    if (lower.includes(key)) return items;
  }
  return ['Outline followed', 'Natural delivery', 'Key points covered'];
}

export function PitchReviewModal({ request, open, onClose, onAction }: PitchReviewModalProps) {
  const { user, profile } = useAuth();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);

  const checklist = request ? getChecklist(request.lesson_title || '') : [];

  useEffect(() => {
    if (!request?.video_url || !open) { setVideoUrl(null); return; }

    supabase.storage
      .from('pitch-approval-videos')
      .createSignedUrl(request.video_url, 3600)
      .then(({ data }) => {
        if (data?.signedUrl) setVideoUrl(data.signedUrl);
      });

    setCheckedItems(new Set());
    setFeedback('');
    setShowRejectForm(false);
  }, [request?.id, open]);

  const handleApprove = async () => {
    if (!request || !user) return;
    setIsSubmitting(true);

    try {
      // Update request
      const { error: updateError } = await supabase
        .from('pitch_approval_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          manager_feedback: feedback || null,
        })
        .eq('id', request.id);

      if (updateError) {
        console.error('Pitch approve error:', updateError);
        toast.error('Failed to approve: ' + updateError.message);
        return;
      }

      // Notify rookie (non-blocking)
      const { error: notifError } = await supabase.from('user_notifications').insert({
        user_id: request.user_id,
        title: `✅ ${profile?.full_name || 'Manager'} approved your ${request.lesson_title} pitch!`,
        message: feedback
          ? `"${feedback}" — You can now continue to the next module.`
          : 'You can now continue to the next module.',
        link: '/app/training',
      });
      if (notifError) console.error('Notification insert error:', notifError);

      // Award 25 leaderboard points via DB function
      const { error: rpcError } = await supabase.rpc('award_training_points', {
        _user_id: request.user_id,
        _points: 25,
      });
      if (rpcError) console.error('Points award error:', rpcError);

      toast.success('Pitch approved!');
      onAction();
      onClose();
    } catch (err) {
      toast.error('Failed to approve');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!request || !user || !feedback.trim()) {
      toast.error('Please provide feedback for the rep');
      return;
    }
    setIsSubmitting(true);

    try {
      const { error: updateError } = await supabase
        .from('pitch_approval_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          manager_feedback: feedback,
        })
        .eq('id', request.id);

      if (updateError) {
        console.error('Pitch reject error:', updateError);
        toast.error('Failed to reject: ' + updateError.message);
        return;
      }

      // Notify rookie (non-blocking)
      const { error: notifError2 } = await supabase.from('user_notifications').insert({
        user_id: request.user_id,
        title: `❌ ${profile?.full_name || 'Manager'} requested a re-record of your ${request.lesson_title} pitch`,
        message: `Feedback: "${feedback}"`,
        link: `/app/training`,
      });
      if (notifError2) console.error('Notification insert error:', notifError2);

      toast.success('Feedback sent — rep notified');
      onAction();
      onClose();
    } catch (err) {
      toast.error('Failed to reject');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg">
            Pitch Review — {request.user_name}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {request.lesson_title} • Attempt #{request.attempt_number} •{' '}
            {format(new Date(request.submitted_at), 'MMM d, h:mm a')}
          </p>
        </DialogHeader>

        {/* Side-by-side on desktop, stacked on mobile */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* LEFT: Video Player */}
          <div className="md:w-[60%] flex-shrink-0">
            <div className="rounded-lg overflow-hidden bg-black aspect-video sticky top-0">
              {videoUrl ? (
                <video src={videoUrl} controls className="w-full h-full" playsInline />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Checklist + Feedback */}
          <div className="md:w-[40%] flex flex-col gap-4 md:max-h-[60vh] md:overflow-y-auto">
            {/* Checklist */}
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-foreground uppercase tracking-wide">
                ✅ Outline Checklist
              </p>
              <p className="text-[10px] text-muted-foreground">Check off as you watch:</p>
              {checklist.map((item, i) => (
                <label
                  key={i}
                  className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/30 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={checkedItems.has(i)}
                    onCheckedChange={(checked) => {
                      setCheckedItems(prev => {
                        const next = new Set(prev);
                        checked ? next.add(i) : next.delete(i);
                        return next;
                      });
                    }}
                  />
                  <span className="text-sm text-foreground">{item}</span>
                </label>
              ))}
            </div>

            {/* Feedback */}
            {showRejectForm ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground">Feedback for {request.user_name?.split(' ')[0]}:</p>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Explain what needs improvement..."
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowRejectForm(false)} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                    disabled={isSubmitting || !feedback.trim()}
                    className="gap-1.5"
                  >
                    {isSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
                    Send Feedback & Request Re-record
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Manager feedback (optional)..."
                  rows={2}
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleApprove}
                    disabled={isSubmitting}
                    className="flex-1 gap-1.5 bg-green-500 hover:bg-green-600"
                  >
                    {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setShowRejectForm(true)}
                    disabled={isSubmitting}
                    className="flex-1 gap-1.5"
                  >
                    <XCircle className="w-4 h-4" />
                    Re-record
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
