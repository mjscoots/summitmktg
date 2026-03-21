import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Pencil, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InterviewResponsesTable } from '@/components/interviews/InterviewResponsesTable';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { isManagerOrAbove } from '@/lib/roles';

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
    subtitle: 'Commitment and understanding',
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
  if (!isManagerOrAbove(role)) {
    navigate('/app', { replace: true });
    return null;
  }

  return (
    <AppLayout>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Back Button */}
        <PageBackButton to="/app/operations" label="Operations" />

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Interview Resources
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Complete interview forms for your recruiting process
            </p>
          </div>
          
          {/* Hawx Admin Link */}
          <a
            href="https://www.gethawx.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border/60 rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
          >
            <span>Hawx Admin</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Tab Toggle - Pill Style */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setActiveTab('forms')}
            className={cn(
              'tab-pill',
              activeTab === 'forms' ? 'tab-pill-active' : 'tab-pill-inactive'
            )}
          >
            Interview Forms
          </button>
          <button
            onClick={() => setActiveTab('responses')}
            className={cn(
              'tab-pill',
              activeTab === 'responses' ? 'tab-pill-active' : 'tab-pill-inactive'
            )}
          >
            Responses
          </button>
        </div>

        {/* Content */}
        {activeTab === 'forms' ? (
          <>
            {/* Interview Cards - Equal height grid with dark blue badges */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
              {interviewCards.map((card) => (
                <div
                  key={card.number}
                  className="flex flex-col bg-card border border-border/50 rounded-xl p-5 card-hover cursor-pointer group"
                  onClick={() => navigate(card.path)}
                >
                  {/* Number Badge (dark blue) + Title */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-[hsl(217,91%,15%)] flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-lg">{card.number}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground">{card.title}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">{card.subtitle}</p>
                    </div>
                  </div>

                  {/* Spacer for equal height */}
                  <div className="flex-1" />

                  {/* Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(card.path);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg transition-all duration-200 hover:bg-primary/85 hover:shadow-[0_0_15px_-5px_hsl(var(--primary)/0.4)]"
                  >
                    <Pencil className="w-4 h-4" />
                    <span>Fill Out Form</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Interview Process Panel */}
            <div className="bg-card border border-border/50 rounded-xl p-5">
              <h3 className="font-semibold text-foreground mb-3">Interview Process</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Complete each interview form during your recruiting process. Select the interview you need - no sequence required.
              </p>
              <div className="space-y-2">
                {[
                  { num: 1, text: 'Initial screening and background' },
                  { num: 2, text: 'Commitment and understanding' },
                  { num: 3, text: 'Final decision and onboarding' },
                ].map((item) => (
                  <div key={item.num} className="flex items-center gap-3 text-sm">
                    <div className="w-6 h-6 rounded bg-[hsl(217,91%,15%)] flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-semibold text-xs">{item.num}</span>
                    </div>
                    <span className="text-foreground">Interview {item.num}</span>
                    <span className="text-muted-foreground">— {item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <InterviewResponsesTable />
        )}
      </main>
    </AppLayout>
  );
}
