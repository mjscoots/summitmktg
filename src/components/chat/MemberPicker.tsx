import { useCallback, useEffect, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { cn } from '@/lib/utils';

export interface MemberOption {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  in_room: boolean;
}

/**
 * A searchable list of active people with their faces. Used both to add people
 * to an existing room and to pick the members of a brand new group.
 * The database decides who may load it.
 */
export function MemberPicker({
  slug = null,
  selected,
  onToggle,
  hideInRoom = false,
}: {
  slug?: string | null;
  selected: string[];
  onToggle: (id: string) => void;
  hideInRoom?: boolean;
}) {
  const [q, setQ] = useState('');
  const [people, setPeople] = useState<MemberOption[]>([]);

  const load = useCallback(async () => {
    const { data } = await (supabase as any).rpc('channel_member_options', { _slug: slug, _q: q });
    if (!data || data.error) { setPeople([]); return; }
    setPeople((data.people as MemberOption[]) || []);
  }, [slug, q]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 200);
    return () => clearTimeout(t);
  }, [load]);

  const rows = hideInRoom ? people.filter((p) => !p.in_room) : people;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background px-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search people"
          className="min-h-[44px] flex-1 bg-transparent text-[14px] text-foreground outline-none"
        />
      </div>
      <ul className="max-h-[40vh] space-y-1 overflow-y-auto">
        {rows.map((p) => {
          const picked = selected.includes(p.user_id);
          return (
            <li key={p.user_id}>
              <button
                type="button"
                onClick={() => onToggle(p.user_id)}
                className={cn(
                  'flex min-h-[52px] w-full items-center gap-3 rounded-xl border px-3 text-left transition-colors',
                  picked ? 'border-primary/50 bg-primary/5' : 'border-border/60'
                )}
              >
                <UserAvatar avatarUrl={p.avatar_url} fullName={p.full_name || ''} size="md" />
                <span className="min-w-0 flex-1 truncate text-[14px] text-foreground">{p.full_name}</span>
                <RoleChip userId={p.user_id} />

                {p.in_room && !picked && <span className="text-[11px] text-muted-foreground">In room</span>}
                {picked && <Check className="h-4 w-4 text-primary" />}
              </button>
            </li>
          );
        })}
        {rows.length === 0 && (
          <li className="py-4 text-center text-[13px] text-muted-foreground">Nobody matches that.</li>
        )}
      </ul>
    </div>
  );
}

export default MemberPicker;
