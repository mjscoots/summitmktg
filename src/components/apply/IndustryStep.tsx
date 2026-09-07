import { useEffect, useState } from 'react';
import { captureSourceFromUrl, ORGANIC, type SourceAttribution } from '@/lib/source';

export const INDUSTRY_OPTIONS = [
  { value: 'Pest', label: 'Pest control', line: 'Live', disabled: false },
  { value: 'Fiber', label: 'Fiber internet', line: 'Off season lane', disabled: false },
  { value: 'Life', label: 'Life insurance', line: 'Coming', disabled: true },
] as const;

/** Reads ?vertical= and ?ref= once on mount and resolves the source attribution. */
export function useApplicationSource() {
  const [vertical, setVertical] = useState<string>('');
  const [source, setSource] = useState<SourceAttribution>(ORGANIC);

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('vertical') || '';
    const match = INDUSTRY_OPTIONS.find((o) => o.value.toLowerCase() === param.toLowerCase());
    if (match) setVertical(match.value);
    captureSourceFromUrl().then(setSource);
  }, []);

  return { vertical, setVertical, source };
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export default function IndustryStep({ value, onChange, error }: Props) {
  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-foreground mb-2">
        Which Summit are you applying to?<span className="text-destructive"> *</span>
      </label>
      <div className="grid grid-cols-2 gap-2">
        {INDUSTRY_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            disabled={o.disabled}
            className={`min-h-12 rounded-xl border px-3 text-sm font-medium transition-colors ${
              value === o.value
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border/60 text-muted-foreground hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50'
            }`}
          >
            <span className="block">{o.label}</span>
            <span className="mt-1 block text-[12px] font-normal text-muted-foreground">{o.line}</span>
          </button>
        ))}
      </div>
      {error && <p className="text-destructive text-sm mt-1">{error}</p>}
    </div>
  );
}
