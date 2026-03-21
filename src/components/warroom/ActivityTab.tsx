import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SummitLoader } from '@/components/shared/SummitLoader';
import { MemberProfileModal } from '@/components/team/MemberProfileModal';
import { getTeamColor } from '@/lib/teamColors';
import { useDownline } from '@/hooks/useDownline';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, AlertTriangle } from 'lucide-react';
import type { TeamMember } from '@/lib/hierarchyUtils';

interface TimeEntry {
  user_id: string;
  full_name: string;
  totalMinutes: number;
  weeklyMinutes: number;
  requiredMinutes: number;
  status: 'acceptable' | 'below';
  teamName: string | null;
}

function getMondayWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function ActivityTab({ managerName, userId }: { managerName: string; userId: string }) {
  const { downline, isLoading: downlineLoading } = useDownline(userId, managerName);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [requiredMinutes] = useState(120);
  const [sortKey, setSortKey] = useState<'name' | 'total' | 'weekly' | 'status'>('total');
  const [sortAsc, setSortAsc] = useState(false);
  const navigate = useNavigate();
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  useEffect(() => {
    if (downlineLoading) return;
    const reps = downline.filter(m => m.role !== 'manager' && m.role !== 'admin');
    const repIds = reps.map(r => r.user_id);
    if (repIds.length === 0) { setLoading(false); return; }

    const fetchData = async () => {
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, team_id').in('user_id', repIds);
      const nameMap = new Map((profiles || []).map(p => [p.user_id, p.full_name]));
      const teamIds = [...new Set((profiles || []).map(p => p.team_id).filter(Boolean))] as string[];
      const { data: teamsData } = teamIds.length > 0 ? await supabase.from('teams').select('id, name').in('id', teamIds) : { data: [] };
      const teamMap = new Map((teamsData || []).map(t => [t.id, t.name]));
      const profileTeamMap = new Map((profiles || []).map(p => [p.user_id, p.team_id ? teamMap.get(p.team_id) || null : null]));

      const weekStart = getMondayWeekStart();
      const { data: timeData } = await supabase.from('daily_training_time').select('user_id, total_minutes, date').in('user_id', repIds);

      const totalMap = new Map<string, number>();
      const weeklyMap = new Map<string, number>();
      (timeData || []).forEach(t => {
        totalMap.set(t.user_id, (totalMap.get(t.user_id) || 0) + t.total_minutes);
        if (new Date(t.date + 'T00:00:00') >= weekStart) weeklyMap.set(t.user_id, (weeklyMap.get(t.user_id) || 0) + t.total_minutes);
      });

      const rows: TimeEntry[] = repIds.map(uid => {
        const weekly = weeklyMap.get(uid) || 0;
        return { user_id: uid, full_name: nameMap.get(uid) || 'Unknown', totalMinutes: totalMap.get(uid) || 0, weeklyMinutes: weekly, requiredMinutes, status: weekly >= requiredMinutes ? 'acceptable' : 'below', teamName: profileTeamMap.get(uid) || null };
      });
      rows.sort((a, b) => b.totalMinutes - a.totalMinutes);
      setEntries(rows);
      setLoading(false);
    };
    fetchData();
  }, [downline, downlineLoading, requiredMinutes]);

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const sortedEntries = useMemo(() => [...entries].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'name') cmp = a.full_name.localeCompare(b.full_name);
    else if (sortKey === 'total') cmp = b.totalMinutes - a.totalMinutes;
    else if (sortKey === 'weekly') cmp = b.weeklyMinutes - a.weeklyMinutes;
    else if (sortKey === 'status') cmp = (a.status === 'below' ? 1 : 0) - (b.status === 'below' ? 1 : 0);
    return sortAsc ? -cmp : cmp;
  }), [entries, sortKey, sortAsc]);

  const formatTime = (mins: number) => { const h = Math.floor(mins / 60); const m = mins % 60; return h > 0 ? `${h}h ${m}m` : `${m}m`; };

  const toTeamMember = (row: TimeEntry): TeamMember => ({ id: row.user_id, user_id: row.user_id, full_name: row.full_name, email: '', status: null, experience: null, direct_manager: null });

  if (loading || downlineLoading) return <SummitLoader label="Loading activity..." />;

  const bottomThree = sortedEntries.filter(e => e.status === 'below').slice(-3).map(e => e.user_id);

  const activityHeaders: { key: typeof sortKey; label: string }[] = [
    { key: 'name', label: 'Name' }, { key: 'total', label: 'Total Time' }, { key: 'weekly', label: 'This Week' }, { key: 'status', label: 'Status' },
  ];

  return (
    <div>
      <div className="bg-card rounded-xl border border-border/50 overflow-x-auto">
        <div className="grid grid-cols-4 gap-2 px-4 py-2.5 border-b border-border/30 bg-muted/30 min-w-[500px]">
          {activityHeaders.map(h => (
            <button key={h.key} onClick={() => handleSort(h.key)} className={cn("text-[10px] font-bold uppercase tracking-wider text-left transition-colors flex items-center gap-1", sortKey === h.key ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
              {h.label}
              {sortKey === h.key && (sortAsc ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />)}
            </button>
          ))}
        </div>
        {sortedEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
        ) : sortedEntries.map(e => {
          const isBottom = bottomThree.includes(e.user_id);
          const teamColor = getTeamColor(e.teamName);
          return (
            <div key={e.user_id} className={cn("grid grid-cols-4 gap-2 px-4 py-2.5 border-b border-border/10 items-center transition-colors min-w-[500px]", isBottom ? "bg-destructive/5 border-l-2 border-l-destructive/50" : "hover:bg-muted/20")}>
              <button onClick={() => setSelectedMember(toTeamMember(e))} className={cn("text-sm font-bold hover:underline truncate text-left", teamColor.text)}>{e.full_name}</button>
              <span className="text-xs font-bold tabular-nums text-foreground">{formatTime(e.totalMinutes)}</span>
              <span className={cn("text-xs font-bold tabular-nums", e.status === 'acceptable' ? "text-success" : "text-destructive")}>{formatTime(e.weeklyMinutes)}</span>
              <span className={cn("text-[10px] font-bold uppercase tracking-wider", e.status === 'acceptable' ? "text-success" : "text-destructive")}>
                {e.status === 'acceptable' ? 'Acceptable' : 'Below Standard'}
                {isBottom && <AlertTriangle className="w-3 h-3 inline ml-1" />}
              </span>
            </div>
          );
        })}
      </div>
      <button onClick={() => navigate('/app/leaderboard')} className="mt-4 w-full text-center text-xs font-semibold text-primary/70 hover:text-primary py-2 transition-colors">
        View Full Leaderboard →
      </button>
      <MemberProfileModal member={selectedMember} open={!!selectedMember} onClose={() => setSelectedMember(null)} roster={[]} />
    </div>
  );
}
