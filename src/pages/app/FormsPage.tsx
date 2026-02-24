import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { ExternalLink, FileText, Calendar, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { InterviewResponsesTable } from '@/components/interviews/InterviewResponsesTable';
import WeeklyOneOnOnesContent from './WeeklyOneOnOnesContent';
import { useSchedulingRequests } from '@/hooks/useSchedulingRequests';
import { SchedulingRequestCard } from '@/components/scheduling/SchedulingFlow';
import { Badge } from '@/components/ui/badge';

type FormSection = 'interviews' | 'weekly-1on1s' | 'scheduling';
type InterviewSubTab = 'forms' | 'responses';

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
  const { pendingForMe, requests, confirmRequest, cancelRequest } = useSchedulingRequests();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (role !== 'manager' && role !== 'admin') {
    navigate('/app', { replace: true });
    return null;
  }

  return (
    <AppLayout>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Back Button */}
        <PageBackButton to="/app" label="Dashboard" />

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-xl bg-orange-500/10">
                <FileText className="w-5 h-5 text-orange-500" />
              </div>
              <h1 className="text-2xl font-semibold text-foreground">Forms</h1>
            </div>
            <p className="text-muted-foreground text-sm mt-1 ml-[44px]">
              Interview forms and weekly check-ins
            </p>
          </div>
          
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

        {/* Main Section Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveSection('interviews')}
            className={cn(
              'tab-pill',
              activeSection === 'interviews' ? 'tab-pill-active' : 'tab-pill-inactive'
            )}
          >
            Interview Forms
          </button>
          <button
            onClick={() => setActiveSection('weekly-1on1s')}
            className={cn(
              'tab-pill',
              activeSection === 'weekly-1on1s' ? 'tab-pill-active' : 'tab-pill-inactive'
            )}
          >
            Weekly 1:1 Forms
          </button>
          <button
            onClick={() => setActiveSection('scheduling')}
            className={cn(
              'tab-pill relative',
              activeSection === 'scheduling' ? 'tab-pill-active' : 'tab-pill-inactive'
            )}
          >
            <Calendar className="w-3.5 h-3.5 mr-1 inline" />
            1:1 Scheduling
            {pendingForMe.length > 0 && (
              <Badge variant="destructive" className="ml-1.5 text-[9px] px-1.5 py-0 h-4">{pendingForMe.length}</Badge>
            )}
          </button>
        </div>

        {/* Content */}
        {activeSection === 'interviews' ? (
          <>
            {/* Sub-tabs for interviews */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setInterviewSubTab('forms')}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-full border transition-all duration-150',
                  interviewSubTab === 'forms'
                    ? 'bg-primary/10 border-primary/30 text-primary font-medium'
                    : 'border-border/50 text-muted-foreground hover:text-foreground hover:border-border'
                )}
              >
                Forms
              </button>
              <button
                onClick={() => setInterviewSubTab('responses')}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-full border transition-all duration-150',
                  interviewSubTab === 'responses'
                    ? 'bg-primary/10 border-primary/30 text-primary font-medium'
                    : 'border-border/50 text-muted-foreground hover:text-foreground hover:border-border'
                )}
              >
                Responses
              </button>
            </div>

            {interviewSubTab === 'forms' ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                  {interviewCards.map((card) => (
                    <div
                      key={card.number}
                      className="flex flex-col bg-card border border-border/50 rounded-xl p-5 card-hover cursor-pointer group"
                      onClick={() => navigate(card.path)}
                    >
                      <div className="flex items-start gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-[hsl(217,91%,15%)] flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-lg">{card.number}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground">{card.title}</h3>
                          <p className="text-sm text-muted-foreground mt-0.5">{card.subtitle}</p>
                        </div>
                      </div>
                      <div className="flex-1" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(card.path);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg transition-all duration-200 hover:bg-primary/85 hover:shadow-[0_0_15px_-5px_hsl(var(--primary)/0.4)]"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Open</span>
                      </button>
                    </div>
                  ))}
                </div>

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
          </>
        ) : activeSection === 'scheduling' ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              1:1 Scheduling Requests
            </h2>
            {pendingForMe.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-yellow-400" />
                  {pendingForMe.length} pending request{pendingForMe.length !== 1 ? 's' : ''} for you
                </p>
                {pendingForMe.map(r => (
                  <SchedulingRequestCard
                    key={r.id}
                    request={r}
                    onConfirm={(id, time) => confirmRequest(id, time)}
                    onReschedule={(id) => cancelRequest(id)}
                  />
                ))}
              </div>
            )}
            {requests.filter(r => r.status === 'confirmed').length > 0 && (
              <div className="space-y-3 mt-6">
                <h3 className="text-sm font-semibold text-foreground">Confirmed</h3>
                {requests.filter(r => r.status === 'confirmed').map(r => (
                  <SchedulingRequestCard
                    key={r.id}
                    request={r}
                    onConfirm={() => {}}
                    onReschedule={() => {}}
                  />
                ))}
              </div>
            )}
            {pendingForMe.length === 0 && requests.filter(r => r.status === 'confirmed').length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <Calendar className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No scheduling requests</p>
                <p className="text-xs mt-1">Use the scheduling button on Weekly 1:1 forms to send requests</p>
              </div>
            )}
          </div>
        ) : (
          <WeeklyOneOnOnesContent />
        )}
      </main>
    </AppLayout>
  );
}
