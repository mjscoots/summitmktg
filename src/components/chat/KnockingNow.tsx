import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { UserAvatar } from '@/components/shared/UserAvatar';

interface ActivePerson {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

/** Teammates active right now. Reads existing activity fields only. */
export function KnockingNow() {
  const { user, profile } = useAuth();
  const [people, setPeople] = useState<ActivePerson[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!profile?.team_id) { setPeople([]); return; }
      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, is_active_now')
        .eq('team_id', profile.team_id)
        .eq('is_active_now', true)
        .limit(12);
      if (cancelled) return;
      setPeople(
        ((data || []) as any[])
          .filter((p) => p.user_id !== user?.id)
          .map((p) => ({ user_id: p.user_id, full_name: p.full_name, avatar_url: p.avatar_url }))
      );
    };
    void load();
    const id = window.setInterval(load, 120000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [profile?.team_id, user?.id]);

  if (!people.length) return null;

  return (
    <div className="flex flex-shrink-0 items-center gap-2 border-b border-border/10 px-3 py-1.5">
      <span className="flex-shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Knocking now
      </span>
      <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {people.map((p) => (
          <UserAvatar key={p.user_id} avatarUrl={p.avatar_url} fullName={p.full_name} size="xs" />
        ))}
      </div>
      <span className="ml-auto flex-shrink-0 text-[11px] text-muted-foreground">{people.length} out</span>
    </div>
  );
}
