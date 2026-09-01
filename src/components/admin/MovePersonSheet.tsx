import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Pillar {
  team_id: string;
  name: string;
  vertical: string | null;
}

interface ManagerOption {
  user_id: string;
  full_name: string | null;
  team_name: string | null;
}

const INDUSTRIES = ['Pest', 'Fiber', 'Life'] as const;

interface Props {
  userId: string;
  fullName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMoved?: () => void;
}

/**
 * The owner's move: pillar, direct manager and, when it is needed, industry.
 * Every move is recorded. Only the owner can get a result from this.
 */
export function MovePersonSheet({ userId, fullName, open, onOpenChange, onMoved }: Props) {
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [managers, setManagers] = useState<ManagerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<string>('');
  const [manager, setManager] = useState<string>('');
  const [vertical, setVertical] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [p, m] = await Promise.all([
      (supabase as any).rpc('my_pillars'),
      (supabase as any).rpc('my_system_managers'),
    ]);
    setPillars((p?.data as Pillar[] | null) || []);
    setManagers(((m?.data as ManagerOption[] | null) || []).filter((x) => x.user_id !== userId));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const submit = async () => {
    if (!team && !manager && !vertical) {
      toast.error('Pick at least one thing to change');
      return;
    }
    setBusy(true);
    const { data, error } = await (supabase as any).rpc('owner_move_person', {
      _user_id: userId,
      _team_id: team || null,
      _manager_id: manager || null,
      _vertical: vertical || null,
    });
    setBusy(false);
    const res = (data as { success?: boolean; error?: string } | null) || null;
    if (error || !res?.success) {
      toast.error(res?.error || error?.message || 'That did not go through');
      return;
    }
    toast.success(`${fullName} moved`);
    onOpenChange(false);
    onMoved?.();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Move {fullName}</SheetTitle>
        </SheetHeader>

        <p className="mt-2 text-[13px] text-muted-foreground">
          Leave anything blank to keep it as it is.
        </p>

        {loading ? (
          <Loader2 className="mt-4 h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <div className="mt-4 space-y-3 pb-6">
            <div>
              <p className="mb-1 text-[13px] text-muted-foreground">Pillar</p>
              <Select value={team} onValueChange={setTeam}>
                <SelectTrigger className="h-11 text-[13px]">
                  <SelectValue placeholder="Keep their pillar" />
                </SelectTrigger>
                <SelectContent>
                  {pillars.map((p) => (
                    <SelectItem key={p.team_id} value={p.team_id} className="text-[13px]">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="mb-1 text-[13px] text-muted-foreground">Direct manager</p>
              <Select value={manager} onValueChange={setManager}>
                <SelectTrigger className="h-11 text-[13px]">
                  <SelectValue placeholder="Keep their manager" />
                </SelectTrigger>
                <SelectContent>
                  {managers.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id} className="text-[13px]">
                      {m.full_name || 'Unnamed'}
                      {m.team_name ? ` · ${m.team_name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="mb-1 text-[13px] text-muted-foreground">Industry</p>
              <Select value={vertical} onValueChange={setVertical}>
                <SelectTrigger className="h-11 text-[13px]">
                  <SelectValue placeholder="Keep their industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((v) => (
                    <SelectItem key={v} value={v} className="text-[13px]">
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button className="min-h-12 w-full" disabled={busy} onClick={submit}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Move this person
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default MovePersonSheet;
