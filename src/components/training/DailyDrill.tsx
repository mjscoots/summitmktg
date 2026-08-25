import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Target, Check, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DrillState {
  id: string;
  category: string | null;
  scenario: string;
  model_answer: string | null;
}

interface DrillPayload {
  total: number;
  drill_date?: string;
  drill: DrillState | null;
  completed?: boolean;
  my_response?: string | null;
}

export function DailyDrill() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [drill, setDrill] = useState<DrillState | null>(null);
  const [completed, setCompleted] = useState(false);
  const [response, setResponse] = useState('');
  const [showModel, setShowModel] = useState(false);

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_daily_drill', { _timezone: tz });
    if (error) {
      console.error('get_daily_drill failed:', error);
      setLoading(false);
      return;
    }
    const payload = (data as unknown as DrillPayload) || { total: 0, drill: null };
    setDrill(payload.drill?.id ? payload.drill : null);
    setCompleted(!!payload.completed);
    setResponse(payload.my_response || '');
    setShowModel(!!payload.completed);
    setLoading(false);
  }, [tz]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!drill || response.trim().length < 5) {
      toast.error('Write your answer first.');
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.rpc('complete_daily_drill', {
      _drill_id: drill.id,
      _response: response.trim(),
      _timezone: tz,
    });
    setSaving(false);
    if (error) {
      toast.error('Could not save your answer.');
      return;
    }
    const res = data as unknown as { ok: boolean; first_today?: boolean; reason?: string };
    if (!res?.ok) {
      toast.error(res?.reason === 'unauthenticated' ? 'Please sign in again.' : 'Could not save your answer.');
      return;
    }
    setCompleted(true);
    setShowModel(true);
    toast.success(res.first_today ? 'Drill logged — +15 points' : 'Drill logged');
  };

  if (loading || !drill) return null;

  return (
    <div className="mb-6 rounded-xl border border-white/[0.06] bg-card/60 backdrop-blur-sm p-5">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/25 to-primary/5 text-primary flex-shrink-0">
          <Target className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-foreground">Daily drill</h3>
            {drill.category && (
              <Badge variant="outline" className="text-[10px] uppercase tracking-wide">{drill.category}</Badge>
            )}
            {completed && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success">
                <Check className="w-3.5 h-3.5" /> Done today
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-foreground/90 whitespace-pre-wrap">{drill.scenario}</p>

          <Textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            disabled={completed}
            placeholder="How do you handle it? Say it the way you'd say it at the door."
            className="mt-3 min-h-[90px] bg-surface border-border/40 text-sm"
          />

          {!completed && (
            <Button onClick={submit} disabled={saving} className="mt-3 gap-2" size="sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Submit answer
            </Button>
          )}

          {drill.model_answer && (
            <div className="mt-3">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground -ml-2"
                onClick={() => setShowModel((v) => !v)}
                disabled={!completed}
              >
                {showModel ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {completed ? (showModel ? 'Hide model answer' : 'Show model answer') : 'Model answer unlocks after you answer'}
              </Button>
              {completed && showModel && (
                <p
                  className={cn(
                    'mt-2 rounded-lg border border-success/25 bg-success/[0.06] p-3 text-sm text-foreground/90 whitespace-pre-wrap'
                  )}
                >
                  {drill.model_answer}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DailyDrill;
