import { useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronRight, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── ScriptTip (collapsible) ─── */
export function ScriptTip({ children, label = 'Script tip' }: { children: React.ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={cn(
        "w-full text-left rounded-lg border transition-all duration-200",
        open
          ? "bg-primary/5 border-primary/20 p-3"
          : "bg-primary/[0.03] border-primary/10 px-3 py-2 hover:bg-primary/5"
      )}
    >
      <div className="flex items-center gap-2">
        <Lightbulb className="w-3.5 h-3.5 text-primary flex-shrink-0" />
        <span className="text-[11px] font-semibold text-primary/80 uppercase tracking-wider flex-1">{label}</span>
        {open ? <ChevronDown className="w-3 h-3 text-primary/60" /> : <ChevronRight className="w-3 h-3 text-primary/60" />}
      </div>
      {open && (
        <div className="mt-2 text-xs text-muted-foreground leading-relaxed pl-5.5" onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      )}
    </button>
  );
}

/* ─── ChecklistItem ─── */
export function ChecklistItem({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        "flex items-center gap-3 w-full text-left px-3.5 py-2.5 rounded-lg border transition-all duration-150",
        checked
          ? "bg-success/8 border-success/25 text-foreground"
          : "bg-background border-border/60 hover:border-primary/30 text-muted-foreground"
      )}
    >
      <div className={cn(
        "w-[18px] h-[18px] rounded-[5px] border-[1.5px] flex items-center justify-center flex-shrink-0 transition-all duration-150",
        checked ? "bg-success border-success" : "border-border/80"
      )}>
        {checked && <CheckCircle2 className="w-3 h-3 text-white" />}
      </div>
      <span className="text-sm">{label}</span>
    </button>
  );
}

/* ─── SectionHeader ─── */
export function SectionHeader({ children, step }: { children: React.ReactNode; step?: number }) {
  return (
    <div className="pt-8 pb-1 first:pt-0">
      <div className="flex items-center gap-2.5">
        {step && (
          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-[11px] font-bold text-primary">{step}</span>
          </div>
        )}
        <h2 className="text-[15px] font-bold text-foreground tracking-tight">{children}</h2>
      </div>
      <div className="mt-2 h-px bg-border/40" />
    </div>
  );
}

/* ─── QuestionCard — groups related fields ─── */
export function QuestionCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      "p-4 rounded-xl border border-border/40 bg-card/50 space-y-3",
      className
    )}>
      {children}
    </div>
  );
}

/* ─── Field label ─── */
export function FieldLabel({ children, required = true }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-foreground mb-1.5">
      {children}{required && <span className="text-primary/60 ml-0.5">*</span>}
    </label>
  );
}

/* ─── Helper text ─── */
export function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] text-muted-foreground/70 mb-1.5">{children}</p>;
}

/* ─── Shared styles ─── */
export const inputClass = "w-full px-3.5 py-2.5 bg-background border border-border/60 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all placeholder:text-muted-foreground/40";
export const textareaClass = `${inputClass} resize-none`;

/* ─── Yes/No Toggle ─── */
export function YesNoToggle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange('yes')}
        className={cn(
          'flex-1 py-2.5 rounded-lg font-medium transition-all border text-sm',
          value === 'yes'
            ? 'bg-success/10 text-success border-success/30'
            : 'bg-background text-muted-foreground/60 border-border/50 hover:border-success/40'
        )}
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => onChange('no')}
        className={cn(
          'flex-1 py-2.5 rounded-lg font-medium transition-all border text-sm',
          value === 'no'
            ? 'bg-destructive/10 text-destructive border-destructive/30'
            : 'bg-background text-muted-foreground/60 border-border/50 hover:border-destructive/40'
        )}
      >
        No
      </button>
    </div>
  );
}

/* ─── Rating Scale ─── */
export function RatingScale({ value, onChange, max = 10 }: { value: string; onChange: (v: string) => void; max?: number }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: max }, (_, i) => i + 1).map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(String(n))}
          className={cn(
            "w-9 h-9 rounded-lg font-semibold text-sm transition-all border",
            value === String(n)
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-background text-muted-foreground/60 border-border/50 hover:border-primary/40 hover:text-foreground"
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
