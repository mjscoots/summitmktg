import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { InterviewCard } from '@/components/interviews/InterviewCard';
import { InterviewPhilosophy } from '@/components/interviews/InterviewPhilosophy';
import { DopamineCurve } from '@/components/interviews/DopamineCurve';
import { ClipboardList, UserCheck, Award } from 'lucide-react';

export default function InterviewsPage() {
  const { role, isLoading } = useAuth();
  const navigate = useNavigate();
  const [completedInterviews, setCompletedInterviews] = useState<number[]>([]);

  // Load completed interviews from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('summit_completed_interviews');
    if (stored) {
      setCompletedInterviews(JSON.parse(stored));
    }
  }, []);

  // Redirect non-managers
  useEffect(() => {
    if (!isLoading && role !== 'manager' && role !== 'admin') {
      navigate('/app', { replace: true });
    }
  }, [role, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const isInterview1Complete = completedInterviews.includes(1);
  const isInterview2Complete = completedInterviews.includes(2);

  return (
    <ThemeProvider initialRole="manager">
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          
          <main className="flex-1 p-6 lg:p-8 overflow-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-black text-foreground tracking-tight">
                Interview <span className="text-blue-400">Resources</span>
              </h1>
              <p className="text-muted-foreground mt-1">
                Structured interviews to identify commitment, coachability, and work ethic
              </p>
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <ClipboardList className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-400">Interview Forms</span>
              </div>
            </div>

            {/* Philosophy Section */}
            <InterviewPhilosophy />

            {/* Interview Cards */}
            <div className="mb-10">
              <h2 className="text-lg font-bold text-foreground mb-5">Interview Sequence</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <InterviewCard
                  number={1}
                  title="Screening & Mindset"
                  color="yellow"
                  purpose="Filter interest, self-awareness, coachability, and basic sales thinking."
                  dopamineGoal="Curiosity + belief + low pressure"
                  icon={ClipboardList}
                  isLocked={false}
                  isComplete={isInterview1Complete}
                  onClick={() => navigate('/app/interviews/1')}
                />
                <InterviewCard
                  number={2}
                  title="Commitment & Understanding"
                  color="orange"
                  purpose="Test understanding of pay, schedule, effort, and long-term thinking."
                  dopamineGoal="Investment + seriousness + identity shift"
                  icon={UserCheck}
                  isLocked={!isInterview1Complete}
                  isComplete={isInterview2Complete}
                  onClick={() => navigate('/app/interviews/2')}
                />
                <InterviewCard
                  number={3}
                  title="Offer & Decision"
                  color="red"
                  purpose="Test decisiveness, objection handling, and final commitment."
                  dopamineGoal="Pressure + clarity + win-or-walk moment"
                  icon={Award}
                  isLocked={!isInterview2Complete}
                  isComplete={completedInterviews.includes(3)}
                  onClick={() => navigate('/app/interviews/3')}
                />
              </div>
            </div>

            {/* Dopamine Curve */}
            <DopamineCurve />
          </main>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
}
