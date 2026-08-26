import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Props {
  vertical: string;
  name: string;
  onDone: () => void;
  onCancel?: () => void;
}

export function VerticalApplicationForm({ vertical, name, onDone, onCancel }: Props) {
  const [why, setWhy] = useState('');
  const [experience, setExperience] = useState('');
  const [availability, setAvailability] = useState('');
  const [markets, setMarkets] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!why.trim() || !availability.trim() || !phone.trim()) {
      toast({
        title: 'Missing answers',
        description: 'Fill in why, availability and phone before submitting.',
        variant: 'destructive',
      });
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc('apply_to_vertical' as never, {
      _vertical: vertical,
      _answers: {
        why: why.trim(),
        experience: experience.trim(),
        availability: availability.trim(),
        markets: markets.trim(),
        phone: phone.trim(),
      },
    } as never);
    setBusy(false);
    const res = data as unknown as { success: boolean; error?: string } | null;
    if (error || !res?.success) {
      toast({
        title: 'Could not submit',
        description: res?.error || error?.message || 'Try again.',
        variant: 'destructive',
      });
      return;
    }
    toast({ title: 'Application sent', description: 'Your approvers have been notified.' });
    onDone();
  };

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-muted-foreground">
        Apply for {name}. Both approvers have to sign off before it opens.
      </p>
      <div className="space-y-1.5">
        <Label className="text-[12px]">Why this industry</Label>
        <Textarea value={why} onChange={(e) => setWhy(e.target.value)} rows={3} className="text-[15px]" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[12px]">Relevant experience</Label>
        <Textarea
          value={experience}
          onChange={(e) => setExperience(e.target.value)}
          rows={2}
          className="text-[15px]"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[12px]">Availability or season</Label>
        <Input value={availability} onChange={(e) => setAvailability(e.target.value)} className="text-[15px]" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[12px]">Markets you can work</Label>
        <Input value={markets} onChange={(e) => setMarkets(e.target.value)} className="text-[15px]" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[12px]">Phone</Label>
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="tel"
          className="text-[15px]"
        />
      </div>
      <div className="flex gap-2 pt-1">
        <Button onClick={submit} disabled={busy} className="min-h-11 flex-1">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit application'}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} className="min-h-11">
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
