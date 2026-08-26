import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ALL = '__all__';

interface Props {
  value: string | null;
  onChange: (v: string | null) => void;
  /** Presidents cannot move content out of their own workspace. */
  lockedTo?: string | null;
  label?: string;
}

/**
 * Admin scope control for content rows. Empty (All industries) means the item
 * is company-wide and shows inside every workspace.
 */
export function VerticalScopeSelect({ value, onChange, lockedTo, label = 'Industry' }: Props) {
  const [options, setOptions] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from('verticals')
        .select('vertical, name, display_order')
        .order('display_order');
      setOptions(((data as { vertical: string }[]) || []).map((v) => v.vertical));
    })();
  }, []);

  if (lockedTo) {
    return (
      <div className="space-y-1.5">
        <Label>{label}</Label>
        <p className="text-sm text-muted-foreground">{lockedTo}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select
        value={value ?? ALL}
        onValueChange={(v) => onChange(v === ALL ? null : v)}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All industries</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        All industries means every workspace sees this item.
      </p>
    </div>
  );
}
