import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Bell, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { PushToggle } from './PushToggle';


interface Preferences {
  new_leads: boolean;
  lead_expiry: boolean;
  announcements: boolean;
  training_quiz: boolean;
  calendar_events: boolean;
  leaderboard: boolean;
  chat_mentions: boolean;
  bootcamp_reminders: boolean;
  streak_milestones: boolean;
}

const PREF_LABELS: { key: keyof Preferences; label: string; description: string }[] = [
  { key: 'chat_mentions', label: 'Chat messages', description: 'On: you are alerted about unread messages in the rooms you have not muted.' },
  { key: 'calendar_events', label: 'Event reminders', description: 'On: you are reminded about events you are expected at, including blitz spots.' },
  { key: 'announcements', label: 'Announcements', description: 'On: you are notified when a new announcement is posted.' },
  { key: 'new_leads', label: 'New leads', description: 'On: you are notified when a lead lands on the Lead Board unclaimed.' },
  { key: 'lead_expiry', label: 'Lead expiry warnings', description: 'On: you are warned before a lead you claimed is released back to the board.' },
  { key: 'training_quiz', label: 'Training', description: 'On: you are notified about training progress on your own account and your reps.' },
  { key: 'leaderboard', label: 'Leaderboard', description: 'On: you are notified about your weekly rank changes.' },
  { key: 'bootcamp_reminders', label: 'Summer Checklist', description: 'On: you are reminded about Summer Checklist steps you have not finished.' },
  { key: 'streak_milestones', label: 'Streak milestones', description: 'On: you are notified when your daily login streak hits a milestone.' },
];


const DEFAULTS: Preferences = {
  new_leads: true,
  lead_expiry: true,
  announcements: true,
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
      // my_notification_prefs() writes the sensible defaults on first read.
      const { data } = await (supabase as any).rpc('my_notification_prefs');

      if (data && !data.error) {
        setPrefs({
          new_leads: data.new_leads ?? true,
          lead_expiry: data.lead_expiry ?? true,
          announcements: data.announcements ?? true,
          training_quiz: data.training_quiz ?? true,
          calendar_events: data.calendar_events ?? true,
          leaderboard: data.leaderboard ?? true,
          chat_mentions: data.chat_mentions ?? true,
          bootcamp_reminders: data.bootcamp_reminders ?? true,
          streak_milestones: data.streak_milestones ?? true,
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
          Every switch below is live. Turn one off and that kind of notification stops for your account.
        </p>
      </div>

      <div className="space-y-1">
        <PushToggle />
        <div className="h-px bg-border/50" />

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
