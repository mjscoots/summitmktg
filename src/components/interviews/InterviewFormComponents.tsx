import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── ScriptTip — always visible muted text block ─── */
export function ScriptTip({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <div className="rounded-lg border border-border/30 bg-muted/30 p-4 space-y-1">
      {label && (
        <p className="text-[11px] font-semibold text-primary/70 uppercase tracking-wider">{label}</p>
      )}
      <div className="text-xs text-muted-foreground leading-relaxed">
        {children}
      </div>
    </div>
  );
}

/* ─── ChecklistItem ─── */
export function ChecklistItem({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        "flex items-center gap-3 w-full text-left py-2 transition-all duration-150",
        checked ? "text-foreground" : "text-muted-foreground"
      )}
    >
      <div className={cn(
        "w-[18px] h-[18px] rounded border-[1.5px] flex items-center justify-center flex-shrink-0 transition-all duration-150",
        checked ? "bg-success border-success" : "border-border/80 bg-background"
      )}>
        {checked && <CheckCircle2 className="w-3 h-3 text-white" />}
      </div>
      <span className="text-sm">Done</span>
    </button>
  );
}

/* ─── SectionHeader — simple divider ─── */
export function SectionHeader({ children, step }: { children: React.ReactNode; step?: number }) {
  return (
    <div className="pt-6 pb-1 first:pt-0">
      <h2 className="text-base font-semibold text-foreground">{children}</h2>
    </div>
  );
}

/* ─── QuestionCard — minimal wrapper ─── */
export function QuestionCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {children}
    </div>
  );
}

/* ─── Field label ─── */
export function FieldLabel({ children, required = true }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-foreground mb-1.5">
      {children}{required && <span className="text-destructive ml-0.5">*</span>}
    </label>
  );
}

/* ─── Helper text ─── */
export function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground mb-1.5">{children}</p>;
}

/* ─── Shared styles ─── */
export const inputClass = "w-full px-3.5 py-2.5 bg-background border border-border/60 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all placeholder:text-muted-foreground/40";
export const textareaClass = `${inputClass} resize-vertical`;

/* ─── Yes/No Toggle ─── */
export function YesNoToggle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-3">
      <label className="flex items-center gap-2 cursor-pointer">
        <div className={cn(
          "w-4 h-4 rounded-full border-2 flex items-center justify-center",
          value === 'yes' ? "border-primary" : "border-border"
        )}>
          {value === 'yes' && <div className="w-2 h-2 rounded-full bg-primary" />}
        </div>
        <span className="text-sm">Yes</span>
      </label>
      <label className="flex items-center gap-2 cursor-pointer">
        <div className={cn(
          "w-4 h-4 rounded-full border-2 flex items-center justify-center",
          value === 'no' ? "border-primary" : "border-border"
        )}>
          {value === 'no' && <div className="w-2 h-2 rounded-full bg-primary" />}
        </div>
        <span className="text-sm">No I did not, I will tell my manager that I had to schedule for another day.</span>
      </label>
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
