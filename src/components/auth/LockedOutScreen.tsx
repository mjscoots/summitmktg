import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

interface Props {
  archived: boolean;
  defaultName?: string;
  requestStatus?: string | null;
}

/**
 * One plain screen for a person whose access was reset for the 2027 season.
 * No navigation, no data — only the request form.
 */
export function LockedOutScreen({ archived, defaultName, requestStatus }: Props) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(requestStatus === 'open');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: defaultName || '',
    phone: '',
    vertical: 'Pest',
    worked_under: '',
  });

  const submit = async () => {
    if (!form.full_name.trim() || !form.phone.trim()) {
      toast({ title: 'Add your name and phone number', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.rpc('submit_reactivation_request', {
      _full_name: form.full_name,
      _phone: form.phone,
      _vertical: form.vertical,
      _worked_under: form.worked_under,
      _notes: null,
    });
    setSaving(false);
    const res = data as { success?: boolean; error?: string } | null;
    if (error || !res?.success) {
      toast({ title: res?.error || error?.message || 'Could not send the request', variant: 'destructive' });
      return;
    }
    setSent(true);
    setOpen(false);
  };

  const signOut = () => supabase.auth.signOut();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {archived ? (
          <p className="text-center text-foreground">This account is no longer active.</p>
        ) : (
          <div className="space-y-5">
            <p className="text-center text-foreground">
              Summit is resetting access for the 2027 season. Your manager or Mathew will reactivate you.
            </p>

            {sent ? (
              <p className="text-center text-sm text-muted-foreground">
                Request sent. You will get access back once it is approved.
              </p>
            ) : open ? (
              <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                <Input
                  placeholder="Full name"
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                />
                <Input
                  placeholder="Phone"
                  inputMode="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
                <select
                  className="input-field w-full"
                  value={form.vertical}
                  onChange={(e) => setForm((f) => ({ ...f, vertical: e.target.value }))}
                >
                  <option value="Pest">Pest</option>
                  <option value="Fiber">Fiber</option>
                  <option value="Life">Life</option>
                </select>
                <Input
                  placeholder="Who you worked under last season"
                  value={form.worked_under}
                  onChange={(e) => setForm((f) => ({ ...f, worked_under: e.target.value }))}
                />
                <Button className="w-full" onClick={submit} disabled={saving}>
                  {saving ? 'Sending' : 'Send request'}
                </Button>
              </div>
            ) : (
              <Button className="w-full" onClick={() => setOpen(true)}>
                Request access
              </Button>
            )}
          </div>
        )}

        <button
          onClick={signOut}
          className="mt-6 w-full text-center text-xs text-muted-foreground underline"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
