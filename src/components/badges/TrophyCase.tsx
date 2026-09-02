import { ShieldCheck, MapPin, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStatusBadges } from '@/hooks/useStatusBadges';

const CASE = 'rounded-2xl border border-white/[0.06] bg-card/60 backdrop-blur-sm';
const PLATE =
  'rounded-xl border border-primary/30 bg-gradient-to-b from-primary/15 to-transparent px-3 py-2 shadow-[inset_0_1px_0_hsl(var(--primary)/0.3)]';

function Engraved({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
      {children}
    </span>
  );
}

function Row({
  icon,
  label,
  earned,
  empty,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  earned: boolean;
  empty: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="border-t border-white/[0.05] px-4 py-3 first:border-t-0">
      <div className="flex items-center gap-2">
        <span className={cn('text-primary', !earned && 'text-muted-foreground/50')} aria-hidden="true">
          {icon}
        </span>
        <Engraved>{label}</Engraved>
      </div>
      <div className="mt-2">
        {earned ? children : <p className="text-[12px] text-muted-foreground">{empty}</p>}
      </div>
    </div>
  );
}

/** Dark plate case holding the three display only badges for one person. */
export function TrophyCase({ userId, className }: { userId?: string | null; className?: string }) {
  const badges = useStatusBadges(userId);
  const lockedIn = badges?.locked_in === true;
  const patches = badges?.blitz_patches ?? [];
  const stars = badges?.recruiter_stars ?? 0;

  return (
    <section className={cn(CASE, className)} aria-label="Trophy case">
      <header className="px-4 pt-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-foreground">
          Trophy case
        </h2>
      </header>

      <div className="mt-2">
        <Row
          icon={<ShieldCheck className="h-4 w-4" />}
          label="Locked in 2027"
          earned={lockedIn}
          empty="Sign for 2027 to lock this in."
        >
          <span className={PLATE}>
            <span className="text-[12px] font-semibold text-primary">Locked in for 2027</span>
          </span>
        </Row>

        <Row
          icon={<MapPin className="h-4 w-4" />}
          label="Blitz patches"
          earned={patches.length > 0}
          empty="Attend an official blitz."
        >
          <div className="flex flex-wrap gap-2">
            {patches.map((p, i) => (
              <span key={`${p.title}-${p.year}-${i}`} className={PLATE}>
                <span className="text-[12px] font-semibold text-primary">{p.title}</span>
                <span className="ml-1.5 text-[11px] text-muted-foreground">{p.year}</span>
              </span>
            ))}
          </div>
        </Row>

        <Row
          icon={<Star className="h-4 w-4" />}
          label="Recruiter stars"
          earned={stars > 0}
          empty="Bring someone in through your link and get them fully onboarded."
        >
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(stars, 10) }).map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-primary text-primary" aria-hidden="true" />
            ))}
            <span className="ml-1.5 text-[11px] text-muted-foreground">
              {stars === 1 ? '1 person fully onboarded' : `${stars} people fully onboarded`}
            </span>
          </div>
        </Row>
      </div>
      <div className="h-2" />
    </section>
  );
}
