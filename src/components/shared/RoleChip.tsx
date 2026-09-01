import { cn } from '@/lib/utils';
import { useRoleChip } from '@/hooks/useRoleChips';

export type RoleChipLabel = 'Owner' | 'Pillar' | 'Manager' | 'Vet' | 'Rookie';

const TONE: Record<RoleChipLabel, string> = {
  Owner: 'border-accent/40 bg-accent/10 text-accent',
  Pillar: 'border-primary/40 bg-primary/10 text-primary',
  Manager: 'border-primary/25 bg-primary/5 text-primary',
  Vet: 'border-border/70 bg-surface text-foreground',
  Rookie: 'border-border/60 bg-surface text-muted-foreground',
};

/** One quiet chip that names what a person is. Nothing renders when unknown. */
export function RoleChipLabelView({ label, className }: { label: RoleChipLabel; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-md border px-1.5 py-[1px] text-[10px] font-semibold uppercase tracking-wide',
        TONE[label],
        className
      )}
    >
      {label}
    </span>
  );
}

/**
 * Role chip for one person. The label comes from the database (role_chips),
 * so precedence is decided server side: Owner, Admin, Manager, Vet, Rookie.
 * A person with no rep year on file and no role shows no chip at all.
 */
export function RoleChip({ userId, className }: { userId?: string | null; className?: string }) {
  const label = useRoleChip(userId);
  if (!label) return null;
  return <RoleChipLabelView label={label} className={className} />;
}
