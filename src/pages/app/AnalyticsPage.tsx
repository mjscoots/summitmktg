import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { BarChart3, Swords, Calculator, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnalyticsCard {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  gradient: string;
  glowColor: string;
  hoverBorder: string;
  managerOnly?: boolean;
}

const cards: AnalyticsCard[] = [
  {
    id: 'stats',
    label: 'Stats',
    description: 'Team training, progress, and accountability',
    icon: Swords,
    path: '/app/war-room',
    gradient: 'from-orange-500 to-rose-500',
    glowColor: 'rgba(249,115,22,0.35)',
    hoverBorder: 'hover:border-orange-500/25',
    managerOnly: true,
  },
  {
    id: 'calculators',
    label: 'Calculators',
    description: 'Estimate earnings and performance potential',
    icon: Calculator,
    path: '/app/calculators',
    gradient: 'from-teal-500 to-emerald-500',
    glowColor: 'rgba(20,184,166,0.35)',
    hoverBorder: 'hover:border-teal-500/25',
  },
];

export default function AnalyticsPage() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const isManager = role === 'manager' || role === 'admin' || role === 'owner';

  const availableCards = cards.filter(c => !c.managerOnly || isManager);

  return (
    <AppLayout>
      <main className="relative max-w-5xl mx-auto px-4 sm:px-6 py-8 min-h-[70vh]">
        {/* Ambient background glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-teal-500/[0.04] blur-[100px]" />
        </div>

        <div className="relative z-10">
          <PageBackButton to="/app" label="Dashboard" />

          {/* Hero Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-1.5">
              <div className="relative">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-500/30 to-teal-500/20 blur-lg scale-150 opacity-60" />
                <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/25 to-teal-500/15 border border-emerald-500/20">
                  <BarChart3 className="w-5.5 h-5.5 text-emerald-400" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight">Analytics</h1>
                <p className="text-muted-foreground text-sm mt-0.5">
                  Data and performance tools
                </p>
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          <div className={cn(
            'grid gap-5',
            availableCards.length === 1 ? 'grid-cols-1 max-w-lg' : 'grid-cols-1 md:grid-cols-2'
          )}>
            {availableCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.id}
                  onClick={() => navigate(card.path)}
                  className={cn(
                    'group relative rounded-2xl p-6 cursor-pointer transition-all duration-300',
                    'bg-[rgba(18,18,26,0.8)] backdrop-blur-sm',
                    'border border-white/[0.06]',
                    card.hoverBorder,
                    'hover:-translate-y-1',
                    'shadow-[0_2px_24px_-8px_rgba(0,0,0,0.5)]',
                    'hover:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6)]'
                  )}
                >
                  {/* Subtle top gradient accent */}
                  <div className={cn(
                    'absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300',
                    card.gradient
                  )} />

                  <div className="flex items-center gap-4">
                    {/* Icon badge with glow halo */}
                    <div className="relative flex-shrink-0">
                      <div
                        className="absolute inset-0 rounded-xl blur-xl scale-150 opacity-40 group-hover:opacity-70 transition-opacity duration-300"
                        style={{ backgroundColor: card.glowColor }}
                      />
                      <div
                        className={cn(
                          'relative w-12 h-12 rounded-xl flex items-center justify-center',
                          'bg-gradient-to-br',
                          card.gradient,
                          'transition-all duration-300',
                          'group-hover:scale-105'
                        )}
                      >
                        <Icon className="w-5.5 h-5.5 text-white" />
                      </div>
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground text-[17px] leading-tight">
                        {card.label}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                        {card.description}
                      </p>
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="w-5 h-5 text-muted-foreground/30 group-hover:text-foreground/60 group-hover:translate-x-0.5 transition-all duration-300 flex-shrink-0" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </AppLayout>
  );
}