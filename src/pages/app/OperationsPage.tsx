import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { Wrench, FileText, Calendar, Link2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OpCard {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  gradient: string;
  glow: string;
  hoverBorder: string;
  managerOnly?: boolean;
}

const cards: OpCard[] = [
  {
    id: 'forms',
    label: 'Forms',
    description: 'Interview forms and weekly check-ins',
    icon: FileText,
    path: '/app/forms',
    gradient: 'from-orange-500 to-amber-500',
    glow: 'shadow-[0_0_24px_-6px_rgba(249,115,22,0.45)]',
    hoverBorder: 'hover:border-orange-500/20',
    managerOnly: true,
  },
  {
    id: 'calendar',
    label: 'Calendar',
    description: 'Team events, calls, and scheduling',
    icon: Calendar,
    path: '/app/calendar',
    gradient: 'from-red-500 to-rose-500',
    glow: 'shadow-[0_0_24px_-6px_rgba(239,68,68,0.45)]',
    hoverBorder: 'hover:border-red-500/20',
  },
  {
    id: 'resources',
    label: 'Resources',
    description: 'Links, phone numbers, and tools',
    icon: Link2,
    path: '/app/links',
    gradient: 'from-violet-500 to-purple-500',
    glow: 'shadow-[0_0_24px_-6px_rgba(139,92,246,0.45)]',
    hoverBorder: 'hover:border-violet-500/20',
  },
];

export default function OperationsPage() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const isManager = role === 'manager' || role === 'admin' || role === 'owner';

  const availableCards = cards.filter(c => !c.managerOnly || isManager);

  return (
    <AppLayout>
      <main className="relative max-w-5xl mx-auto px-4 sm:px-6 py-8 overflow-hidden">
        {/* Ambient background glow */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-primary/[0.04] blur-[120px]" />
        </div>

        <PageBackButton to="/app" label="Dashboard" />

        {/* ── Hero Header ── */}
        <div className="mb-12">
          <div className="flex items-start gap-4">
            {/* Icon badge with glow halo */}
            <div className="relative mt-0.5">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/30 to-blue-400/20 blur-xl" />
              <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/25 to-blue-500/15 border border-primary/20 flex items-center justify-center shadow-[0_0_24px_-6px_hsl(var(--primary)/0.4)]">
                <Wrench className="w-5.5 h-5.5 text-primary" />
              </div>
            </div>
            {/* Title block */}
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight leading-none">
                Operations
              </h1>
              <p className="text-muted-foreground text-sm mt-1.5">
                Operational tools for running your team
              </p>
            </div>
          </div>
        </div>

        {/* ── Cards Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {availableCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                onClick={() => navigate(card.path)}
                className={cn(
                  'group relative rounded-2xl p-5 cursor-pointer transition-all duration-300',
                  'bg-[rgba(18,18,26,0.75)] backdrop-blur-sm',
                  'border border-white/[0.06]',
                  card.hoverBorder,
                  'hover:-translate-y-1',
                  'hover:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)]'
                )}
              >
                <div className="flex items-center gap-3.5">
                  {/* Icon badge with glow */}
                  <div className="relative flex-shrink-0">
                    <div className={cn(
                      'absolute inset-0 rounded-xl blur-lg opacity-0 group-hover:opacity-60 transition-opacity duration-500',
                      'bg-gradient-to-br',
                      card.gradient
                    )} />
                    <div
                      className={cn(
                        'relative w-11 h-11 rounded-xl flex items-center justify-center',
                        'bg-gradient-to-br',
                        card.gradient,
                        card.glow,
                        'transition-all duration-300 group-hover:scale-105'
                      )}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-[15px] leading-tight">{card.label}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{card.description}</p>
                  </div>

                  <ChevronRight className="w-4.5 h-4.5 text-muted-foreground/30 group-hover:text-foreground/60 transition-all duration-200 group-hover:translate-x-0.5 flex-shrink-0" />
                </div>

                {/* Bottom accent line on hover */}
                <div className={cn(
                  'absolute bottom-0 inset-x-4 h-px rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300',
                  'bg-gradient-to-r',
                  card.gradient
                )} />
              </div>
            );
          })}
        </div>
      </main>
    </AppLayout>
  );
}
