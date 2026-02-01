import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { ArrowLeft, CheckCircle2, AlertTriangle, MessageSquare, Video, User, Lightbulb, Target, BookOpen, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
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
          <div className="w-8 h-8 rounded-lg bg-yellow-500/15 flex items-center justify-center text-yellow-400 font-bold text-sm">
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
    <div className="p-4 bg-muted/50 border-l-4 border-yellow-500 rounded-r-lg my-3">
      <p className="text-foreground italic">"{children}"</p>
    </div>
  );
}

function Question({ children, followUp }: { children: React.ReactNode; followUp?: string[] }) {
  return (
    <div className="space-y-2 my-4">
      <div className="flex items-start gap-2">
        <MessageSquare className="w-4 h-4 text-yellow-400 mt-1 flex-shrink-0" />
        <p className="text-foreground font-medium">{children}</p>
      </div>
      {followUp && followUp.length > 0 && (
        <div className="ml-6 space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Dig Deeper:</p>
          {followUp.map((q, i) => (
            <p key={i} className="text-sm text-foreground/80 pl-3 border-l-2 border-yellow-500/30">
              "{q}"
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Interview1Page() {
  const navigate = useNavigate();
  const { role, isLoading } = useAuth();
  const [recruitName, setRecruitName] = useState('');
  const [interviewerName, setInterviewerName] = useState('');
  const [scheduledInterview2, setScheduledInterview2] = useState<boolean | null>(null);

  const handleComplete = () => {
    if (!recruitName.trim()) {
      toast.error('Please enter the recruit name');
      return;
    }
    
    // Save completion
    const stored = localStorage.getItem('summit_completed_interviews');
    const completed = stored ? JSON.parse(stored) : [];
    if (!completed.includes(1)) {
      completed.push(1);
      localStorage.setItem('summit_completed_interviews', JSON.stringify(completed));
    }
    
    toast.success('Interview 1 Complete!', {
      description: scheduledInterview2 ? 'Interview 2 unlocked' : 'Remember to schedule Interview 2',
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
                <div className="w-10 h-10 rounded-xl bg-yellow-500/15 flex items-center justify-center">
                  <span className="text-yellow-400 font-bold">1</span>
                </div>
                <div>
                  <h1 className="text-2xl font-black text-foreground tracking-tight">
                    Screening & <span className="text-yellow-400">Mindset</span>
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Filter interest, self-awareness, coachability, and basic sales thinking
                  </p>
                </div>
              </div>
            </div>

            {/* Form Sections */}
            <div className="space-y-4 max-w-3xl">
              
              {/* Section 1: Recruit Info */}
              <Section number={1} title="Recruit Info" icon={<User className="w-4 h-4 text-yellow-400" />} defaultOpen={true}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Recruit Full Name
                    </label>
                    <input
                      type="text"
                      value={recruitName}
                      onChange={(e) => setRecruitName(e.target.value)}
                      placeholder="Enter name..."
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Interviewer Name
                    </label>
                    <input
                      type="text"
                      value={interviewerName}
                      onChange={(e) => setInterviewerName(e.target.value)}
                      placeholder="Your name..."
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all"
                    />
                  </div>
                </div>
              </Section>

              {/* Section 2: Rapport */}
              <Section number={2} title="Rapport (Set the Frame)" icon={<MessageSquare className="w-4 h-4 text-yellow-400" />}>
                <div className="pt-4">
                  <ManagerNote>
                    Be friendly, but controlled. You are not trying to impress them.
                  </ManagerNote>
                  <div className="mt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Opening Line (say casually):</p>
                    <ScriptLine>How's your day been so far?</ScriptLine>
                  </div>
                </div>
              </Section>

              {/* Section 3: Video Reflection */}
              <Section number={3} title="Video Reflection" icon={<Video className="w-4 h-4 text-yellow-400" />}>
                <div className="pt-4">
                  <a 
                    href="https://drive.google.com/file/d/1b12LAcdRY9rvUC_CcT0cpUyyPD-GuxSN/view"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/15 border border-yellow-500/30 rounded-lg text-yellow-400 hover:bg-yellow-500/25 transition-colors mb-4"
                  >
                    <Video className="w-4 h-4" />
                    <span className="text-sm font-medium">Open Video Link</span>
                  </a>
                  
                  <Question followUp={[
                    "Why do you think that matters?",
                    "How do you see that helping you long-term?",
                    "What skills do you think sales builds that other jobs don't?"
                  ]}>
                    What stood out to you from the video?
                  </Question>
                  
                  <ManagerNote>
                    If they give surface answers, slow down and dig. Depth {'>'} speed.
                  </ManagerNote>
                </div>
              </Section>

              {/* Section 4: Character & Value */}
              <Section number={4} title="Character & Value" icon={<Lightbulb className="w-4 h-4 text-yellow-400" />}>
                <div className="pt-4">
                  <Question followUp={["How has that shown up when things got uncomfortable?"]}>
                    What's one personal characteristic you're most proud of?
                  </Question>
                </div>
              </Section>

              {/* Section 5: Value Beyond Production */}
              <Section number={5} title="Value Beyond Production" icon={<Target className="w-4 h-4 text-yellow-400" />}>
                <div className="pt-4">
                  <Question>
                    Outside of producing revenue, what value do you think you bring to a team?
                  </Question>
                  <ManagerNote>
                    Listen for: Leadership, Energy, Coachability, Reliability. Not ego.
                  </ManagerNote>
                </div>
              </Section>

              {/* Section 6: Motivation */}
              <Section number={6} title="Motivation" icon={<Target className="w-4 h-4 text-yellow-400" />}>
                <div className="pt-4">
                  <Question>
                    Why do you want to do this instead of something easier this summer?
                  </Question>
                </div>
              </Section>

              {/* Section 7: Sales Thinking */}
              <Section number={7} title="Sales Thinking" icon={<Lightbulb className="w-4 h-4 text-yellow-400" />}>
                <div className="pt-4">
                  <Question>
                    If you were consistently selling 2–3 a day but couldn't break past that, what would you change?
                  </Question>
                  <ManagerNote>
                    Top candidates talk about: Inputs, Practice, Feedback, Volume. Weak ones talk about luck.
                  </ManagerNote>
                </div>
              </Section>

              {/* Section 8: Self-Development */}
              <Section number={8} title="Self-Development" icon={<BookOpen className="w-4 h-4 text-yellow-400" />}>
                <div className="pt-4">
                  <Question>
                    What books or content are you currently consuming for self-development?
                  </Question>
                </div>
              </Section>

              {/* Section 9: Logistics & Next Step Close */}
              <Section number={9} title="Logistics & Next Step Close" icon={<Calendar className="w-4 h-4 text-yellow-400" />}>
                <div className="pt-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Say this word-for-word:</p>
                  <ScriptLine>
                    Before we go further, is there anything—family trips, summer classes, other commitments—that would make it hard for you to fully commit this summer?
                  </ScriptLine>
                  <ScriptLine>
                    Have you already talked with your parents about this, or do you make your own decisions?
                  </ScriptLine>
                  <div className="mt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Then:</p>
                    <ScriptLine>
                      Next call we'll go over pay, hours, and day-to-day. What's a good time tomorrow?
                    </ScriptLine>
                  </div>
                </div>
              </Section>

              {/* End State */}
              <div className="p-6 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
                <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-yellow-400" />
                  End State — Interview 1
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-foreground mb-2">Did you schedule Interview 2 for tomorrow?</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setScheduledInterview2(true)}
                        className={cn(
                          'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                          scheduledInterview2 === true
                            ? 'bg-green-500 text-white'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        )}
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setScheduledInterview2(false)}
                        className={cn(
                          'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                          scheduledInterview2 === false
                            ? 'bg-red-500 text-white'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        )}
                      >
                        No
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>☐ Send pay overview video</p>
                    <p>☐ Close warmly</p>
                  </div>
                </div>
              </div>

              {/* Complete Button */}
              <button
                onClick={handleComplete}
                className="w-full py-4 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-xl transition-all hover:shadow-lg hover:shadow-yellow-500/25 hover:-translate-y-0.5"
              >
                Complete Interview 1
              </button>
            </div>
          </main>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
}
