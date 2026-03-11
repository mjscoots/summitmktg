import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageBackButton } from '@/components/shared/PageBackButton';
import RookieCalculator from '@/components/RookieCalculator';
import VetCalculator from '@/components/VetCalculator';
import { cn } from '@/lib/utils';
import { Calculator } from 'lucide-react';

type CalcTab = 'rookie' | 'vet';

export default function CalculatorsPage() {
  const [activeTab, setActiveTab] = useState<CalcTab>('rookie');

  const TABS: { id: CalcTab; label: string }[] = [
    { id: 'rookie', label: 'Rookie Calculator' },
    { id: 'vet', label: 'Vet Calculator' },
  ];

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <PageBackButton to="/app/analytics" label="Analytics" />

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/20">
            <Calculator className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Calculators</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Estimate your earning potential</p>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="p-1 bg-muted/50 rounded-xl mb-6 border border-border/30 w-fit">
          <div className="flex">
            {TABS.map((tab) => (
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

        {activeTab === 'rookie' && <RookieCalculator />}
        {activeTab === 'vet' && <VetCalculator />}
      </div>
    </AppLayout>
  );
}
