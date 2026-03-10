import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { User, UserCheck, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Team, ResponsesTab } from '@/components/one-on-one/shared';

type OneOnOneSubTab = 'forms' | 'responses';

export default function WeeklyOneOnOnesContent() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [subTab, setSubTab] = useState<OneOnOneSubTab>('forms');

  useEffect(() => {
    const fetchTeams = async () => {
      const { data } = await supabase.from('teams').select('id, name').order('name');
      setTeams(data || []);
    };
    fetchTeams();
  }, []);

  return (
    <div>
      {/* Sub-tabs matching interview style */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setSubTab('forms')}
          className={cn(
            'text-xs px-3 py-1.5 rounded-full border transition-all duration-150',
            subTab === 'forms'
              ? 'bg-primary/10 border-primary/30 text-primary font-medium'
              : 'border-border/50 text-muted-foreground hover:text-foreground hover:border-border'
          )}
        >
          Forms
        </button>
        <button
          onClick={() => setSubTab('responses')}
          className={cn(
            'text-xs px-3 py-1.5 rounded-full border transition-all duration-150',
            subTab === 'responses'
              ? 'bg-primary/10 border-primary/30 text-primary font-medium'
              : 'border-border/50 text-muted-foreground hover:text-foreground hover:border-border'
          )}
        >
          Responses
        </button>
      </div>

      {subTab === 'forms' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
            <div
              className="flex flex-col bg-card border border-border/50 rounded-xl p-5 card-hover cursor-pointer group"
              onClick={() => navigate('/app/one-on-ones/prep')}
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[hsl(217,91%,15%)] flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground">Rookie-Manager 1:1</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">Weekly check-in with rookies — with training data</p>
                </div>
              </div>
              <div className="flex-1" />
              <button
                onClick={(e) => { e.stopPropagation(); navigate('/app/one-on-ones/prep'); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg transition-all duration-200 hover:bg-primary/85 hover:shadow-[0_0_15px_-5px_hsl(var(--primary)/0.4)]"
              >
                <Pencil className="w-4 h-4" />
                <span>Open</span>
              </button>
            </div>

            <div
              className="flex flex-col bg-card border border-border/50 rounded-xl p-5 card-hover cursor-pointer group"
              onClick={() => navigate('/app/one-on-ones/prep?mode=manager')}
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[hsl(217,91%,15%)] flex items-center justify-center flex-shrink-0">
                  <UserCheck className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground">Manager 1:1</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">Weekly check-in with managers — with training data</p>
                </div>
              </div>
              <div className="flex-1" />
              <button
                onClick={(e) => { e.stopPropagation(); navigate('/app/one-on-ones/prep?mode=manager'); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg transition-all duration-200 hover:bg-primary/85 hover:shadow-[0_0_15px_-5px_hsl(var(--primary)/0.4)]"
              >
                <Pencil className="w-4 h-4" />
                <span>Fill Out Form</span>
              </button>
            </div>
          </div>

          <div className="bg-card border border-border/50 rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-3">Weekly 1:1 Process</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Keep these to 30 minutes or less. The primary purpose is to maintain consistent communication.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-foreground">Rookie-Manager 1:1</span>
                <span className="text-muted-foreground">— Weekly check-in with rookies, creates daily tasks</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <UserCheck className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-foreground">Manager 1:1</span>
                <span className="text-muted-foreground">— Weekly check-in with managers, tracks team development</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <ResponsesTab teams={teams} />
      )}
    </div>
  );
}
