import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { ArrowLeft, CheckCircle2, Search, User, FileCheck, Info } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ManagerOption {
  user_id: string;
  full_name: string;
  role: string;
  team_name: string | null;
  team_id: string | null;
}

interface FormData {
  recruitName: string;
  interviewerName: string;
  teamId: string;
  reportsTo: ManagerOption | null;
  beforeQuestions: string;
  prosList: string;
  consList: string;
  hopingToGet: string;
  howWellWouldYouDo: string;
  revenueRange: string;
  whatWithMoney: string;
  payScaleRecall: string;
  whatSeparatesYou: string;
  competitive: string;
  handleFeedback: string;
  coreQualities: string;
  readinessScale: string;
  bringToTen: string;
  offerStatement: string;
  oneOnOneTime: string;
  onboardingDone: boolean;
  afterOnboardingDone: boolean;
  sentIntroDone: boolean;
  otherQuestionsDone: boolean;
  notes: string;
  outcome: 'contract_signed' | 'contract_sent_unsigned' | '';
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="pt-6 pb-2 border-t border-border/50 first:border-t-0 first:pt-0">
      <h2 className="text-base font-bold text-foreground">{children}</h2>
    </div>
  );
}

function ScriptTip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 p-3 bg-primary/5 border border-primary/10 rounded-lg text-xs text-muted-foreground leading-relaxed">
      <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

function ChecklistItem({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        "flex items-center gap-3 w-full text-left p-3 rounded-lg border transition-all",
        checked
          ? "bg-success/10 border-success/30 text-foreground"
          : "bg-background border-border hover:border-primary/30 text-muted-foreground"
      )}
    >
      <div className={cn(
        "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
        checked ? "bg-success border-success" : "border-border"
      )}>
        {checked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
      </div>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

const inputClass = "w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all";
const textareaClass = `${inputClass} resize-none`;

export default function Interview3Page() {
  const navigate = useNavigate();
  const { profile, isLoading, user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [managerOptions, setManagerOptions] = useState<ManagerOption[]>([]);
  const [filteredManagers, setFilteredManagers] = useState<ManagerOption[]>([]);
  const [managerSearch, setManagerSearch] = useState('');
  const [showManagerDropdown, setShowManagerDropdown] = useState(false);
  const managerRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<FormData>({
    recruitName: '',
    interviewerName: profile?.full_name || '',
    teamId: '__none__',
    reportsTo: null,
    beforeQuestions: '',
    prosList: '',
    consList: '',
    hopingToGet: '',
    howWellWouldYouDo: '',
    revenueRange: '',
    whatWithMoney: '',
    payScaleRecall: '',
    whatSeparatesYou: '',
    competitive: '',
    handleFeedback: '',
    coreQualities: '',
    readinessScale: '',
    bringToTen: '',
    offerStatement: '',
    oneOnOneTime: '',
    onboardingDone: false,
    afterOnboardingDone: false,
    sentIntroDone: false,
    otherQuestionsDone: false,
    notes: '',
    outcome: '',
  });

  useEffect(() => {
    if (profile?.full_name) {
      setFormData(prev => ({ ...prev, interviewerName: profile.full_name }));
    }
  }, [profile]);

  // Fetch teams
  useEffect(() => {
    const fetchTeams = async () => {
      const { data } = await supabase.from('teams').select('id, name').order('name');
      setTeams(data || []);
    };
    fetchTeams();
  }, []);

  // Fetch managers/pillars
  useEffect(() => {
    const fetchManagers = async () => {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['manager', 'admin']);

      const managerUserIds = roleData?.map(r => r.user_id) || [];
      if (managerUserIds.length === 0) { setManagerOptions([]); return; }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, team_id, teams:team_id (name)')
        .in('user_id', managerUserIds)
        .neq('status', 'nlc');

      const roleMap = new Map(roleData?.map(r => [r.user_id, r.role]) || []);
      const { data: teamsData } = await supabase.from('teams').select('leader_id');
      const pillarIds = new Set(teamsData?.map(t => t.leader_id).filter(Boolean) || []);

      const options: ManagerOption[] = (profiles || []).map(p => {
        const dbRole = roleMap.get(p.user_id) || 'manager';
        const isPillar = pillarIds.has(p.user_id);
        return {
          user_id: p.user_id,
          full_name: p.full_name,
          role: isPillar ? 'Pillar' : dbRole === 'admin' ? 'Admin' : 'Manager',
          team_name: (p.teams as any)?.name || null,
          team_id: p.team_id,
        };
      });

      options.sort((a, b) => {
        const roleOrder = (r: string) => r === 'Pillar' ? 0 : r === 'Admin' ? 1 : 2;
        const diff = roleOrder(a.role) - roleOrder(b.role);
        return diff !== 0 ? diff : a.full_name.localeCompare(b.full_name);
      });

      setManagerOptions(options);
    };
    fetchManagers();
  }, []);

  // Filter managers by search
  useEffect(() => {
    if (!managerSearch.trim()) {
      setFilteredManagers(managerOptions);
      return;
    }
    const q = managerSearch.toLowerCase();
    setFilteredManagers(managerOptions.filter(m =>
      m.full_name.toLowerCase().includes(q) ||
      (m.team_name && m.team_name.toLowerCase().includes(q))
    ).slice(0, 20));
  }, [managerSearch, managerOptions]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (managerRef.current && !managerRef.current.contains(e.target as Node)) {
        setShowManagerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.recruitName.trim()) {
      toast.error('Please enter the recruit name');
      return;
    }
    if (!formData.interviewerName.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (!formData.outcome) {
      toast.error('Please select an outcome');
      return;
    }

    const hasTeam = formData.teamId !== '__none__';

    if (hasTeam && !formData.reportsTo) {
      toast.error('Please select a Direct Manager for this recruit');
      return;
    }

    setIsSubmitting(true);
    try {
      const stored = localStorage.getItem('summit_interview_responses');
      const responses = stored ? JSON.parse(stored) : [];

      const teamName = teams.find(t => t.id === formData.teamId)?.name || '';

      responses.push({
        id: crypto.randomUUID(),
        interviewee: formData.recruitName,
        interview: 3,
        interviewer: formData.interviewerName,
        submitted: new Date().toISOString(),
        data: {
          'Before Questions': formData.beforeQuestions,
          '3-5 Pros': formData.prosList,
          'Cons': formData.consList,
          'Hoping to Get': formData.hopingToGet,
          'How Well Would You Do': formData.howWellWouldYouDo,
          'Revenue Range': formData.revenueRange,
          'What With Money': formData.whatWithMoney,
          'Pay Scale Recall': formData.payScaleRecall,
          'What Separates You': formData.whatSeparatesYou,
          'Competitive': formData.competitive,
          'Handle Feedback': formData.handleFeedback,
          'Core Qualities': formData.coreQualities,
          'Readiness Scale (1-10)': formData.readinessScale,
          'Bring to 10': formData.bringToTen,
          'Offer Statement': formData.offerStatement,
          '1:1 Training Time': formData.oneOnOneTime,
          'Onboarding Done': formData.onboardingDone ? 'Yes' : 'No',
          'After Onboarding Done': formData.afterOnboardingDone ? 'Yes' : 'No',
          'Sent Intro': formData.sentIntroDone ? 'Yes' : 'No',
          'Other Questions Done': formData.otherQuestionsDone ? 'Yes' : 'No',
          'Final Outcome': formData.outcome === 'contract_signed' ? 'Contract Signed' : 'Contract Sent - Unsigned',
          'Team Assignment': hasTeam ? `${teamName} → ${formData.reportsTo?.full_name}` : 'Not assigned',
          'Notes': formData.notes,
        },
      });

      localStorage.setItem('summit_interview_responses', JSON.stringify(responses));

      // Handle team assignment — create profile if team + manager selected
      if (hasTeam && formData.reportsTo) {
        await supabase.from('rep_signups').insert({
          rep_name: formData.recruitName,
          rep_email: 'pending@summit.com',
          rep_phone: '',
          team_id: formData.teamId,
          signed_by: user?.id,
          source: 'interview3',
        });

        const notifPromises = [];

        notifPromises.push(
          supabase.from('user_notifications').insert({
            user_id: formData.reportsTo.user_id,
            title: `New Rep Assigned: ${formData.recruitName}`,
            message: `${formData.interviewerName} has completed Interview 3 and assigned ${formData.recruitName} to your team.`,
            link: '/app/team',
          })
        );

        const managerExpiry = new Date();
        managerExpiry.setHours(managerExpiry.getHours() + 48);
        notifPromises.push(
          supabase.from('team_notifications').insert({
            team_id: formData.teamId,
            type: 'manager_only',
            signer_user_id: user?.id || '',
            signer_name: formData.interviewerName,
            new_rep_name: formData.recruitName,
            expires_at: managerExpiry.toISOString(),
          })
        );

        const teamWideExpiry = new Date();
        teamWideExpiry.setDate(teamWideExpiry.getDate() + 7);
        notifPromises.push(
          supabase.from('team_notifications').insert({
            team_id: formData.teamId,
            type: 'team_wide',
            signer_user_id: user?.id || '',
            signer_name: formData.interviewerName,
            new_rep_name: formData.recruitName,
            expires_at: teamWideExpiry.toISOString(),
          })
        );

        await Promise.allSettled(notifPromises);

        toast.success(`${formData.recruitName} added to ${teamName} under ${formData.reportsTo.full_name}`);
      } else {
        toast.success('Interview submitted');
      }

      navigate('/app/interviews');
    } catch (err: any) {
      console.error('Error submitting interview:', err);
      toast.error('Failed to submit interview', { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const hasTeam = formData.teamId !== '__none__';

  return (
    <ThemeProvider initialRole="manager">
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />

          <main className="flex-1 p-6 lg:p-8 overflow-auto">
            {/* Header */}
            <div className="mb-6">
              <button
                onClick={() => navigate('/app/interviews')}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Interviews</span>
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-white font-bold text-lg">3</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">The Academy: Third Interview Call</h1>
                  <p className="text-muted-foreground text-sm">Final interview and potential offer</p>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="max-w-2xl space-y-6">
              <ScriptTip>
                If the sales representative can start in the next 3 weeks you can skip most of this interview and just go straight to having them sign the contract and after.
                <br /><br />
                Our goal is to get people on blitzes within 2 weeks. Some people will take longer and will only want to do 1-2 trainings a week. Some will want to do 3-4. Make sure they understand that after they finish training 2, we'll book their flight out to a blitz so they can start making money.
                <br /><br />
                <strong>Pull-back technique:</strong> If at any point they say "I need to think about it" or "I need to talk with my parents," use a pull back: <em>"That's okay, after going through this I don't think this will work out, I think we'll take someone else."</em> See how they react. People that are successful in sales are decisive and creative.
              </ScriptTip>

              {/* Names */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Name of Recruit *</label>
                  <input type="text" value={formData.recruitName} onChange={(e) => handleChange('recruitName', e.target.value)} placeholder="Enter recruit name" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Name of Interviewer *</label>
                  <input type="text" value={formData.interviewerName} onChange={(e) => handleChange('interviewerName', e.target.value)} placeholder="Your name" className={inputClass} />
                </div>
              </div>

              {/* Intro */}
              <ScriptTip>
                By this time you've already learned a lot about pest control. You understand why we are growing so much, why we're looking to develop more salesmen and managers. You should understand pay, hours, typical day to day life and housing. Today we're going to see if this will be a good fit for you and us. Let's get started.
              </ScriptTip>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Before we get started do you have any questions? *</label>
                <textarea value={formData.beforeQuestions} onChange={(e) => handleChange('beforeQuestions', e.target.value)} placeholder="Record their questions..." rows={3} className={textareaClass} />
              </div>

              {/* Interview Questions */}
              <SectionHeader>Interview Questions</SectionHeader>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">What are 3-5 pros of getting the internship or job? *</label>
                <textarea value={formData.prosList} onChange={(e) => handleChange('prosList', e.target.value)} placeholder="Record their pros..." rows={3} className={textareaClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Any cons you can think of? *</label>
                <textarea value={formData.consList} onChange={(e) => handleChange('consList', e.target.value)} placeholder="Record their cons..." rows={3} className={textareaClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">What are you hoping to get out of this position? *</label>
                <p className="text-xs text-muted-foreground mb-2">(Money, Travel, Experience)</p>
                <textarea value={formData.hopingToGet} onChange={(e) => handleChange('hopingToGet', e.target.value)} placeholder="Record their response..." rows={3} className={textareaClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">How well do you feel you would do at something like this? What makes you say that? *</label>
                <textarea value={formData.howWellWouldYouDo} onChange={(e) => handleChange('howWellWouldYouDo', e.target.value)} placeholder="Record their response..." rows={3} className={textareaClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">If 75k revenue is low and 350k revenue is high, where do you see yourself? *</label>
                <textarea value={formData.revenueRange} onChange={(e) => handleChange('revenueRange', e.target.value)} placeholder="Record their response..." rows={2} className={textareaClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">What would you do with that kind of money? *</label>
                <textarea value={formData.whatWithMoney} onChange={(e) => handleChange('whatWithMoney', e.target.value)} placeholder="Record their response..." rows={2} className={textareaClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Do you remember how much that was on the pay scale? *</label>
                <p className="text-xs text-muted-foreground mb-2">They will probably say no. (Send them the pay scale and do the math)</p>
                <textarea value={formData.payScaleRecall} onChange={(e) => handleChange('payScaleRecall', e.target.value)} placeholder="Record their response..." rows={2} className={textareaClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">What separates you from the others we're considering hiring for the position? *</label>
                <textarea value={formData.whatSeparatesYou} onChange={(e) => handleChange('whatSeparatesYou', e.target.value)} placeholder="Record their response..." rows={3} className={textareaClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Would you consider yourself a competitive person? *</label>
                <p className="text-xs text-muted-foreground mb-2">(Bring up competitive nature of the summer and incentives.)</p>
                <textarea value={formData.competitive} onChange={(e) => handleChange('competitive', e.target.value)} placeholder="Record their response..." rows={2} className={textareaClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">How well do you handle feedback? *</label>
                <textarea value={formData.handleFeedback} onChange={(e) => handleChange('handleFeedback', e.target.value)} placeholder="Record their response..." rows={2} className={textareaClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  The Academy looks for 2 core qualities in every representative: Coachability, and Work Ethic. Knowing our company core qualities, do you feel like this would be a good fit for you? Why? *
                </label>
                <textarea value={formData.coreQualities} onChange={(e) => handleChange('coreQualities', e.target.value)} placeholder="Record their response..." rows={3} className={textareaClass} />
              </div>

              {/* Readiness Scale */}
              <SectionHeader>Readiness Assessment</SectionHeader>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  On a scale of 1-10, how ready are you to get started? What makes you have that much confidence in yourself that you would succeed? *
                </label>
                <p className="text-xs text-muted-foreground mb-3">(Watch as you see their pattern of thinking interrupted.)</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => handleChange('readinessScale', String(n))}
                      className={cn(
                        "w-10 h-10 rounded-lg font-bold text-sm transition-all border",
                        formData.readinessScale === String(n)
                          ? "bg-primary text-white border-primary"
                          : "bg-background text-muted-foreground border-border hover:border-primary/50"
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  What would need to happen to bring you up to a 10? Is there anything else? *
                </label>
                <ScriptTip>
                  Make it a final objection. <em>"Awesome so it sounds like you're as sure as you can be and you just need some hands on experience now."</em>
                </ScriptTip>
                <textarea value={formData.bringToTen} onChange={(e) => handleChange('bringToTen', e.target.value)} placeholder="Record their response..." rows={3} className={cn(textareaClass, "mt-2")} />
              </div>

              {/* Offer Statement */}
              <SectionHeader>Offer Statement</SectionHeader>

              <ScriptTip>
                <strong>Say this:</strong> "It sounds like your pros outweigh your cons, your goals align with the company and what we're trying to accomplish. Before we go any further, if I offer you the position would you be able to attend trainings on Wednesday at 7 PM EST. One important clarification. The company invests roughly $8,000 per rep, covering training, onboarding, and summer housing. That investment is protected by a minimum three-week commitment. If someone shows up, follows expectations—no drinking on the job, no smoking before morning meetings—and still decides it's not a fit within those three weeks, they owe nothing. If someone fails to commit or becomes a problem, we still don't charge the full amount. The only cost passed on is housing, capped at $2,500. Understanding that lack of a three-week commitment may result in a housing charge, are you prepared to move forward and take this seriously? Only do this next part if they are 100% able to come: Great! I'd officially like to offer you the position! Congratulations, I'll go over your onboarding forms now."
              </ScriptTip>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Offer Statement Response *</label>
                <textarea value={formData.offerStatement} onChange={(e) => handleChange('offerStatement', e.target.value)} placeholder="Record their response to the offer..." rows={3} className={textareaClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">What day and time do you want to do your 1 on 1 trainings? *</label>
                <input type="text" value={formData.oneOnOneTime} onChange={(e) => handleChange('oneOnOneTime', e.target.value)} placeholder="e.g. Tuesdays at 6pm EST" className={inputClass} />
              </div>

              {/* Onboarding Checklist */}
              <SectionHeader>Onboarding Overview</SectionHeader>

              <ScriptTip>
                Walk them through: 1099 contractor status, conduct expectations, professional appearance, non-compete clause, incentives and trips, pay structure, $2,500 scholarship requirements. Mute while they review agreement.
              </ScriptTip>

              <ChecklistItem
                checked={formData.onboardingDone}
                onChange={() => handleChange('onboardingDone', !formData.onboardingDone)}
                label="Onboarding overview completed"
              />

              <SectionHeader>After Onboarding / Agreement Signed</SectionHeader>

              <ScriptTip>
                Congratulations—we're excited to work with you. If available to knock soon, aim for blitz within 2 weeks. Send them: pitch (memorize before first training), training course link, script, questionnaire, and 1:1 time. Expectations: Practice with another intern every other day, complete weekly training forms with 70%+ completion, memorize basic pitch within 1 week, submit pitch video after full training.
              </ScriptTip>

              <div className="space-y-2">
                <ChecklistItem
                  checked={formData.afterOnboardingDone}
                  onChange={() => handleChange('afterOnboardingDone', !formData.afterOnboardingDone)}
                  label="Post-onboarding materials sent"
                />
                <ChecklistItem
                  checked={formData.sentIntroDone}
                  onChange={() => handleChange('sentIntroDone', !formData.sentIntroDone)}
                  label="Intro sent to the team"
                />
                <ChecklistItem
                  checked={formData.otherQuestionsDone}
                  onChange={() => handleChange('otherQuestionsDone', !formData.otherQuestionsDone)}
                  label="Any other questions answered — told them to have a great day"
                />
              </div>

              {/* Team + Manager Assignment */}
              <SectionHeader>Team Assignment</SectionHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Assign to Team</label>
                  <Select
                    value={formData.teamId}
                    onValueChange={(v) => {
                      setFormData(prev => ({
                        ...prev,
                        teamId: v,
                        reportsTo: v === '__none__' ? null : prev.reportsTo,
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Assign later</SelectItem>
                      {teams.map(team => (
                        <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Direct Manager</label>
                  {!hasTeam ? (
                    <div className="px-4 py-2.5 bg-muted/30 border border-border rounded-lg text-sm text-muted-foreground">
                      Select a team first
                    </div>
                  ) : (
                    <div ref={managerRef} className="relative">
                      {formData.reportsTo ? (
                        <div className="flex items-center justify-between px-3 py-2 bg-background border border-border rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{formData.reportsTo.full_name}</p>
                              <p className="text-xs text-muted-foreground">{formData.reportsTo.role} • {formData.reportsTo.team_name}</p>
                            </div>
                          </div>
                          <button type="button" onClick={() => setFormData(prev => ({ ...prev, reportsTo: null }))} className="text-xs text-muted-foreground hover:text-foreground">Change</button>
                        </div>
                      ) : (
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <input
                            type="text"
                            value={managerSearch}
                            onChange={(e) => { setManagerSearch(e.target.value); setShowManagerDropdown(true); }}
                            onFocus={() => setShowManagerDropdown(true)}
                            placeholder="Search managers & pillars..."
                            className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                          />
                        </div>
                      )}

                      {showManagerDropdown && !formData.reportsTo && (
                        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-52 overflow-y-auto">
                          {filteredManagers.length === 0 ? (
                            <div className="p-3 text-center text-sm text-muted-foreground">
                              {managerSearch ? `No results for '${managerSearch}'` : 'No managers available'}
                            </div>
                          ) : (
                            <ul className="py-1">
                              {filteredManagers.map(m => (
                                <li key={m.user_id}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFormData(prev => ({ ...prev, reportsTo: m }));
                                      setShowManagerDropdown(false);
                                      setManagerSearch('');
                                    }}
                                    className="w-full text-left px-3 py-2.5 hover:bg-muted/50 flex items-center gap-3 text-sm"
                                  >
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                      <User className="w-4 h-4 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-foreground truncate">{m.full_name}</p>
                                      <p className="text-xs text-muted-foreground truncate">{m.role} • {m.team_name || 'No team'}</p>
                                    </div>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Additional Notes</label>
                <textarea value={formData.notes} onChange={(e) => handleChange('notes', e.target.value)} placeholder="Any other observations..." rows={3} className={textareaClass} />
              </div>

              {/* Outcome */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">Final Outcome *</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleChange('outcome', 'contract_signed')}
                    className={cn(
                      'flex-1 py-3 rounded-lg font-medium transition-all border',
                      formData.outcome === 'contract_signed'
                        ? 'bg-success text-white border-success'
                        : 'bg-background text-muted-foreground border-border hover:border-success/50'
                    )}
                  >
                    <CheckCircle2 className="w-4 h-4 inline mr-2" />
                    Contract Signed
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('outcome', 'contract_sent_unsigned')}
                    className={cn(
                      'flex-1 py-3 rounded-lg font-medium transition-all border',
                      formData.outcome === 'contract_sent_unsigned'
                        ? 'bg-muted text-foreground border-border'
                        : 'bg-background text-muted-foreground border-border hover:border-foreground/30'
                    )}
                  >
                    <FileCheck className="w-4 h-4 inline mr-2" />
                    Contract Sent - Unsigned
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Interview'}
              </button>
            </div>
          </main>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
}
