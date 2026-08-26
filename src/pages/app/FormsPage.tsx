import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { ExternalLink, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { InterviewResponsesTable } from '@/components/interviews/InterviewResponsesTable';
import WeeklyOneOnOnesContent from './WeeklyOneOnOnesContent';
import ManagerMeetingHubContent from '@/components/forms/ManagerMeetingHubContent';
import CommitmentInterviewContent from '@/components/forms/CommitmentInterviewContent';
import { CopyLinkButton } from '@/components/shared/CopyLinkButton';

type FormSection = 'interviews' | 'weekly-1on1s' | 'manager-meeting' | 'commitment';
type InterviewSubTab = 'forms' | 'responses';

const badgeGradients = ['bg-primary/20', 'bg-primary/15', 'bg-primary/10'];

const badgeGlows = ['', '', ''];

const cardBorderAccents = [
  'hover:border-primary/20',
  'hover:border-violet-500/20',
  'hover:border-primary/20',
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
      <main className="relative max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <PageBackButton to="/app" label="Home" />

        <PageHeader
          title="Forms"
          context="Interview forms and weekly check-ins."
          action={
            <a
              href="https://www.gethawx.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden min-h-11 items-center gap-2 rounded border border-border px-4 text-sm font-medium text-muted-foreground hover:text-foreground sm:flex"
            >
              <span>Hawx admin</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          }
          className="mb-8"
        />

        {/* ── Section Toggle Tabs ── */}
        <div className="relative mb-8 sm:mb-10">
          <div className="absolute inset-x-0 bottom-0 h-px bg-border/50" />
          <div className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[
              { key: 'interviews' as FormSection, label: 'Interview Forms' },
              { key: 'weekly-1on1s' as FormSection, label: 'Weekly 1:1 Forms' },
              { key: 'manager-meeting' as FormSection, label: 'Manager Meeting' },
              { key: 'commitment' as FormSection, label: 'Commitment Interview' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveSection(tab.key)}
                className={cn(
                  'relative min-h-11 shrink-0 whitespace-nowrap rounded-t-xl px-4 text-[13px] font-semibold transition-all duration-180 sm:px-5 sm:text-sm',
                  activeSection === tab.key
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground/80'
                )}
              >
                {tab.label}
                {activeSection === tab.key && (
                  <div className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Content ── */}
        {activeSection === 'interviews' ? (
          <>
            {/* Sub-tabs */}
            <div className="mb-8 flex gap-2">
              {[
                { key: 'forms' as InterviewSubTab, label: 'Forms' },
                { key: 'responses' as InterviewSubTab, label: 'Responses' },
              ].map((sub) => (
                <button
                  key={sub.key}
                  onClick={() => setInterviewSubTab(sub.key)}
                  className={cn(
                    'micro-label min-h-10 rounded-full border px-4 transition-all duration-180',
                    interviewSubTab === sub.key
                      ? 'border-primary/25 bg-primary/10 !text-primary'
                      : 'border-border/50 hover:border-border/80 hover:text-foreground'
                  )}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            {interviewSubTab === 'forms' ? (
              <>
                {/* Interview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
                  {interviewCards.map((card, i) => (
                    <div
                      key={card.number}
                      onClick={() => navigate(card.path)}
                      className={cn(
                        'group relative flex flex-col rounded-2xl cursor-pointer transition-all duration-300',
                        'bg-card/60 backdrop-blur-sm',
                        'border border-white/[0.06]',
                        cardBorderAccents[i],
                        'hover:-translate-y-1',
                        'hover:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)]'
                      )}
                    >
                      {/* Card content */}
                      <div className="p-6 pb-5">
                        <div className="flex items-center gap-3.5 mb-4">
                          <div
                            className={cn(
                              'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                              badgeGradients[i],
                              badgeGlows[i],
                              'transition-all duration-300 group-hover:scale-105'
                            )}
                          >
                            <span className="text-white font-bold text-base">{card.number}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground text-[15px] leading-tight">{card.title}</h3>
                          </div>
                          <ChevronRight className="w-4.5 h-4.5 text-muted-foreground/40 group-hover:text-foreground/60 transition-all duration-200 group-hover:translate-x-0.5 flex-shrink-0" />
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed pl-[3.25rem]">{card.subtitle}</p>
                        <div className="pl-[3.25rem] mt-3" onClick={(e) => e.stopPropagation()}>
                          <CopyLinkButton path={card.path} />
                        </div>
                      </div>

                      {/* Bottom accent line */}
                      <div className={cn(
                        'h-px mx-6 mb-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300',
                        badgeGradients[i]
                      )} />
                      <div className="h-4" />
                    </div>
                  ))}
                </div>

                {/* Interview Process Summary */}
                <div className="rounded-2xl border border-white/[0.06] bg-card/40 backdrop-blur-sm overflow-hidden">
                  <div className="px-6 py-5 border-b border-white/[0.04]">
                    <h3 className="font-semibold text-foreground text-[15px]">Interview Process</h3>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      Complete each interview form during your recruiting process. Select the interview you need — no sequence required.
                    </p>
                  </div>
                  <div className="px-6 py-4 space-y-1">
                    {[
                      { num: 1, text: 'Initial screening and background' },
                      { num: 2, text: 'Commitment and understanding' },
                      { num: 3, text: 'Final decision and onboarding' },
                    ].map((item, i) => (
                      <div key={item.num} className="flex items-center gap-3.5 py-2 text-sm">
                        <div
                          className={cn(
                            'w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0',
                            badgeGradients[i],
                            'opacity-85'
                          )}
                        >
                          <span className="text-white font-semibold text-[10px]">{item.num}</span>
                        </div>
                        <span className="text-foreground font-medium">Interview {item.num}</span>
                        <span className="hidden sm:inline text-muted-foreground/70">—</span>
                        <span className="hidden sm:inline text-muted-foreground">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <InterviewResponsesTable />
            )}
          </>
        ) : activeSection === 'weekly-1on1s' ? (
          <WeeklyOneOnOnesContent />
        ) : activeSection === 'commitment' ? (
          <CommitmentInterviewContent />
        ) : (
          <ManagerMeetingHubContent />
        )}
      </main>
    </AppLayout>
  );
}
