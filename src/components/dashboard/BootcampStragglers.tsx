import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AlertTriangle, Copy, Check, Send, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

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
  const { user, role, profile } = useAuth();
  const [stragglers, setStragglers] = useState<Straggler[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  const isManager = role === 'manager' || role === 'admin';
  const isAdmin = role === 'admin';

  useEffect(() => {
    if (!isManager || !user?.id) return;

    const fetchStragglers = async () => {
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
        .select('user_id, full_name, email, created_at, status, team_id, teams:team_id(name)')
        .in('user_id', rookieIds)
        .eq('status', 'active');

      const { data: bootcampData } = await supabase
        .from('bootcamp_progress')
        .select('user_id, bootcamp_completed, bootcamp_exempt, phase_1_complete, phase_2_complete, phase_3_complete')
        .in('user_id', rookieIds);

      const bootcampMap = new Map(
        (bootcampData || []).map(b => [b.user_id, b])
      );

      // Determine which team IDs this manager/pillar can see
      let allowedTeamIds: Set<string> | null = null; // null = see all (admin)
      
      if (!isAdmin) {
        // For managers: get teams they lead + their own team
        const teamIds = new Set<string>();
        
        // Check if they're a pillar leader
        const { data: ledTeams } = await supabase
          .from('teams')
          .select('id')
          .eq('leader_id', user.id);
        
        ledTeams?.forEach(t => teamIds.add(t.id));
        
        // Also include their own team
        if (profile?.team_id) {
          teamIds.add(profile.team_id);
        }
        
        allowedTeamIds = teamIds;
      }

      const result: Straggler[] = [];
      for (const p of profiles || []) {
        const bp = bootcampMap.get(p.user_id);
        if (bp?.bootcamp_completed || bp?.bootcamp_exempt) continue;
        
        // Filter by team for non-admin managers
        const profileTeamId = (p as any).team_id;
        if (allowedTeamIds !== null) {
          if (!profileTeamId || !allowedTeamIds.has(profileTeamId)) continue;
        }
        
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

      // Sort by oldest first
      result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      setStragglers(result);
      setIsLoading(false);
    };

    fetchStragglers();
  }, [isManager, isAdmin, user?.id, profile?.team_id]);

  if (!isManager || isLoading || stragglers.length === 0) return null;

  const getTimeSinceApproval = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const ms = now.getTime() - created.getTime();
    const totalMinutes = Math.floor(ms / (1000 * 60));
    const totalHours = Math.floor(ms / (1000 * 60 * 60));
    const totalDays = Math.floor(ms / (1000 * 60 * 60 * 24));

    let label: string;
    if (totalMinutes < 60) {
      label = `${totalMinutes}m ago`;
    } else if (totalHours < 24) {
      label = `${totalHours}h ago`;
    } else {
      label = `${totalDays}d ago`;
    }

    // Color coding based on how long
    let color = 'text-muted-foreground';
    let bgColor = 'bg-muted/30';
    if (totalHours >= 24) {
      color = 'text-red-400';
      bgColor = 'bg-red-500/10';
    } else if (totalHours >= 1) {
      color = 'text-yellow-400';
      bgColor = 'bg-yellow-500/10';
    }

    return { label, color, bgColor };
  };

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

  const handleAutoReminder = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('bootcamp-reminders', { body: { force: true } });
      if (error) throw error;
      toast.success(`Reminders sent: ${data?.rep_emails_sent || 0} rep(s), ${data?.manager_emails_sent || 0} manager(s)`);
    } catch (err: any) {
      console.error('Error sending reminders:', err);
      toast.error('Failed to send reminders');
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="mb-4 border-destructive/30">
      <div className="p-3 border-b border-border/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <h2 className="font-semibold text-sm text-foreground">Summer Checklist Stragglers</h2>
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
              {stragglers.length} incomplete
            </span>
          </div>
        </div>
      </div>
      <div className="divide-y divide-border/20 max-h-64 overflow-y-auto">
        {stragglers.slice(0, 10).map((s) => {
          const status = getTimeSinceApproval(s.created_at);
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
      {/* Auto Send Reminder button */}
      <div className="p-3 border-t border-border/30">
        <Button
          variant="outline"
          size="sm"
          onClick={handleAutoReminder}
          disabled={sending}
          className="w-full gap-2 text-xs font-semibold"
        >
          {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          {sending ? 'Sending Reminders...' : 'Auto Send Reminder'}
        </Button>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
          Emails all incomplete reps & notifies their managers
        </p>
      </div>
    </Card>
  );
}
