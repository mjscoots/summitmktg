import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { useAuth } from '@/hooks/useAuth';
import RookieCalculator from '@/components/RookieCalculator';
import VetCalculator from '@/components/VetCalculator';
import { cn } from '@/lib/utils';
import { Calculator, DollarSign, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

type CalcTab = 'rookie' | 'vet';

export default function CalculatorsPage() {
  const { role, profile } = useAuth();
  const navigate = useNavigate();
  const isManager = role === 'manager' || role === 'admin' || role === 'owner';
  const isVet = profile?.experience === 'veteran';

  // Role-based: rookies see rookie only, vets see vet only, managers see both
  const availableTabs: { id: CalcTab; label: string }[] = isManager
    ? [{ id: 'rookie', label: 'Rookie Calculator' }, { id: 'vet', label: 'Vet Calculator' }]
    : isVet
      ? [{ id: 'vet', label: 'Vet Calculator' }]
      : [{ id: 'rookie', label: 'Rookie Calculator' }];

  const [activeTab, setActiveTab] = useState<CalcTab>(availableTabs[0].id);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <PageBackButton to="/app/links" label="Resources" />

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/15 border border-emerald-500/20">
              <Calculator className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Calculators</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Estimate your earning potential</p>
            </div>
          </div>

          {/* Estimate My Earnings CTA */}
          <Button
            onClick={() => navigate('/app/estimate-earnings')}
            className="gap-2 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 shadow-lg shadow-primary/20"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Estimate My Earnings</span>
            <span className="sm:hidden">Estimate</span>
          </Button>
        </div>

        {/* Tab Bar */}
        {availableTabs.length > 1 && (
          <div className="p-1 bg-muted/50 rounded-xl mb-6 border border-border/30 w-fit">
            <div className="flex">
              {availableTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "px-5 py-2 text-xs font-bold rounded-lg transition-all duration-200",
                    activeTab === tab.id
                      ? "bg-card text-foreground shadow-md border border-border/50"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'rookie' && <RookieCalculator />}
        {activeTab === 'vet' && <VetCalculator />}
      </div>
    </AppLayout>
  );
}
