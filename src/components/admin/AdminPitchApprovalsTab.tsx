import { useState, useMemo } from 'react';
import { useManagerPitchApprovals, PitchApprovalWithDetails } from '@/hooks/usePitchApprovals';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Mic, Clock, CheckCircle2, XCircle, Loader2, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { PitchReviewModal } from '@/components/training/PitchReviewModal';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

export default function AdminPitchApprovalsTab() {
  const { requests, isLoading, refresh } = useManagerPitchApprovals();
  const [reviewingRequest, setReviewingRequest] = useState<PitchApprovalWithDetails | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const pending = useMemo(() => requests.filter(r => r.status === 'pending'), [requests]);
  const history = useMemo(() => requests.filter(r => r.status !== 'pending'), [requests]);

  const displayList = showHistory ? history : pending;

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Pitch Approvals</h3>
          {pending.length > 0 && (
            <span className="bg-destructive text-destructive-foreground text-[9px] px-1.5 py-0.5 rounded-full font-bold">
              {pending.length}
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-7"
          onClick={() => setShowHistory(!showHistory)}
        >
          {showHistory ? 'Show Pending' : 'Show History'}
        </Button>
      </div>

      {displayList.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CheckCircle2 className="w-8 h-8 mx-auto mb-3 text-primary/40" />
          <p className="font-medium">{showHistory ? 'No review history' : 'No pending pitches'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayList.map((req) => {
            const hoursAgo = (Date.now() - new Date(req.submitted_at || req.created_at).getTime()) / (1000 * 60 * 60);
            const isOverdue = req.status === 'pending' && hoursAgo >= 24;

            return (
              <div
                key={req.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer',
                  isOverdue
                    ? 'border-destructive/30 bg-destructive/5 hover:bg-destructive/10'
                    : 'border-border/30 bg-card/40 hover:bg-card/60'
                )}
                onClick={() => setReviewingRequest(req)}
              >
                <UserAvatar avatarUrl={req.user_avatar} fullName={req.user_name || 'Unknown'} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{req.user_name || 'Unknown'}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{req.lesson_title || 'Pitch'}</p>
                </div>
                <div className="flex items-center gap-2">
                  {req.status === 'pending' && (
                    <span className={cn('text-[10px]', isOverdue ? 'text-destructive' : 'text-muted-foreground')}>
                      <Clock className="w-3 h-3 inline mr-0.5" />
                      {formatDistanceToNow(new Date(req.submitted_at || req.created_at), { addSuffix: true })}
                    </span>
                  )}
                  {req.status === 'approved' && <CheckCircle2 className="w-4 h-4 text-primary" />}
                  {req.status === 'rejected' && <XCircle className="w-4 h-4 text-destructive" />}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {reviewingRequest && (
        <PitchReviewModal
          request={reviewingRequest}
          open={!!reviewingRequest}
          onClose={() => setReviewingRequest(null)}
          onAction={() => {
            setReviewingRequest(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
