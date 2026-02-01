import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { TrainingTiles } from '@/components/dashboard/TrainingTiles';
import { BookOpen, Users, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type TrainingView = 'selection' | 'rookie' | 'manager';

export default function TrainingPage() {
  const { role, isLoading } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<TrainingView>('selection');
  
  const isManager = role === 'manager' || role === 'admin';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // For rookies, go straight to rookie training
  if (!isManager && view === 'selection') {
    return (
      <AppLayout>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-black text-foreground tracking-tight">
              ROOKIE <span className="text-green-400">TRAINING</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Master the craft and build real income
            </p>
          </div>
          <TrainingTiles filterRole="rookie" />
        </div>
      </AppLayout>
    );
  }

  // Selection view for managers
  if (view === 'selection') {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-black text-foreground tracking-tight">
              SELECT <span className="text-blue-400">TRAINING</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Choose your training path
            </p>
          </div>

          {/* Two Large Selection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rookie Training Card */}
            <button
              onClick={() => setView('rookie')}
              className="group relative p-8 bg-card rounded-2xl border-2 border-green-500/40 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:border-green-500/70 hover:shadow-[0_0_40px_-10px_rgba(34,197,94,0.4)] text-left"
            >
              {/* Gradient overlay */}
              <div className="absolute inset-0 opacity-5 rounded-2xl bg-gradient-to-br from-green-500 to-transparent" />
              
              {/* Role Pill */}
              <div className="absolute top-4 right-4">
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-green-500/15 text-green-400 border border-green-500/30">
                  ROOKIE
                </span>
              </div>

              <div className="relative">
                <div className="p-4 rounded-xl bg-green-500/15 text-green-400 w-fit mb-5">
                  <BookOpen className="w-10 h-10" />
                </div>

                <h2 className="text-2xl font-black text-foreground mb-2 group-hover:text-green-400 transition-colors">
                  Rookie Training
                </h2>
                
                <p className="text-muted-foreground mb-4">
                  Learn Your Pitch, Summer Sales Manual, and Training Videos
                </p>

                <div className="flex items-center gap-2 text-sm text-green-400 font-medium">
                  <span>Enter Training</span>
                  <ArrowLeft className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>

            {/* Manager Training Card */}
            <button
              onClick={() => setView('manager')}
              className="group relative p-8 bg-card rounded-2xl border-2 border-blue-500/40 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:border-blue-500/70 hover:shadow-[0_0_40px_-10px_rgba(59,130,246,0.4)] text-left"
            >
              {/* Gradient overlay */}
              <div className="absolute inset-0 opacity-5 rounded-2xl bg-gradient-to-br from-blue-500 to-transparent" />
              
              {/* Role Pill */}
              <div className="absolute top-4 right-4">
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/30">
                  MANAGER
                </span>
              </div>

              <div className="relative">
                <div className="p-4 rounded-xl bg-blue-500/15 text-blue-400 w-fit mb-5">
                  <Users className="w-10 h-10" />
                </div>

                <h2 className="text-2xl font-black text-foreground mb-2 group-hover:text-blue-400 transition-colors">
                  Manager Training
                </h2>
                
                <p className="text-muted-foreground mb-4">
                  Learn the Basics, Manager Manual, and Manager Videos
                </p>

                <div className="flex items-center gap-2 text-sm text-blue-400 font-medium">
                  <span>Enter Training</span>
                  <ArrowLeft className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Training content view (rookie or manager)
  const isRookieView = view === 'rookie';
  
  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Back button for managers */}
        {isManager && (
          <Button
            variant="ghost"
            onClick={() => setView('selection')}
            className="mb-4 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Selection
          </Button>
        )}

        <div className="mb-6">
          <h1 className="text-3xl font-black text-foreground tracking-tight">
            {isRookieView ? 'ROOKIE' : 'MANAGER'}{' '}
            <span className={isRookieView ? 'text-green-400' : 'text-blue-400'}>TRAINING</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRookieView 
              ? 'Master the craft and build real income' 
              : 'Lead your team to the summit'}
          </p>
        </div>

        <TrainingTiles filterRole={isRookieView ? 'rookie' : 'manager'} />
      </div>
    </AppLayout>
  );
}
