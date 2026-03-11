import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { useManagerPitchApprovals, PitchApprovalWithDetails } from '@/hooks/usePitchApprovals';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Mic, Clock, CheckCircle2, XCircle, Loader2, AlertTriangle, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { PitchReviewModal } from '@/components/training/PitchReviewModal';
import { getTeamColor } from '@/lib/teamColors';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function PitchApprovalsPage() {
  const { requests, isLoading, refresh } = useManagerPitchApprovals();
  const [reviewingRequest, setReviewingRequest] = useState<PitchApprovalWithDetails | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [teamFilter, setTeamFilter] = useState<string>('all');

  // Get unique teams from requests
  const teams = useMemo(() => {
    const teamSet = new Map<string, string>();
    requests.forEach(r => {
      if (r.team_name && r.team_id) {
        teamSet.set(r.team_id, r.team_name);
      }
    });
    return Array.from(teamSet.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [requests]);

  // Filter requests by team
  const filtered = useMemo(() => {
    if (teamFilter === 'all') return requests;
    return requests.filter(r => r.team_id === teamFilter);
  }, [requests, teamFilter]);

  const pending = filtered.filter(r => r.status === 'pending');
  const approved = filtered.filter(r => r.status === 'approved');
  const rejected = filtered.filter(r => r.status === 'rejected');

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <Breadcrumbs items={[{ label: 'Pitch Approvals' }]} />

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Mic className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Pitch Approvals</h1>
              <p className="text-sm text-muted-foreground">Review recorded pitches from your reps</p>
            </div>
          </div>

          {/* Team Filter */}
          {teams.length > 1 && (
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger className="w-[180px] bg-card">
                <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="All Teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {teams.map(t => {
                  const tc = getTeamColor(t.name);
                  return (
                    <SelectItem key={t.id} value={t.id}>
                      <span className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", tc.bg)} />
                        {t.name}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-card rounded-lg border border-border p-3 text-center">
            <p className="text-2xl font-bold text-amber-500">{pending.length}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-3 text-center">
            <p className="text-2xl font-bold text-green-500">{approved.length}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-3 text-center">
            <p className="text-2xl font-bold text-destructive">{rejected.length}</p>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </div>
        </div>

        {/* Pending */}
        <div className="mb-6">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wide mb-3">
            Pending ({pending.length})
          </h2>
          {pending.length === 0 ? (
            <div className="bg-card rounded-lg border border-border p-6 text-center text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500/50" />
              <p className="text-sm">No pending approvals — you're caught up! 🎉</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pending.map(req => {
                const isOverdue = new Date(req.submitted_at).getTime() < Date.now() - 24 * 60 * 60 * 1000;
                const tc = getTeamColor(req.team_name);
                return (
                  <div
                    key={req.id}
                    className={cn(
                      "bg-card rounded-lg border p-4 flex items-center gap-3 transition-colors hover:bg-muted/30",
                      isOverdue ? "border-amber-500/40" : "border-border"
                    )}
                    style={{ borderLeftWidth: 3, borderLeftColor: `hsl(${tc.hsl})` }}
                  >
                    <UserAvatar avatarUrl={req.user_avatar} fullName={req.user_name || ''} size="sm" teamName={req.team_name} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">{req.user_name}</p>
                        {req.team_name && (
                          <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", tc.bgBadge, tc.text)}>
                            {req.team_name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{req.lesson_title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(req.submitted_at), { addSuffix: true })}
                        </span>
                        {isOverdue && (
                          <span className="text-[10px] text-amber-500 font-medium flex items-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" /> Needs attention
                          </span>
                        )}
                        {req.attempt_number > 1 && (
                          <span className="text-[10px] text-muted-foreground">Attempt #{req.attempt_number}</span>
                        )}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => setReviewingRequest(req)} className="gap-1.5">
                      Review Now →
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* History */}
        <div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-sm font-bold text-foreground uppercase tracking-wide mb-3 hover:text-primary transition-colors"
          >
            Approved ({approved.length}) {showHistory ? '▾' : '▸'}
          </button>
          {showHistory && (
            <div className="space-y-2">
              {approved.map(req => {
                const tc = getTeamColor(req.team_name);
                return (
                  <div 
                    key={req.id} 
                    className="bg-card rounded-lg border border-border p-3 flex items-center gap-3 opacity-70"
                    style={{ borderLeftWidth: 3, borderLeftColor: `hsl(${tc.hsl})` }}
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <UserAvatar avatarUrl={req.user_avatar} fullName={req.user_name || ''} size="xs" teamName={req.team_name} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-medium text-foreground truncate">{req.user_name} — {req.lesson_title}</p>
                        {req.team_name && (
                          <span className={cn("text-[9px] font-medium px-1 py-0.5 rounded-full", tc.bgBadge, tc.text)}>
                            {req.team_name}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Approved {req.reviewed_at && format(new Date(req.reviewed_at), 'MMM d')} by {req.reviewer_name || 'manager'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Review Modal */}
        <PitchReviewModal
          request={reviewingRequest}
          open={!!reviewingRequest}
          onClose={() => setReviewingRequest(null)}
          onAction={refresh}
        />
      </main>
    </AppLayout>
  );
}
