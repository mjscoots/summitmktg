import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Bell, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface Preferences {
  training_quiz: boolean;
  calendar_events: boolean;
  leaderboard: boolean;
  chat_mentions: boolean;
  bootcamp_reminders: boolean;
  streak_milestones: boolean;
}

const PREF_LABELS: { key: keyof Preferences; label: string; description: string }[] = [
  { key: 'training_quiz', label: 'Training & Quiz', description: 'Quiz completions, training milestones, and rep progress alerts' },
  { key: 'calendar_events', label: 'Calendar Events', description: 'Upcoming event reminders and schedule notifications' },
  { key: 'leaderboard', label: 'Leaderboard', description: 'Weekly rank changes and #1 position alerts' },
  { key: 'chat_mentions', label: 'Chat Activity', description: 'Unread message alerts when 10+ messages pile up' },
  { key: 'bootcamp_reminders', label: 'Summer Checklist', description: 'Summer Checklist deadline reminders and phase completion' },
  { key: 'streak_milestones', label: 'Streak Milestones', description: 'Daily login streak achievements and milestone bonuses' },
];

const DEFAULTS: Preferences = {
  training_quiz: true,
  calendar_events: true,
  leaderboard: true,
  chat_mentions: true,
  bootcamp_reminders: true,
  streak_milestones: true,
};

export function NotificationPreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const load = async () => {
      const { data } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setPrefs({
          training_quiz: (data as any).training_quiz ?? true,
          calendar_events: (data as any).calendar_events ?? true,
          leaderboard: (data as any).leaderboard ?? true,
          chat_mentions: (data as any).chat_mentions ?? true,
          bootcamp_reminders: (data as any).bootcamp_reminders ?? true,
          streak_milestones: (data as any).streak_milestones ?? true,
        });
      }
      setIsLoading(false);
    };

    load();
  }, [user?.id]);

  const handleToggle = async (key: keyof Preferences) => {
    if (!user?.id) return;

    const newValue = !prefs[key];
    setIsSaving(key);
    setPrefs(prev => ({ ...prev, [key]: newValue }));

    try {
      // Upsert the row
      const { error } = await supabase
        .from('notification_preferences')
        .upsert(
          { user_id: user.id, [key]: newValue } as any,
          { onConflict: 'user_id' }
        );

      if (error) throw error;
      toast.success(`${newValue ? 'Enabled' : 'Disabled'} ${PREF_LABELS.find(p => p.key === key)?.label} notifications`);
    } catch (err) {
      // Revert on error
      setPrefs(prev => ({ ...prev, [key]: !newValue }));
      toast.error('Failed to update preference');
      console.error(err);
    } finally {
      setIsSaving(null);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border/50 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">Notification Preferences</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border/50 p-6">
      <div className="mb-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          Notification Preferences
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Choose which notifications you'd like to receive
        </p>
      </div>

      <div className="space-y-1">
        {PREF_LABELS.map(({ key, label, description }) => (
          <div
            key={key}
            className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-muted/30 transition-colors"
          >
            <div className="flex-1 min-w-0 mr-4">
              <p className="text-sm font-medium text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {isSaving === key && (
                <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
              )}
              <Switch
                checked={prefs[key]}
                onCheckedChange={() => handleToggle(key)}
                disabled={isSaving === key}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
