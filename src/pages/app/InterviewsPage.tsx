import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { Pencil, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InterviewResponsesTable } from '@/components/interviews/InterviewResponsesTable';

const interviewCards = [
  {
    number: 1,
    title: 'Interview 1',
    subtitle: 'Initial screening and background',
    path: '/app/interviews/1',
  },
  {
    number: 2,
    title: 'Interview 2',
    subtitle: 'Commitment, schedule, and work ethic',
    path: '/app/interviews/2',
  },
  {
    number: 3,
    title: 'Interview 3',
    subtitle: 'Final decision and onboarding',
    path: '/app/interviews/3',
  },
];

export default function InterviewsPage() {
  const { role, isLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'forms' | 'responses'>('forms');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Redirect non-managers
  if (role !== 'manager' && role !== 'admin') {
    navigate('/app', { replace: true });
    return null;
  }

  return (
    <ThemeProvider initialRole="manager">
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          
          <main className="flex-1 p-6 lg:p-8 overflow-auto">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Interview Resources
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Complete interview forms for recruiting and onboarding
                </p>
              </div>
              
              {/* Hawx Admin Link */}
              <a
                href="https://www.gethawx.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg hover:border-primary/50 transition-colors"
              >
                <span>Hawx Admin</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {/* Tab Toggle */}
            <div className="flex gap-2 mb-8">
              <button
                onClick={() => setActiveTab('forms')}
                className={cn(
                  'px-5 py-2.5 rounded-lg font-medium text-sm transition-all',
                  activeTab === 'forms'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                Interview Forms
              </button>
              <button
                onClick={() => setActiveTab('responses')}
                className={cn(
                  'px-5 py-2.5 rounded-lg font-medium text-sm transition-all',
                  activeTab === 'responses'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                Responses
              </button>
            </div>

            {/* Content */}
            {activeTab === 'forms' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {interviewCards.map((card) => (
                  <div
                    key={card.number}
                    className="flex flex-col bg-card border border-border rounded-xl p-5 hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
                  >
                    {/* Number Badge */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-yellow-500 flex items-center justify-center">
                        <span className="text-black font-bold text-lg">{card.number}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{card.title}</h3>
                        <p className="text-sm text-muted-foreground mt-0.5">{card.subtitle}</p>
                      </div>
                    </div>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Button */}
                    <button
                      onClick={() => navigate(card.path)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-muted hover:bg-muted/80 text-foreground font-medium rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                      <span>Fill Out Form</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <InterviewResponsesTable />
            )}
          </main>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
}
