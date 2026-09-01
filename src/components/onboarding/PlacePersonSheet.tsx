import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';

interface ManagerOption {
  user_id: string;
  full_name: string | null;
  team_name: string | null;
}

interface Props {
  userId: string;
  fullName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPlaced?: () => void;
}

/**
 * Place a person under a direct manager. The picker only offers managers from
 * the caller's own system, and the server refuses anything outside it.
 */
export function PlacePersonSheet({ userId, fullName, open, onOpenChange, onPlaced }: Props) {
  const [options, setOptions] = useState<ManagerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any).rpc('my_system_managers');
    setOptions(((data as ManagerOption[] | null) || []).filter((m) => m.user_id !== userId));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const place = async (managerId: string) => {
    setBusy(managerId);
    const { data, error } = await (supabase as any).rpc('place_person', {
      _user_id: userId,
      _manager_id: managerId,
    });
    setBusy(null);
    const res = (data as { success?: boolean; error?: string } | null) || null;
    if (error || !res?.success) {
      toast.error(res?.error || error?.message || 'That did not go through');
      return;
    }
    toast.success(`${fullName} now reports to ${res && (res as any).manager_name ? (res as any).manager_name : 'their new manager'}`);
    onOpenChange(false);
    onPlaced?.();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Place {fullName}</SheetTitle>
        </SheetHeader>

        <p className="mt-2 text-[13px] text-muted-foreground">
          Pick the manager this person reports to. Only your own system is listed.
        </p>

        {loading ? (
          <Loader2 className="mt-4 h-4 w-4 animate-spin text-muted-foreground" />
        ) : options.length === 0 ? (
          <p className="mt-4 text-[13px] text-muted-foreground">
            There is nobody in your system to place them under yet.
          </p>
        ) : (
          <div className="mt-4 space-y-2 pb-6">
            {options.map((m) => (
              <Button
                key={m.user_id}
                variant="outline"
                className="min-h-12 w-full justify-start"
                disabled={busy === m.user_id}
                onClick={() => place(m.user_id)}
              >
                {busy === m.user_id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <span className="truncate">
                  {m.full_name || 'Unnamed'}
                  {m.team_name ? ` · ${m.team_name}` : ''}
                </span>
              </Button>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default PlacePersonSheet;
