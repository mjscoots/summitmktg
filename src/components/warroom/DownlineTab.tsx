import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SummitLoader } from '@/components/shared/SummitLoader';
import { MemberProfileModal } from '@/components/team/MemberProfileModal';
import { Progress } from '@/components/ui/progress';
import { getTeamColor } from '@/lib/teamColors';
import { getReachableRookieTrainingItems, getCompletedTrainingCounts } from '@/lib/trainingProgressCalc';
import { useDownline } from '@/hooks/useDownline';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, AlertTriangle, Copy, Check } from 'lucide-react';
import type { TeamMember } from '@/lib/hierarchyUtils';

interface TeamMemberRow {
  user_id: string;
  full_name: string;
  last_active_at: string | null;
  trainingPct: number;
  checklistDone: boolean;
  teamName: string | null;
  pillarSlug: string | null;
}

function getDaysInactive(lastActiveAt: string | null): number {
  if (!lastActiveAt) return 999;
  return Math.floor((Date.now() - new Date(lastActiveAt).getTime()) / 86400000);
}

export function DownlineTab({ managerName, userId }: { managerName: string; userId: string }) {
  const { downline, isLoading: downlineLoading } = useDownline(userId, managerName);
  const [members, setMembers] = useState<TeamMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<'name' | 'training' | 'checklist' | 'activity'>('training');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (downlineLoading) return;
    const reps = downline.filter(m => m.role !== 'manager' && m.role !== 'admin');
    const repIds = reps.map(r => r.user_id);
    if (repIds.length === 0) { setLoading(false); return; }

    const fetchData = async () => {
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, last_active_at, team_id, pillar_slug').in('user_id', repIds);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      const teamIds = [...new Set((profiles || []).map(p => p.team_id).filter(Boolean))] as string[];
      const { data: teamsData } = teamIds.length > 0 ? await supabase.from('teams').select('id, name').in('id', teamIds) : { data: [] };
      const teamMap = new Map((teamsData || []).map(t => [t.id, t.name]));

      const items = await getReachableRookieTrainingItems();
      const completedCounts = await getCompletedTrainingCounts(repIds, items);

      const { data: bp } = await supabase.from('bootcamp_progress').select('user_id, bootcamp_completed').in('user_id', repIds);
      const checkMap = new Map((bp || []).map(b => [b.user_id, b.bootcamp_completed]));

      const rows: TeamMemberRow[] = repIds.map(uid => {
        const p = profileMap.get(uid);
        return {
          user_id: uid,
          full_name: p?.full_name || 'Unknown',
          last_active_at: p?.last_active_at || null,
          trainingPct: items.totalCount > 0 ? Math.round(((completedCounts.get(uid) || 0) / items.totalCount) * 100) : 0,
          checklistDone: checkMap.get(uid) || false,
          teamName: p?.team_id ? teamMap.get(p.team_id) || null : null,
          pillarSlug: p?.pillar_slug || null,
        };
      });

      setMembers(rows);
      setLoading(false);
    };
    fetchData();
  }, [downline, downlineLoading]);

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const sorted = useMemo(() => [...members].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'name') cmp = a.full_name.localeCompare(b.full_name);
    else if (sortKey === 'training') cmp = b.trainingPct - a.trainingPct;
    else if (sortKey === 'checklist') cmp = (b.checklistDone ? 1 : 0) - (a.checklistDone ? 1 : 0);
    else if (sortKey === 'activity') cmp = (new Date(b.last_active_at || 0).getTime()) - (new Date(a.last_active_at || 0).getTime());
    return sortAsc ? -cmp : cmp;
  }), [members, sortKey, sortAsc]);

  const headers: { key: typeof sortKey; label: string }[] = [
    { key: 'name', label: 'Name' },
    { key: 'training', label: 'Training %' },
    { key: 'checklist', label: 'Checklist' },
    { key: 'activity', label: 'Last Active' },
  ];

  if (loading || downlineLoading) return <SummitLoader label="Loading downline..." />;

  const toTeamMember = (row: TeamMemberRow): TeamMember => ({
    id: row.user_id, user_id: row.user_id, full_name: row.full_name, email: '', status: null, experience: null, direct_manager: null, last_active_at: row.last_active_at,
  });

  const inactiveRookies = members.filter(m => getDaysInactive(m.last_active_at) >= 3);

  const handleCopyInactive = () => {
    const byTeam = new Map<string, typeof inactiveRookies>();
    for (const m of inactiveRookies) {
      const team = m.teamName || 'No Team';
      if (!byTeam.has(team)) byTeam.set(team, []);
      byTeam.get(team)!.push(m);
    }
    const sortedTeams = [...byTeam.entries()].sort(([a], [b]) => a.localeCompare(b));
    const lines: string[] = [`Inactive Rookies (3+ days) — ${new Date().toLocaleDateString()}`, ''];
    for (const [team, reps] of sortedTeams) {
      lines.push(team);
      for (const r of reps.sort((a, b) => a.full_name.localeCompare(b.full_name))) {
        const days = getDaysInactive(r.last_active_at);
        lines.push(`  • ${r.full_name} — ${days === 999 ? 'Never active' : `${days} days`}`);
      }
      lines.push('');
    }
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {inactiveRookies.length > 0 && (
        <div className="flex justify-end mb-3">
          <button onClick={handleCopyInactive} className={cn("flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all", copied ? "bg-success/10 border-success/30 text-success" : "bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20")}>
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : `Copy Inactive (${inactiveRookies.length})`}
          </button>
        </div>
      )}
      <div className="bg-card rounded-xl border border-border/50 overflow-x-auto">
        <div className="grid grid-cols-4 gap-2 px-4 py-2.5 border-b border-border/30 bg-muted/30 min-w-[500px]">
          {headers.map(h => (
            <button key={h.key} onClick={() => handleSort(h.key)} className={cn("text-[10px] font-bold uppercase tracking-wider text-left transition-colors flex items-center gap-1", sortKey === h.key ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
              {h.label}
              {sortKey === h.key && (sortAsc ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />)}
            </button>
          ))}
        </div>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No reps found</p>
        ) : sorted.map(m => {
          const daysInactive = getDaysInactive(m.last_active_at);
          const isInactive3Plus = daysInactive >= 3;
          const teamColor = getTeamColor(m.teamName);
          return (
            <div key={m.user_id} className={cn("grid grid-cols-4 gap-2 px-4 py-2.5 border-b border-border/10 hover:bg-muted/20 transition-colors items-center min-w-[500px]", isInactive3Plus && "bg-destructive/5 border-l-2 border-l-destructive/40")}>
              <button onClick={() => setSelectedMember(toTeamMember(m))} className={cn("text-sm font-bold hover:underline truncate text-left", teamColor.text)}>{m.full_name}</button>
              <div className="flex items-center gap-2">
                <Progress value={m.trainingPct} className="h-1.5 flex-1 bg-muted max-w-[80px]" />
                <span className={cn("text-xs font-bold tabular-nums", m.trainingPct >= 75 ? "text-success" : m.trainingPct >= 50 ? "text-yellow-400" : "text-destructive")}>{m.trainingPct}%</span>
              </div>
              <span className={cn("text-xs font-semibold", m.checklistDone ? "text-success" : "text-destructive")}>{m.checklistDone ? '✓ Done' : '✗ Incomplete'}</span>
              <span className={cn("text-[11px]", isInactive3Plus ? "text-destructive font-semibold" : "text-muted-foreground")}>
                {m.last_active_at ? (() => {
                  if (daysInactive === 0) return 'Today';
                  if (daysInactive === 1) return 'Yesterday';
                  return `${daysInactive} days ago`;
                })() : 'Never'}
                {isInactive3Plus && <AlertTriangle className="w-3 h-3 inline ml-1 text-destructive" />}
              </span>
            </div>
          );
        })}
      </div>
      <MemberProfileModal member={selectedMember} open={!!selectedMember} onClose={() => setSelectedMember(null)} roster={[]} />
    </>
  );
}
