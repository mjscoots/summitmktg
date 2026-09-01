import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { experienceLabel } from '@/lib/experience';
import { ExperienceStars } from '@/components/shared/ExperienceStars';
import { refreshIdentity } from '@/hooks/useIdentityChips';

/**
 * Years in the industry, set through set_years_in_industry().
 *
 * A person can set their own number once. Their manager, Pillar or the Owner can
 * correct it any time and every change is written to the audit log by the server.
 */
export function YearsInIndustryField({
  userId,
  self = false,
  onSaved,
}: {
  userId: string;
  /** True when the signed in person is looking at their own record. */
  self?: boolean;
  onSaved?: (years: number) => void;
}) {
  const [years, setYears] = useState<number | null>(null);
  const [selfSet, setSelfSet] = useState(false);
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('years_in_industry, years_self_set_at')
        .eq('user_id', userId)
        .maybeSingle();
      if (cancelled) return;
      const row = (data || {}) as { years_in_industry?: number | null; years_self_set_at?: string | null };
      setYears(row.years_in_industry ?? null);
      setSelfSet(!!row.years_self_set_at);
      setValue(row.years_in_industry ? String(row.years_in_industry) : '');
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const locked = self && selfSet;

  const save = async () => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 1 || n > 40) {
      toast.error('Enter a number between 1 and 40.');
      return;
    }
    setSaving(true);
    const { data, error } = await (supabase as any).rpc('set_years_in_industry', {
      _user_id: userId,
      _years: Math.round(n),
    });
    setSaving(false);
    const result = (data || {}) as { success?: boolean; error?: string };
    if (error || !result.success) {
      toast.error(result.error || 'That change was not allowed.');
      return;
    }
    setYears(Math.round(n));
    if (self) setSelfSet(true);
    refreshIdentity(userId);
    onSaved?.(Math.round(n));
    toast.success('Years in the industry saved');
  };

  if (loading) return null;

  return (
    <div className="space-y-2">
      <label htmlFor={`years-${userId}`} className="block text-sm font-medium text-foreground">
        Years in the industry
      </label>
      {locked ? (
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-foreground">
            {years} {years === 1 ? 'year' : 'years'}
          </span>
          <ExperienceStars years={years} showLabel />
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Input
            id={`years-${userId}`}
            type="number"
            min={1}
            max={40}
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="min-h-11 w-24"
            placeholder="1"
          />
          <Button className="min-h-11" disabled={saving || !value.trim()} onClick={save}>
            {saving ? 'Saving' : 'Save'}
          </Button>
          <ExperienceStars years={Number(value) || null} />
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {locked
          ? 'You already set this. Ask your manager if it needs a correction.'
          : self
            ? 'You can set this once. After that your manager can correct it.'
            : `Managers, Pillars and the Owner can correct this at any time. ${
                experienceLabel(years) ? `On file now: ${experienceLabel(years)}.` : 'Nothing on file yet.'
              }`}
      </p>
    </div>
  );
}
