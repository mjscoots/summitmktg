import { useState } from 'react';
import { Mic, Video, Clock, CheckCircle2, XCircle, Eye, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PitchApprovalRequest } from '@/hooks/usePitchApprovals';
import { PitchRecordingModal } from './PitchRecordingModal';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface PitchApprovalCardProps {
  lessonId: string;
  lessonTitle: string;
  pitchRequest: PitchApprovalRequest | null;
  requiresPitch: boolean;
  lessonCompleted: boolean;
  managerName?: string;
  isRookieCourse?: boolean;
  onRefresh: () => void;
}

// Per-lesson requirements
const PITCH_REQUIREMENTS: Record<string, string[]> = {
  'fresh account': [
    'Focus on outline order, not word-for-word',
    'Speak naturally — no reading allowed',
    'Hit all main points in sequence',
  ],
  'switchover': [
    'Focus on outline order, not word-for-word',
    'Speak naturally — no reading allowed',
    'Hit all main points in sequence',
  ],
  'body language': [
    'Demonstrate proper body language techniques',
    'Show confident posture and eye contact',
    'Mirror homeowner energy',
  ],
  'objection': [
    'Roleplay one resolution per objection type',
    'Show price, think-it-over, competitor, and timing objections',
    'Demonstrate natural transitions',
  ],
  'closing': [
    'Record examples of each close type',
    'Hard close, assignment close, soft close, option close',
    'Show natural flow from pitch to close',
  ],
};

function getRequirements(title: string): string[] {
  const lower = title.toLowerCase();
  for (const [key, reqs] of Object.entries(PITCH_REQUIREMENTS)) {
    if (lower.includes(key)) return reqs;
  }
  return ['Focus on outline order, not word-for-word', 'Speak naturally — no reading allowed', 'Hit all main points in sequence'];
}

export function PitchApprovalCard({
  lessonId,
  lessonTitle,
  pitchRequest,
  requiresPitch,
  lessonCompleted,
  managerName,
  isRookieCourse = true,
  onRefresh,
}: PitchApprovalCardProps) {
  const [showRecording, setShowRecording] = useState(false);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);

  const status = pitchRequest?.status;
  const requirements = getRequirements(lessonTitle);

  if (!requiresPitch) return null;

  // Before quiz completion: show heads-up with option to record early
  if (!lessonCompleted) {
    return (
      <>
        <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 mt-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Mic className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-sm text-amber-600">🎤 PITCH RECORDING REQUIRED</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                You'll need to record yourself delivering this pitch and get manager approval before moving on. You can record now or after passing the quiz.
              </p>
              <div className="mt-3 space-y-1.5">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Requirements:</p>
                {requirements.map((req, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                    <span>{req}</span>
                  </div>
                ))}
              </div>
              {/* Show record button if no pitch submitted or rejected */}
              {(!pitchRequest || status === 'rejected') && (
                <Button
                  onClick={() => setShowRecording(true)}
                  className={cn(
                    "mt-3 gap-2 font-semibold w-full",
                    isRookieCourse ? "bg-primary hover:bg-primary" : "bg-blue-500 hover:bg-blue-600"
                  )}
                  size="sm"
                >
                  <Mic className="w-4 h-4" />
                  {status === 'rejected' ? 'Re-record Your Pitch' : 'Record Your Pitch Now'}
                </Button>
              )}
              {status === 'pending' && (
                <div className="mt-3 p-2 rounded-lg bg-primary/10 border border-primary/20 text-center">
                  <p className="text-xs font-semibold text-amber-600">⏳ Pitch Submitted — Awaiting Approval</p>
                </div>
              )}
              {status === 'approved' && (
                <div className="mt-3 p-2 rounded-lg bg-primary/10 border border-primary/20 text-center">
                  <p className="text-xs font-semibold text-primary">✅ Pitch Approved</p>
                </div>
              )}
            </div>
          </div>
        </div>
        <PitchRecordingModal
          open={showRecording}
          onClose={() => setShowRecording(false)}
          lessonId={lessonId}
          lessonTitle={lessonTitle}
          attemptNumber={(pitchRequest?.attempt_number || 0) + 1}
          onSubmitted={onRefresh}
        />
      </>
    );
  }

  // Generate signed URL for viewing submission
  const handleWatchSubmission = async () => {
    if (!pitchRequest?.video_url) return;
    const { data } = await supabase.storage
      .from('pitch-approval-videos')
      .createSignedUrl(pitchRequest.video_url, 3600);
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  };

  // No submission yet — show recording prompt
  if (!pitchRequest || status === 'rejected') {
    return (
      <>
        <div className={cn(
          "rounded-xl border-2 border-dashed p-5 mt-4",
          status === 'rejected'
            ? "border-destructive/40 bg-destructive/5"
            : "border-primary/40 bg-primary/5"
        )}>
          <div className="flex items-start gap-3 mb-4">
            <div className={cn(
              "p-2 rounded-lg",
              status === 'rejected' ? "bg-destructive/10" : "bg-primary/10"
            )}>
              <Mic className={cn("w-5 h-5", status === 'rejected' ? "text-destructive" : "text-primary")} />
            </div>
            <div>
              <h3 className={cn(
                "font-bold text-sm",
                status === 'rejected' ? "text-destructive" : "text-amber-600"
              )}>
                {status === 'rejected' ? '❌ PITCH NEEDS IMPROVEMENT' : '🎤 PITCH APPROVAL REQUIRED'}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {status === 'rejected'
                  ? 'Your manager reviewed your pitch and provided feedback.'
                  : 'Before moving to the next module, record yourself delivering this pitch and get manager approval.'}
              </p>
            </div>
          </div>

          {/* Rejection feedback */}
          {status === 'rejected' && pitchRequest?.manager_feedback && (
            <div className="mb-4 p-3 rounded-lg bg-card border border-border">
              <p className="text-xs text-muted-foreground mb-1">
                {managerName || 'Manager'} says:
              </p>
              <p className="text-sm text-foreground italic">"{pitchRequest.manager_feedback}"</p>
              {pitchRequest.video_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-xs gap-1"
                  onClick={handleWatchSubmission}
                >
                  <Eye className="w-3 h-3" />
                  Watch Attempt #{pitchRequest.attempt_number}
                </Button>
              )}
            </div>
          )}

          {/* Requirements */}
          {status !== 'rejected' && (
            <div className="mb-4 space-y-1.5">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Requirements:</p>
              {requirements.map((req, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                  <span>{req}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={() => setShowRecording(true)}
              className={cn(
                "gap-2 font-semibold flex-1",
                isRookieCourse ? "bg-primary hover:bg-primary" : "bg-blue-500 hover:bg-blue-600"
              )}
            >
              <Mic className="w-4 h-4" />
              {status === 'rejected' ? 'Record New Attempt' : 'Record Your Pitch'}
            </Button>
          </div>
        </div>

        <PitchRecordingModal
          open={showRecording}
          onClose={() => setShowRecording(false)}
          lessonId={lessonId}
          lessonTitle={lessonTitle}
          attemptNumber={(pitchRequest?.attempt_number || 0) + 1}
          onSubmitted={onRefresh}
        />
      </>
    );
  }

  // Pending approval
  if (status === 'pending') {
    return (
      <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5 mt-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-amber-600">🎤 PITCH SUBMITTED — AWAITING APPROVAL</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your pitch has been sent to {managerName || 'your manager'} for review.
              You'll be notified when it's approved.
            </p>
          </div>
        </div>

        <div className="text-xs text-muted-foreground space-y-1 mb-3">
          <p>Submitted: {format(new Date(pitchRequest.submitted_at), 'MMM d, yyyy h:mm a')}</p>
          <p>Attempt: #{pitchRequest.attempt_number}</p>
        </div>

        <div className="flex gap-2 mb-3">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleWatchSubmission}>
            <Eye className="w-3 h-3" />
            Watch Your Submission
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setShowRecording(true)}
          >
            <RefreshCw className="w-3 h-3" />
            Re-record
          </Button>
        </div>

        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-xs font-semibold text-amber-600">⚠️ MODULE LOCKED</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            You cannot progress to the next module until your pitch is approved.
            You can still access previous modules, training videos, and the manual.
          </p>
        </div>

        <PitchRecordingModal
          open={showRecording}
          onClose={() => setShowRecording(false)}
          lessonId={lessonId}
          lessonTitle={lessonTitle}
          attemptNumber={pitchRequest.attempt_number + 1}
          onSubmitted={onRefresh}
        />
      </div>
    );
  }

  // Approved
  if (status === 'approved') {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 mt-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-bold text-sm text-primary">✅ PITCH APPROVED</h3>
            <p className="text-xs text-muted-foreground">
              Approved by {managerName || 'manager'} on{' '}
              {pitchRequest.reviewed_at && format(new Date(pitchRequest.reviewed_at), 'MMM d, yyyy')}
            </p>
            {pitchRequest.manager_feedback && (
              <p className="text-xs text-foreground/70 mt-1 italic">"{pitchRequest.manager_feedback}"</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
