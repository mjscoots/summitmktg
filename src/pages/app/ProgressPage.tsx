import { ThemeProvider } from '@/contexts/ThemeContext';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { TrainingTiles } from '@/components/dashboard/TrainingTiles';
import { useAuth } from '@/hooks/useAuth';
import { GraduationCap } from 'lucide-react';

export default function ProgressPage() {
  const { role } = useAuth();
  const isManager = role === 'manager' || role === 'admin';

  return (
    <ThemeProvider initialRole={isManager ? 'manager' : 'rookie'}>
      <div className="min-h-screen bg-background">
        <DashboardHeader />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-primary" />
              My Progress
            </h1>
            <p className="text-muted-foreground mt-1">
              Track your training journey
            </p>
          </div>

          <TrainingTiles />
        </main>
      </div>
    </ThemeProvider>
  );
}
