import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatTimeMinutes } from '@/hooks/useActivityTracking';
import { UserAvatar } from '@/components/shared/UserAvatar';
import type { TeamMember } from '@/lib/hierarchyUtils';
import { getDisplayName } from '@/lib/hierarchyUtils';

interface TeamActivityTableProps {
  roster: TeamMember[];
  dailyTimeMap: Map<string, { days: { minutes: number }[]; totalMinutes: number }>;
  onMemberClick?: (member: TeamMember) => void;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function TeamActivityTable({ roster, dailyTimeMap, onMemberClick }: TeamActivityTableProps) {
  // Filter out NLC members and sort by total time descending
  const sortedMembers = useMemo(() => {
    return roster
      .filter(m => m.status !== 'nlc' && !m.isNLC)
      .slice()
      .sort((a, b) => {
        const aTime = dailyTimeMap.get(a.user_id)?.totalMinutes ?? 0;
        const bTime = dailyTimeMap.get(b.user_id)?.totalMinutes ?? 0;
        return bTime - aTime;
      });
  }, [roster, dailyTimeMap]);

  if (sortedMembers.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-border/50 p-4">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">
        Team Activity — Training This Week
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground">Name</th>
              <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Total</th>
              {DAY_LABELS.map(d => (
                <th key={d} className="text-center py-2 px-1 text-xs font-medium text-muted-foreground w-8">{d}</th>
              ))}
              <th className="text-center py-2 pl-3 text-xs font-medium text-muted-foreground">Days</th>
            </tr>
          </thead>
          <tbody>
            {sortedMembers.map(member => {
              const data = dailyTimeMap.get(member.user_id);
              const days = data?.days ?? Array(7).fill({ minutes: 0 });
              const total = data?.totalMinutes ?? 0;
              const activeDays = days.filter(d => d.minutes > 0).length;
              const maxMin = Math.max(...days.map(d => d.minutes), 1);

              return (
                <tr
                  key={member.id}
                  className="border-b border-border/30 last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => onMemberClick?.(member)}
                >
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      {(member as any).avatar_url ? (
                        <UserAvatar
                          avatarUrl={(member as any).avatar_url}
                          fullName={member.full_name}
                          size="sm"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-medium text-muted-foreground">
                            {getDisplayName(member.full_name).charAt(0)}
                          </span>
                        </div>
                      )}
                      <span className="font-medium text-foreground truncate max-w-[140px]">
                        {getDisplayName(member.full_name)}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap tabular-nums">
                    <span className={cn(
                      "font-medium",
                      total > 0 ? "text-foreground" : "text-muted-foreground/50"
                    )}>
                      {total > 0 ? formatTimeMinutes(total) : '0h 0m'}
                    </span>
                  </td>
                  {days.map((day, i) => {
                    const pct = day.minutes > 0 ? Math.max((day.minutes / maxMin) * 100, 25) : 0;
                    return (
                      <td key={i} className="py-2.5 px-1">
                        <div className="flex justify-center">
                          <div
                            className={cn(
                              "w-5 rounded-sm transition-all",
                              day.minutes > 0 ? "bg-primary" : "bg-muted-foreground/15"
                            )}
                            style={{ height: day.minutes > 0 ? `${Math.max((pct / 100) * 20, 6)}px` : '4px' }}
                            title={`${DAY_LABELS[i]}: ${day.minutes > 0 ? formatTimeMinutes(day.minutes) : '—'}`}
                          />
                        </div>
                      </td>
                    );
                  })}
                  <td className="py-2.5 pl-3 text-center">
                    <span className={cn(
                      "text-xs font-medium tabular-nums",
                      activeDays >= 5 ? "text-success" :
                      activeDays >= 3 ? "text-primary" :
                      activeDays > 0 ? "text-warning" :
                      "text-muted-foreground/50"
                    )}>
                      {activeDays}/7
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
