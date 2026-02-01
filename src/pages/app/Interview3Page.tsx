import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { ArrowLeft, CheckCircle2, AlertTriangle, MessageSquare, Target, Award, Scale, UserCheck, FileCheck, ChevronDown, ChevronUp, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SectionProps {
  number: number;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ number, title, icon, children, defaultOpen = false }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center text-red-400 font-bold text-sm">
            {number}
          </div>
          <div className="flex items-center gap-2">
            {icon}
            <span className="font-semibold text-foreground">{title}</span>
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>
      {isOpen && (
        <div className="p-5 pt-0 border-t border-border">
          {children}
        </div>
      )}
    </div>
  );
}

function ManagerNote({ children, variant = 'info' }: { children: React.ReactNode; variant?: 'info' | 'warning' }) {
  return (
    <div className={cn(
      'flex items-start gap-2 p-3 rounded-lg mt-4',
      variant === 'warning' 
        ? 'bg-amber-500/10 border border-amber-500/20' 
        : 'bg-blue-500/10 border border-blue-500/20'
    )}>
      <AlertTriangle className={cn(
        'w-4 h-4 flex-shrink-0 mt-0.5',
        variant === 'warning' ? 'text-amber-400' : 'text-blue-400'
      )} />
      <div className={cn(
        'text-sm',
        variant === 'warning' ? 'text-amber-300' : 'text-blue-300'
      )}>
        <span className={cn(
          'font-medium',
          variant === 'warning' ? 'text-amber-400' : 'text-blue-400'
        )}>Manager Note: </span>
        {children}
      </div>
    </div>
  );
}

function ScriptLine({ children, important = false }: { children: React.ReactNode; important?: boolean }) {
  return (
    <div className={cn(
      'p-4 rounded-r-lg my-3',
      important 
        ? 'bg-red-500/10 border-l-4 border-red-500' 
        : 'bg-muted/50 border-l-4 border-red-500'
    )}>
      <p className="text-foreground italic">"{children}"</p>
    </div>
  );
}

function Question({ children, followUp }: { children: React.ReactNode; followUp?: string[] }) {
  return (
    <div className="space-y-2 my-4">
      <div className="flex items-start gap-2">
        <MessageSquare className="w-4 h-4 text-red-400 mt-1 flex-shrink-0" />
        <p className="text-foreground font-medium">{children}</p>
      </div>
      {followUp && followUp.length > 0 && (
        <div className="ml-6 space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">If &lt;10:</p>
          {followUp.map((q, i) => (
            <p key={i} className="text-sm text-foreground/80 pl-3 border-l-2 border-red-500/30">
              "{q}"
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Interview3Page() {
  const navigate = useNavigate();
  const { isLoading } = useAuth();
  const [outcome, setOutcome] = useState<'offer' | 'disqualified' | null>(null);
  const [confidenceScore, setConfidenceScore] = useState<number>(0);

  // Check if Interview 2 is complete
  useEffect(() => {
    const stored = localStorage.getItem('summit_completed_interviews');
    const completed = stored ? JSON.parse(stored) : [];
    if (!completed.includes(2)) {
      toast.error('Complete Interview 2 first');
      navigate('/app/interviews');
    }
  }, [navigate]);

  const handleComplete = () => {
    if (!outcome) {
      toast.error('Select an outcome: Offer Extended or Disqualified');
      return;
    }
    
    // Save completion
    const stored = localStorage.getItem('summit_completed_interviews');
    const completed = stored ? JSON.parse(stored) : [];
    if (!completed.includes(3)) {
      completed.push(3);
      localStorage.setItem('summit_completed_interviews', JSON.stringify(completed));
    }
    
    if (outcome === 'offer') {
      toast.success('Offer Extended! 🎉', {
        description: 'Onboarding initiated — Training unlocked',
      });
    } else {
      toast.info('Candidate Disqualified', {
        description: 'Move on to the next prospect',
      });
    }
    navigate('/app/interviews');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <ThemeProvider initialRole="manager">
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          
          <main className="flex-1 p-6 lg:p-8 overflow-auto">
            {/* Header */}
            <div className="mb-8">
              <button
                onClick={() => navigate('/app/interviews')}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Interviews</span>
              </button>
              
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                  <span className="text-red-400 font-bold">3</span>
                </div>
                <div>
                  <h1 className="text-2xl font-black text-foreground tracking-tight">
                    Offer & <span className="text-red-400">Decision</span>
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Test decisiveness, objection handling, and final commitment
                  </p>
                </div>
              </div>
            </div>

            {/* Manager Warning */}
            <div className="mb-6 p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-foreground">This interview tests decisiveness, not likability.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    You are here to identify fighters, not please-rs.
                  </p>
                </div>
              </div>
            </div>

            {/* Form Sections */}
            <div className="space-y-4 max-w-3xl">
              
              {/* Section 1: Fit Confirmation */}
              <Section number={1} title="Fit Confirmation" icon={<UserCheck className="w-4 h-4 text-red-400" />} defaultOpen={true}>
                <div className="pt-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Frame:</p>
                  <ScriptLine>
                    By now you understand the job, the hours, and the expectations. Today we're deciding if this is a mutual fit.
                  </ScriptLine>
                </div>
              </Section>

              {/* Section 2: Pros / Cons */}
              <Section number={2} title="Pros / Cons" icon={<Scale className="w-4 h-4 text-red-400" />}>
                <div className="pt-4">
                  <Question>
                    Give me 3–5 pros of doing this internship.
                  </Question>
                  <div className="mt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Then:</p>
                    <Question>
                      Any real cons you're thinking about?
                    </Question>
                  </div>
                </div>
              </Section>

              {/* Section 3: Confidence Scale */}
              <Section number={3} title="Confidence Scale" icon={<Target className="w-4 h-4 text-red-400" />}>
                <div className="pt-4">
                  <Question followUp={["What would need to happen to bring you to a 10?"]}>
                    On a scale of 1–10, how ready are you to get started?
                  </Question>
                  
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-2">Record their answer:</p>
                    <div className="flex gap-2 flex-wrap">
                      {[1,2,3,4,5,6,7,8,9,10].map((num) => (
                        <button
                          key={num}
                          onClick={() => setConfidenceScore(num)}
                          className={cn(
                            'w-10 h-10 rounded-lg font-bold transition-all',
                            confidenceScore === num
                              ? num >= 8 
                                ? 'bg-green-500 text-white'
                                : num >= 5
                                  ? 'bg-yellow-500 text-black'
                                  : 'bg-red-500 text-white'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          )}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </Section>

              {/* Section 4: Pull-Back Test */}
              <Section number={4} title="Pull-Back Test (If Hesitation)" icon={<AlertTriangle className="w-4 h-4 text-red-400" />}>
                <div className="pt-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Say calmly:</p>
                  <ScriptLine important>
                    That's okay. Based on this, it might make more sense for us to go with someone else.
                  </ScriptLine>
                  <ManagerNote variant="warning">
                    Watch how they respond. <strong>Fighters fight.</strong>
                  </ManagerNote>
                </div>
              </Section>

              {/* Section 5: Offer Statement */}
              <Section number={5} title="Offer Statement (Only If Qualified)" icon={<Award className="w-4 h-4 text-red-400" />}>
                <div className="pt-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Say word-for-word:</p>
                  <ScriptLine>
                    It sounds like your goals align with what we're building. Before I make an offer, I need to clarify expectations…
                  </ScriptLine>
                  <p className="text-sm text-muted-foreground my-3">
                    (Then deliver housing / 3-week commitment explanation exactly as trained.)
                  </p>
                  
                  <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">If yes:</p>
                    <ScriptLine>
                      I'd like to officially offer you the position. Congratulations.
                    </ScriptLine>
                  </div>
                </div>
              </Section>

              {/* Section 6: Onboarding Transition */}
              <Section number={6} title="Onboarding Transition" icon={<FileCheck className="w-4 h-4 text-red-400" />}>
                <div className="pt-4">
                  <p className="text-sm text-foreground mb-3">Walk through:</p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-red-400" />
                      <span>1099 status</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-red-400" />
                      <span>Conduct expectations</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-red-400" />
                      <span>Appearance standards</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-red-400" />
                      <span>Training expectations</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-red-400" />
                      <span>Blitz timeline</span>
                    </li>
                  </ul>
                </div>
              </Section>

              {/* End State */}
              <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-xl">
                <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-red-400" />
                  End State — Interview 3
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-foreground mb-3">Final Outcome:</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setOutcome('offer')}
                        className={cn(
                          'flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-all',
                          outcome === 'offer'
                            ? 'bg-green-500 text-white shadow-lg shadow-green-500/25'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        )}
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Offer Extended</span>
                      </button>
                      <button
                        onClick={() => setOutcome('disqualified')}
                        className={cn(
                          'flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-all',
                          outcome === 'disqualified'
                            ? 'bg-red-500 text-white shadow-lg shadow-red-500/25'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        )}
                      >
                        <XCircle className="w-5 h-5" />
                        <span>Disqualified</span>
                      </button>
                    </div>
                  </div>
                  
                  {outcome === 'offer' && (
                    <div className="text-sm text-muted-foreground space-y-1 pt-2 border-t border-border">
                      <p>☐ Onboarding initiated</p>
                      <p>☐ Training unlocked</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Complete Button */}
              <button
                onClick={handleComplete}
                disabled={!outcome}
                className={cn(
                  'w-full py-4 font-bold rounded-xl transition-all',
                  outcome
                    ? 'bg-red-500 hover:bg-red-600 text-white hover:shadow-lg hover:shadow-red-500/25 hover:-translate-y-0.5'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                )}
              >
                Complete Interview 3
              </button>
            </div>
          </main>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
}
