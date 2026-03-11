import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { ExternalLink, FileText, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { InterviewResponsesTable } from '@/components/interviews/InterviewResponsesTable';
import WeeklyOneOnOnesContent from './WeeklyOneOnOnesContent';

type FormSection = 'interviews' | 'weekly-1on1s';
type InterviewSubTab = 'forms' | 'responses';

const badgeGradients = [
  'from-blue-500 to-blue-600',
  'from-violet-500 to-purple-600',
  'from-amber-500 to-orange-500',
];

const badgeGlows = [
  'shadow-[0_0_20px_-4px_rgba(59,130,246,0.5)]',
  'shadow-[0_0_20px_-4px_rgba(139,92,246,0.5)]',
  'shadow-[0_0_20px_-4px_rgba(245,158,11,0.5)]',
];

const cardGlows = [
  'hover:shadow-[0_4px_40px_-12px_rgba(59,130,246,0.15)]',
  'hover:shadow-[0_4px_40px_-12px_rgba(139,92,246,0.15)]',
  'hover:shadow-[0_4px_40px_-12px_rgba(245,158,11,0.15)]',
];

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

export default function FormsPage() {
  const { role, isLoading } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<FormSection>('interviews');
  const [interviewSubTab, setInterviewSubTab] = useState<InterviewSubTab>('forms');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (role !== 'manager' && role !== 'admin' && role !== 'owner') {
    navigate('/app', { replace: true });
    return null;
  }

  return (
    <AppLayout>
      {/* Subtle radial background glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(30,58,138,0.08) 0%, transparent 70%)',
          }}
        />
      </div>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Back Button */}
        <PageBackButton to="/app" label="Dashboard" />

        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <div className="flex items-center gap-3.5 mb-2">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/20 shadow-[0_0_16px_-4px_rgba(249,115,22,0.3)]">
                <FileText className="w-5 h-5 text-orange-400" />
              </div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">Forms</h1>
            </div>
            <p className="text-muted-foreground text-sm ml-[52px]">
              Interview forms and weekly check-ins
            </p>
          </div>

          <a
            href="https://www.gethawx.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-white/[0.06] rounded-lg hover:border-white/10 hover:bg-white/[0.03] transition-all duration-200 backdrop-blur-sm"
          >
            <span>Hawx Admin</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Main Section Toggle */}
        <div className="flex gap-3 mb-8">
          {[
            { key: 'interviews' as FormSection, label: 'Interview Forms' },
            { key: 'weekly-1on1s' as FormSection, label: 'Weekly 1:1 Forms' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveSection(tab.key)}
              className={cn(
                'px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 border',
                activeSection === tab.key
                  ? 'bg-white/[0.06] border-primary/40 text-foreground shadow-[0_0_16px_-6px_hsl(var(--primary)/0.35)] hover:shadow-[0_0_20px_-4px_hsl(var(--primary)/0.4)]'
                  : 'bg-white/[0.02] border-white/[0.06] text-muted-foreground hover:text-foreground hover:bg-white/[0.04] hover:-translate-y-0.5'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeSection === 'interviews' ? (
          <>
            {/* Sub-tabs for interviews */}
            <div className="flex gap-2 mb-8">
              {[
                { key: 'forms' as InterviewSubTab, label: 'Forms' },
                { key: 'responses' as InterviewSubTab, label: 'Responses' },
              ].map((sub) => (
                <button
                  key={sub.key}
                  onClick={() => setInterviewSubTab(sub.key)}
                  className={cn(
                    'text-xs px-3.5 py-1.5 rounded-full border transition-all duration-150',
                    interviewSubTab === sub.key
                      ? 'bg-primary/10 border-primary/30 text-primary font-medium'
                      : 'border-white/[0.06] text-muted-foreground hover:text-foreground hover:border-white/10'
                  )}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            {interviewSubTab === 'forms' ? (
              <>
                {/* Interview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                  {interviewCards.map((card, i) => (
                    <div
                      key={card.number}
                      onClick={() => navigate(card.path)}
                      className={cn(
                        'group flex flex-col rounded-2xl p-6 cursor-pointer transition-all duration-300',
                        'bg-[rgba(18,18,26,0.75)] backdrop-blur-sm',
                        'border border-white/[0.06] hover:border-white/[0.12]',
                        'shadow-[0_2px_20px_-6px_rgba(0,0,0,0.4)]',
                        'hover:-translate-y-1',
                        cardGlows[i]
                      )}
                    >
                      <div className="flex items-start gap-4 mb-5">
                        {/* Number Badge */}
                        <div
                          className={cn(
                            'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
                            'bg-gradient-to-br',
                            badgeGradients[i],
                            badgeGlows[i],
                            'transition-shadow duration-300 group-hover:shadow-lg'
                          )}
                        >
                          <span className="text-white font-bold text-lg">{card.number}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground text-base">{card.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{card.subtitle}</p>
                        </div>
                      </div>

                      <div className="flex-1" />

                      {/* Open Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(card.path);
                        }}
                        className={cn(
                          'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl',
                          'bg-gradient-to-r from-[#3B82F6] to-[#2563EB]',
                          'text-white font-medium text-sm',
                          'transition-all duration-200',
                          'hover:shadow-[0_0_20px_-4px_rgba(59,130,246,0.45)]',
                          'hover:-translate-y-0.5',
                          'active:translate-y-0'
                        )}
                      >
                        <span>Open</span>
                        <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Interview Process Section */}
                <div className="bg-[rgba(18,18,26,0.55)] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6">
                  <h3 className="font-semibold text-foreground mb-2 text-base">Interview Process</h3>
                  <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                    Complete each interview form during your recruiting process. Select the interview you need — no sequence required.
                  </p>
                  <div className="space-y-3">
                    {[
                      { num: 1, text: 'Initial screening and background' },
                      { num: 2, text: 'Commitment and understanding' },
                      { num: 3, text: 'Final decision and onboarding' },
                    ].map((item, i) => (
                      <div key={item.num} className="flex items-center gap-3.5 text-sm">
                        <div
                          className={cn(
                            'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
                            'bg-gradient-to-br',
                            badgeGradients[i],
                            'opacity-80'
                          )}
                        >
                          <span className="text-white font-semibold text-xs">{item.num}</span>
                        </div>
                        <span className="text-foreground font-medium">Interview {item.num}</span>
                        <span className="text-muted-foreground">— {item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <InterviewResponsesTable />
            )}
          </>
        ) : (
          <WeeklyOneOnOnesContent />
        )}
      </main>
    </AppLayout>
  );
}
