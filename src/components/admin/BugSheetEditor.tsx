import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

/**
 * The local seasonal insect list Doors mode reads. Lives with the playbook,
 * which is where the rest of the door content is edited.
 */
export function BugSheetEditor() {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'pest_bug_sheet')
        .maybeSingle();
      if (alive) setValue((data as { value: string | null } | null)?.value ?? '');
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="mb-6 rounded-[var(--radius)] border border-border/40 bg-card/60 p-4">
      <h2 className="text-lg font-bold text-foreground">Doors bug sheet</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Paste the local seasonal insect list. Until this is filled, Doors mode says a manager loads
        it here. Plain text, one line per pest.
      </p>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={8}
        placeholder="Spring: ants, spiders&#10;Summer: wasps, earwigs"
        className="mt-3 w-full rounded-xl border border-border/30 bg-card/60 p-3 text-[15px] text-foreground"
      />
      <Button
        variant="outline"
        className="mt-3 min-h-11"
        disabled={saving}
        onClick={async () => {
          setSaving(true);
          const { error } = await supabase
            .from('app_settings')
            .upsert({ key: 'pest_bug_sheet', value: value.trim() }, { onConflict: 'key' });
          if (error) toast.error('Could not save the bug sheet');
          else toast.success('Bug sheet saved');
          setSaving(false);
        }}
      >
        Save bug sheet
      </Button>
    </div>
  );
}
