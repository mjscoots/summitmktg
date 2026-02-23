import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { EXTERNAL_ROSTER, findBestMatch, matchNames } from '@/lib/externalRoster';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Sun } from 'lucide-react';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  summer_ready: { label: 'Summer Ready', color: 'text-green-400' },
  onboarded: { label: 'Onboarded', color: 'text-blue-400' },
  contract_signed: { label: 'Contract Signed', color: 'text-amber-400' },
  info_added: { label: 'Info Added', color: 'text-orange-400' },
  pending: { label: 'Pending', color: 'text-muted-foreground' },
};

interface RepStatus {
  full_name: string;
  avatar_url: string | null;
  onboarding_status: string;
  direct_manager: string | null;
}

export function NotSummerReadyPanel() {
  const { profile, role } = useAuth();
  const [reps, setReps] = useState<RepStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role !== 'manager' && role !== 'admin') return;
    
    const fetch = async () => {
      // Get profiles that managers can see
      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, onboarding_status, direct_manager, user_id')
        .neq('status', 'nlc')
        .neq('status', 'pending');
      
      if (!data) { setLoading(false); return; }

      // For managers, filter to their downline using external roster
      let filtered = data.filter(p => 
        p.onboarding_status && p.onboarding_status !== 'summer_ready'
      );

      if (role === 'manager' && profile?.full_name) {
        // Only show reps that report to this manager (direct or indirect)
        const managerName = profile.full_name;
        const downlineNames = new Set<string>();
        
        // Build downline from external roster
        const addDownline = (name: string) => {
          EXTERNAL_ROSTER.forEach(r => {
            const score = matchNames(r.manager_name, name);
            if (score > 0.7) {
              downlineNames.add(r.full_name.toLowerCase());
              addDownline(r.full_name);
            }
          });
        };
        addDownline(managerName);

        filtered = filtered.filter(p => {
          // Direct reports or matched from external roster
          if (p.direct_manager) {
            const score = matchNames(p.direct_manager, managerName);
            if (score > 0.7) return true;
          }
          return downlineNames.has(p.full_name.toLowerCase()) || 
            Array.from(downlineNames).some(dn => matchNames(dn, p.full_name) > 0.7);
        });
      }

      setReps(filtered.map(p => ({
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        onboarding_status: p.onboarding_status || 'pending',
        direct_manager: p.direct_manager,
      })));
      setLoading(false);
    };
    fetch();
  }, [role, profile]);

  if (loading || reps.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-amber-400" />
        <h2 className="font-semibold text-foreground">Not Summer Ready</h2>
        <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30 ml-auto">
          {reps.length} reps
        </Badge>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {reps.map((rep, i) => {
          const info = STATUS_LABELS[rep.onboarding_status] || STATUS_LABELS.pending;
          return (
            <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/20">
              <UserAvatar avatarUrl={rep.avatar_url} fullName={rep.full_name} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{rep.full_name}</p>
                {rep.direct_manager && (
                  <p className="text-[10px] text-muted-foreground truncate">→ {rep.direct_manager}</p>
                )}
              </div>
              <Badge variant="outline" className={`text-[9px] ${info.color}`}>
                {info.label}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
