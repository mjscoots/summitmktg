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
  glow: string;
  managerOnly?: boolean;
}

const cards: AnalyticsCard[] = [
  {
    id: 'stats',
    label: 'Stats',
    description: 'Team training, progress, and accountability',
    icon: Swords,
    path: '/app/war-room',
    gradient: 'from-red-500 to-orange-500',
    glow: 'shadow-[0_0_20px_-4px_rgba(239,68,68,0.4)]',
    managerOnly: true,
  },
  {
    id: 'calculators',
    label: 'Calculators',
    description: 'Estimate your earning potential',
    icon: Calculator,
    path: '/app/calculators',
    gradient: 'from-emerald-500 to-teal-500',
    glow: 'shadow-[0_0_20px_-4px_rgba(16,185,129,0.4)]',
  },
];

export default function AnalyticsPage() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const isManager = role === 'manager' || role === 'admin' || role === 'owner';

  const availableCards = cards.filter(c => !c.managerOnly || isManager);

  return (
    <AppLayout>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <PageBackButton to="/app" label="Dashboard" />

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3.5 mb-2">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/20 shadow-[0_0_16px_-4px_rgba(16,185,129,0.3)]">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Analytics</h1>
          </div>
          <p className="text-muted-foreground text-sm ml-[52px]">
            Data and performance tools
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {availableCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                onClick={() => navigate(card.path)}
                className={cn(
                  'group flex flex-col rounded-2xl p-6 cursor-pointer transition-all duration-300',
                  'bg-[rgba(18,18,26,0.75)] backdrop-blur-sm',
                  'border border-white/[0.06] hover:border-white/[0.12]',
                  'shadow-[0_2px_20px_-6px_rgba(0,0,0,0.4)]',
                  'hover:-translate-y-1 hover:shadow-[0_4px_40px_-12px_rgba(59,130,246,0.15)]'
                )}
              >
                <div className="flex items-start gap-4 mb-5">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                      'bg-gradient-to-br',
                      card.gradient,
                      card.glow,
                      'transition-shadow duration-300 group-hover:shadow-lg'
                    )}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-lg">{card.label}</h3>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{card.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-foreground transition-colors flex-shrink-0 mt-1" />
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </AppLayout>
  );
}
