import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { ArrowLeft, CheckCircle2, AlertTriangle, MessageSquare, Video, Target, Users, Calendar, ChevronDown, ChevronUp, DollarSign, Clock, Flame, Award } from 'lucide-react';
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
          <div className="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center text-orange-400 font-bold text-sm">
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

function ManagerNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg mt-4">
      <AlertTriangle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
      <div className="text-sm text-blue-300">
        <span className="font-medium text-blue-400">Manager Note: </span>
        {children}
      </div>
    </div>
  );
}

function ScriptLine({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 bg-muted/50 border-l-4 border-orange-500 rounded-r-lg my-3">
      <p className="text-foreground italic">"{children}"</p>
    </div>
  );
}

function Question({ children, followUp }: { children: React.ReactNode; followUp?: string[] }) {
  return (
    <div className="space-y-2 my-4">
      <div className="flex items-start gap-2">
        <MessageSquare className="w-4 h-4 text-orange-400 mt-1 flex-shrink-0" />
        <p className="text-foreground font-medium">{children}</p>
      </div>
      {followUp && followUp.length > 0 && (
        <div className="ml-6 space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Dig Deeper:</p>
          {followUp.map((q, i) => (
            <p key={i} className="text-sm text-foreground/80 pl-3 border-l-2 border-orange-500/30">
              "{q}"
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Interview2Page() {
  const navigate = useNavigate();
  const { isLoading } = useAuth();
  const [referralName, setReferralName] = useState('');
  const [referralPhone, setReferralPhone] = useState('');

  // Check if Interview 1 is complete
  useEffect(() => {
    const stored = localStorage.getItem('summit_completed_interviews');
    const completed = stored ? JSON.parse(stored) : [];
    if (!completed.includes(1)) {
      toast.error('Complete Interview 1 first');
      navigate('/app/interviews');
    }
  }, [navigate]);

  const handleComplete = () => {
    // Save completion
    const stored = localStorage.getItem('summit_completed_interviews');
    const completed = stored ? JSON.parse(stored) : [];
    if (!completed.includes(2)) {
      completed.push(2);
      localStorage.setItem('summit_completed_interviews', JSON.stringify(completed));
    }
    
    toast.success('Interview 2 Complete!', {
      description: 'Interview 3 unlocked — The final decision call',
    });
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
                <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center">
                  <span className="text-orange-400 font-bold">2</span>
                </div>
                <div>
                  <h1 className="text-2xl font-black text-foreground tracking-tight">
                    Commitment & <span className="text-orange-400">Understanding</span>
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Test understanding of pay, schedule, effort, and long-term thinking
                  </p>
                </div>
              </div>
            </div>

            {/* Video Link */}
            <div className="mb-6">
              <a 
                href="https://drive.google.com/file/d/1zjI04-xY-wdazHnVTn3CzU3MU8VbPk1t/view"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/15 border border-orange-500/30 rounded-lg text-orange-400 hover:bg-orange-500/25 transition-colors"
              >
                <Video className="w-4 h-4" />
                <span className="text-sm font-medium">Pay Overview Video (sent before this call)</span>
              </a>
            </div>

            {/* Form Sections */}
            <div className="space-y-4 max-w-3xl">
              
              {/* Section 1: Pay Understanding */}
              <Section number={1} title="Pay Understanding" icon={<DollarSign className="w-4 h-4 text-orange-400" />} defaultOpen={true}>
                <div className="pt-4">
                  <Question followUp={[
                    "What do you need to qualify for October?",
                    "What happens if someone quits early?"
                  ]}>
                    Explain how upfront pay, October checks, and January checks work.
                  </Question>
                </div>
              </Section>

              {/* Section 2: Schedule Reality */}
              <Section number={2} title="Schedule Reality" icon={<Clock className="w-4 h-4 text-orange-400" />}>
                <div className="pt-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    <strong className="text-foreground">Prompt:</strong> Read the schedule aloud to the recruit.
                  </p>
                  <Question>
                    What part of this schedule do you think will challenge you the most?
                  </Question>
                </div>
              </Section>

              {/* Section 3: Commitment Definition */}
              <Section number={3} title="Commitment Definition" icon={<Flame className="w-4 h-4 text-orange-400" />}>
                <div className="pt-4">
                  <Question followUp={[
                    "Give me an example of something you committed to when it stopped being fun."
                  ]}>
                    How would you personally define commitment?
                  </Question>
                </div>
              </Section>

              {/* Section 4: Self-Assessment */}
              <Section number={4} title="Self-Assessment" icon={<Target className="w-4 h-4 text-orange-400" />}>
                <div className="pt-4">
                  <Question>
                    How well do you think you'd actually do at something like this?
                  </Question>
                </div>
              </Section>

              {/* Section 5: Differentiation */}
              <Section number={5} title="Differentiation" icon={<Award className="w-4 h-4 text-orange-400" />}>
                <div className="pt-4">
                  <Question>
                    What are two things that separate you from other candidates?
                  </Question>
                </div>
              </Section>

              {/* Section 6: Goal Setting */}
              <Section number={6} title="Goal Setting" icon={<Target className="w-4 h-4 text-orange-400" />}>
                <div className="pt-4">
                  <Question>
                    By the end of the summer, how much revenue do you realistically think you'd close?
                  </Question>
                  <div className="mt-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                    <p className="text-sm text-orange-400">
                      <strong>Anchor:</strong> Average rep = $75k–$150k
                    </p>
                  </div>
                </div>
              </Section>

              {/* Section 7: Threat Identification */}
              <Section number={7} title="Threat Identification" icon={<AlertTriangle className="w-4 h-4 text-orange-400" />}>
                <div className="pt-4">
                  <Question>
                    What do you see as your biggest threat to achieving that goal?
                  </Question>
                </div>
              </Section>

              {/* Section 8: Referral Request */}
              <Section number={8} title="Referral Request" icon={<Users className="w-4 h-4 text-orange-400" />}>
                <div className="pt-4">
                  <ScriptLine>
                    We've noticed people perform better when they're surrounded by driven teammates. Is there anyone you know who would push you to be better?
                  </ScriptLine>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Referral Name
                      </label>
                      <input
                        type="text"
                        value={referralName}
                        onChange={(e) => setReferralName(e.target.value)}
                        placeholder="Name..."
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={referralPhone}
                        onChange={(e) => setReferralPhone(e.target.value)}
                        placeholder="(555) 555-5555"
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </Section>

              {/* End State */}
              <div className="p-6 bg-orange-500/5 border border-orange-500/20 rounded-xl">
                <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-orange-400" />
                  End State — Interview 2
                </h3>
                
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>☐ Add recruit to GetHawx as <strong className="text-orange-400">Prospect</strong></p>
                  <p>☐ Schedule Interview 3 for tomorrow</p>
                  {referralName && (
                    <p className="text-orange-400">☐ Follow up with referral: {referralName}</p>
                  )}
                </div>
              </div>

              {/* Complete Button */}
              <button
                onClick={handleComplete}
                className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-all hover:shadow-lg hover:shadow-orange-500/25 hover:-translate-y-0.5"
              >
                Complete Interview 2
              </button>
            </div>
          </main>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
}
