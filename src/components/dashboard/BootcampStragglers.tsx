import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AlertTriangle, Copy, Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface Straggler {
  full_name: string;
  email: string;
  created_at: string;
  team_name: string | null;
  bootcamp_completed: boolean;
  phase_1_complete: boolean;
  phase_2_complete: boolean;
  phase_3_complete: boolean;
}

export function BootcampStragglers() {
  const { role } = useAuth();
  const [stragglers, setStragglers] = useState<Straggler[]>([]);
  const [deadlineHours, setDeadlineHours] = useState(48);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const isManager = role === 'manager' || role === 'admin';

  useEffect(() => {
    if (!isManager) return;

    const fetch = async () => {
      // Get deadline setting
      const { data: setting } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'bootcamp_deadline_hours')
        .maybeSingle();

      const hours = setting?.value ? parseInt(setting.value, 10) : 48;
      setDeadlineHours(hours);

      // Get rookies who haven't completed bootcamp
      const { data: rookieRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'rookie');

      if (!rookieRoles?.length) {
        setIsLoading(false);
        return;
      }

      const rookieIds = rookieRoles.map(r => r.user_id);

      // Get profiles and bootcamp progress
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, created_at, status, teams:team_id(name)')
        .in('user_id', rookieIds)
        .eq('status', 'active');

      const { data: bootcampData } = await supabase
        .from('bootcamp_progress')
        .select('user_id, bootcamp_completed, bootcamp_exempt, phase_1_complete, phase_2_complete, phase_3_complete')
        .in('user_id', rookieIds);

      const bootcampMap = new Map(
        (bootcampData || []).map(b => [b.user_id, b])
      );

      const result: Straggler[] = [];
      for (const p of profiles || []) {
        const bp = bootcampMap.get(p.user_id);
        // Skip if completed or exempt
        if (bp?.bootcamp_completed || bp?.bootcamp_exempt) continue;
        
        result.push({
          full_name: p.full_name,
          email: p.email,
          created_at: p.created_at || '',
          team_name: (p as any).teams?.name || null,
          bootcamp_completed: false,
          phase_1_complete: bp?.phase_1_complete || false,
          phase_2_complete: bp?.phase_2_complete || false,
          phase_3_complete: bp?.phase_3_complete || false,
        });
      }

      // Sort by most overdue first
      result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      setStragglers(result);
      setIsLoading(false);
    };

    fetch();
  }, [isManager]);

  if (!isManager || isLoading || stragglers.length === 0) return null;

  const getTimeStatus = (createdAt: string) => {
    const created = new Date(createdAt);
    const deadline = new Date(created.getTime() + deadlineHours * 60 * 60 * 1000);
    const now = new Date();
    const msRemaining = deadline.getTime() - now.getTime();
    const hoursRemaining = msRemaining / (1000 * 60 * 60);
    const isOverdue = msRemaining <= 0;

    if (isOverdue) {
      const hoursOver = Math.abs(hoursRemaining);
      return {
        label: hoursOver < 24 ? `${Math.floor(hoursOver)}h overdue` : `${Math.floor(hoursOver / 24)}d overdue`,
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
        isOverdue: true,
      };
    }
    return {
      label: hoursRemaining < 1 ? `${Math.floor(hoursRemaining * 60)}m left` : `${Math.floor(hoursRemaining)}h left`,
      color: hoursRemaining < 12 ? 'text-yellow-400' : 'text-muted-foreground',
      bgColor: hoursRemaining < 12 ? 'bg-yellow-500/10' : 'bg-muted/30',
      isOverdue: false,
    };
  };

  const overdueCount = stragglers.filter(s => {
    const created = new Date(s.created_at);
    return Date.now() > created.getTime() + deadlineHours * 60 * 60 * 1000;
  }).length;

  const phasesComplete = (s: Straggler) =>
    [s.phase_1_complete, s.phase_2_complete, s.phase_3_complete].filter(Boolean).length;

  const copyToClipboard = () => {
    const grouped: Record<string, string[]> = {};
    for (const s of stragglers) {
      const team = s.team_name || 'No Team';
      if (!grouped[team]) grouped[team] = [];
      grouped[team].push(s.full_name);
    }
    const text = Object.entries(grouped)
      .map(([team, names]) => `${team}:\n${names.map(n => `  - ${n}`).join('\n')}`)
      .join('\n\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="mb-4 border-destructive/30">
      <div className="p-3 border-b border-border/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <h2 className="font-semibold text-sm text-foreground">Boot Camp Stragglers</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={copyToClipboard}
              className="h-6 px-2 text-[10px] gap-1 text-muted-foreground"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy List'}
            </Button>
            <span className="text-xs text-muted-foreground">
              {stragglers.length} incomplete{overdueCount > 0 && ` · ${overdueCount} overdue`}
            </span>
          </div>
        </div>
      </div>
      <div className="divide-y divide-border/20 max-h-64 overflow-y-auto">
        {stragglers.slice(0, 10).map((s) => {
          const status = getTimeStatus(s.created_at);
          const phases = phasesComplete(s);
          return (
            <div key={s.email} className="flex items-center justify-between px-4 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {s.full_name}
                  {s.team_name && (
                    <span className="text-[10px] text-muted-foreground font-normal ml-1.5">· {s.team_name}</span>
                  )}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-muted-foreground">{phases}/3 modules</span>
                  <div className="flex gap-0.5">
                    {[s.phase_1_complete, s.phase_2_complete, s.phase_3_complete].map((done, i) => (
                      <div
                        key={i}
                        className={cn(
                          'w-2 h-2 rounded-full',
                          done ? 'bg-green-400' : 'bg-muted-foreground/20'
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <span className={cn(
                'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                status.bgColor, status.color
              )}>
                {status.isOverdue && <AlertTriangle className="w-2.5 h-2.5 inline mr-0.5" />}
                {status.label}
              </span>
            </div>
          );
        })}
        {stragglers.length > 10 && (
          <div className="px-4 py-2 text-center text-xs text-muted-foreground">
            +{stragglers.length - 10} more
          </div>
        )}
      </div>
    </Card>
  );
}
