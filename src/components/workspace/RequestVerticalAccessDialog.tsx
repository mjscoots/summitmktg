import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useWorkspace, type Workspace } from '@/contexts/WorkspaceContext';

/**
 * Pass 89 - Pest is open to everyone. Fiber and Life are by owner approval, so
 * a rep asks with three short answers and waits for a decision.
 */
export function RequestVerticalAccessDialog({
  workspace,
  open,
  onOpenChange,
}: {
  workspace: Workspace | null;
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const { refresh } = useWorkspace();
  const [why, setWhy] = useState('');
  const [experience, setExperience] = useState('');
  const [availability, setAvailability] = useState('');
  const [busy, setBusy] = useState(false);

  const pending = workspace?.request_status === 'pending';

  const submit = async () => {
    if (!workspace) return;
    if (!why.trim() || !experience.trim() || !availability.trim()) {
      toast({
        title: 'Fill in all three answers',
        description: 'Why you want in, your experience, and your availability.',
        variant: 'destructive',
      });
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc('request_vertical_access' as never, {
      _vertical: workspace.vertical,
      _answers: {
        why: why.trim(),
        experience: experience.trim(),
        availability: availability.trim(),
      },
    } as never);
    setBusy(false);
    const res = data as unknown as { success: boolean; error?: string } | null;
    if (error || !res?.success) {
      toast({
        title: 'Could not send that request',
        description: res?.error || error?.message || 'Try again.',
        variant: 'destructive',
      });
      return;
    }
    toast({ title: 'Request sent', description: 'The owner decides and you get a notification.' });
    setWhy('');
    setExperience('');
    setAvailability('');
    await refresh();
    onOpenChange(false);
  };

  const withdraw = async () => {
    if (!workspace) return;
    setBusy(true);
    const { data, error } = await supabase.rpc('withdraw_vertical_request' as never, {
      _vertical: workspace.vertical,
    } as never);
    setBusy(false);
    const res = data as unknown as { success: boolean; error?: string } | null;
    if (error || !res?.success) {
      toast({ title: 'Could not withdraw', description: res?.error || error?.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Request withdrawn' });
    await refresh();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{pending ? `${workspace?.name} request` : `Request ${workspace?.name} access`}</DialogTitle>
          <DialogDescription>
            {pending
              ? 'Requested, waiting on approval. You can withdraw it while it waits.'
              : 'Pest stays open to you. The owner decides on Fiber and Life.'}
          </DialogDescription>
        </DialogHeader>

        {pending ? (
          <DialogFooter className="gap-2 sm:justify-start">
            <Button variant="outline" className="min-h-11" disabled={busy} onClick={withdraw}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Withdraw request'}
            </Button>
            <Button variant="ghost" className="min-h-11" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[12px]">Why you want in</Label>
              <Textarea value={why} onChange={(e) => setWhy(e.target.value)} rows={3} className="text-[15px]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">Relevant experience or results</Label>
              <Textarea
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                rows={2}
                className="text-[15px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">Availability</Label>
              <Input
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                className="min-h-11 text-[15px]"
              />
            </div>
            <Button onClick={submit} disabled={busy} className="min-h-11 w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send request'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default RequestVerticalAccessDialog;
