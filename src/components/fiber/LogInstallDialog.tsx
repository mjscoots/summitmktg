import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { celebrate } from '@/lib/celebrate';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Carrier {
  id: string;
  name: string;
}

/** Monday of the week the given date falls in. */
export function mondayOf(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  const diff = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Records one install into fiber_installs, rolled into that install's week. */
export function LogInstallDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: () => void;
}) {
  const { user } = useAuth();
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [carrierId, setCarrierId] = useState<string>('');
  const [date, setDate] = useState(today());
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await (supabase as any).from('carriers').select('id, name').order('name');
      const list = (data as Carrier[]) || [];
      setCarriers(list);
      setCarrierId((prev) => prev || list[0]?.id || '');
    })();
  }, [open]);

  const save = async () => {
    if (!user || !carrierId) {
      toast.error('Pick a carrier first.');
      return;
    }
    setBusy(true);
    const week_start = mondayOf(date);
    const { data: existing } = await (supabase as any)
      .from('fiber_installs')
      .select('id, installs, notes')
      .eq('user_id', user.id)
      .eq('carrier_id', carrierId)
      .eq('week_start', week_start)
      .maybeSingle();

    const noteLine = [address.trim(), notes.trim()].filter(Boolean).join(' — ');
    let error = null;
    if (existing) {
      const row = existing as { id: string; installs: number; notes: string | null };
      const merged = [row.notes, noteLine ? `${date}: ${noteLine}` : null].filter(Boolean).join('\n');
      ({ error } = await (supabase as any)
        .from('fiber_installs')
        .update({ installs: (row.installs || 0) + 1, notes: merged || null })
        .eq('id', row.id));
    } else {
      ({ error } = await (supabase as any).from('fiber_installs').insert({
        user_id: user.id,
        carrier_id: carrierId,
        week_start,
        installs: 1,
        cancels: 0,
        notes: noteLine ? `${date}: ${noteLine}` : null,
      }));
    }
    setBusy(false);
    if (error) {
      toast.error('That did not save. Try again.');
      return;
    }
    setAddress('');
    setNotes('');
    onOpenChange(false);
    onSaved?.();
    toast.success('Install recorded');
    celebrate('install');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log an install</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="install-date">Date</Label>
            <Input id="install-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Carrier</Label>
            <Select value={carrierId} onValueChange={setCarrierId}>
              <SelectTrigger className="min-h-11">
                <SelectValue placeholder="Pick a carrier" />
              </SelectTrigger>
              <SelectContent>
                {carriers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="install-address">Address or zip</Label>
            <Input
              id="install-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="install-notes">Notes</Label>
            <Textarea
              id="install-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="min-h-11" onClick={save} disabled={busy}>
            Save install
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default LogInstallDialog;
