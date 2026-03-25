import { AppLayout } from '@/components/layout/AppLayout';
import { TrainingTiles } from '@/components/dashboard/TrainingTiles';
import { useAuth } from '@/hooks/useAuth';
import { GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageBackButton } from '@/components/shared/PageBackButton';

export default function ProgressPage() {
  const { role } = useAuth();
  const isManager = role === 'manager' || role === 'admin' || role === 'owner';

  return (
    <AppLayout>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <PageBackButton to="/app" label="Dashboard" />

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <GraduationCap className={cn(
              "w-6 h-6",
              isManager ? "text-blue-400" : "text-primary"
            )} />
            My Progress
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your training journey
          </p>
        </div>

        <TrainingTiles />
      </main>
    </AppLayout>
  );
}
