import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SummitLoader } from '@/components/shared/SummitLoader';
import { getReachableRookieTrainingItems, getCompletedTrainingCounts } from '@/lib/trainingProgressCalc';
import { useDownline } from '@/hooks/useDownline';
import { cn } from '@/lib/utils';
import { GraduationCap, ClipboardCheck, MessageSquare } from 'lucide-react';

function getMondayWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function PulseTab({ managerName, userId }: { managerName: string; userId: string }) {
  const { downline, isLoading: downlineLoading } = useDownline(userId, managerName);
  const [stats, setStats] = useState({ trainingPct: 0, checklistPct: 0, oneOnOnePct: 0, totalReps: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (downlineLoading) return;
    const reps = downline.filter(m => m.role !== 'manager' && m.role !== 'admin');
    const repIds = reps.map(r => r.user_id);
    if (repIds.length === 0) { setLoading(false); return; }

    const fetchData = async () => {
      const items = await getReachableRookieTrainingItems();
      const completedCounts = await getCompletedTrainingCounts(repIds, items);
      let avgTraining = 0;
      if (items.totalCount > 0) {
        let total = 0;
        repIds.forEach(uid => { total += Math.round(((completedCounts.get(uid) || 0) / items.totalCount) * 100); });
        avgTraining = Math.round(total / repIds.length);
      }

      const { data: bp } = await supabase.from('bootcamp_progress').select('user_id, bootcamp_completed').in('user_id', repIds);
      const completedChecklist = (bp || []).filter(b => b.bootcamp_completed).length;
      const checklistPct = repIds.length > 0 ? Math.round((completedChecklist / repIds.length) * 100) : 0;

      const weekStart = getMondayWeekStart();
      const { count: completedCount } = await supabase
        .from('scheduling_requests')
        .select('*', { count: 'exact', head: true })
        .in('recipient_id', repIds)
        .eq('status', 'completed')
        .gte('completed_at', weekStart.toISOString());
      const oneOnOnePct = repIds.length > 0 ? Math.round(((completedCount || 0) / repIds.length) * 100) : 0;

      setStats({ trainingPct: avgTraining, checklistPct, oneOnOnePct, totalReps: repIds.length });
      setLoading(false);
    };
    fetchData();
  }, [downline, downlineLoading]);

  const metrics = [
    { icon: GraduationCap, label: 'Team Training', value: `${stats.trainingPct}%`, color: stats.trainingPct >= 75 ? 'text-success' : stats.trainingPct >= 50 ? 'text-yellow-400' : 'text-destructive' },
    { icon: ClipboardCheck, label: 'Summer Checklist', value: `${stats.checklistPct}%`, color: stats.checklistPct >= 75 ? 'text-success' : 'text-yellow-400' },
    { icon: MessageSquare, label: '1:1 Completion', value: `${stats.oneOnOnePct}%`, color: stats.oneOnOnePct >= 75 ? 'text-success' : 'text-yellow-400' },
  ];

  if (loading || downlineLoading) return <SummitLoader label="Loading pulse..." />;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {metrics.map(m => (
        <div key={m.label} className="bg-card rounded-xl border border-border/50 p-5 text-center">
          <m.icon className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
          <p className={cn("text-3xl font-black tabular-nums", m.color)}>{m.value}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-1">{m.label}</p>
        </div>
      ))}
    </div>
  );
}
