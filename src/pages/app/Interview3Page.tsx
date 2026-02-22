import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { ArrowLeft, Search, User, CheckCircle2, FileCheck } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ScriptTip, ChecklistItem, SectionHeader, QuestionCard,
  FieldLabel, FieldHint, RatingScale,
  inputClass, textareaClass,
} from '@/components/interviews/InterviewFormComponents';

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
    if (profile?.full_name) setFormData(prev => ({ ...prev, interviewerName: profile.full_name }));
  }, [profile]);

  useEffect(() => {
    const fetchTeams = async () => {
      const { data } = await supabase.from('teams').select('id, name').order('name');
      setTeams(data || []);
    };
    fetchTeams();
  }, []);

  useEffect(() => {
    const fetchManagers = async () => {
      const { data: roleData } = await supabase.from('user_roles').select('user_id, role').in('role', ['manager', 'admin']);
      const managerUserIds = roleData?.map(r => r.user_id) || [];
      if (managerUserIds.length === 0) { setManagerOptions([]); return; }

      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, team_id, teams:team_id (name)').in('user_id', managerUserIds).neq('status', 'nlc');
      const roleMap = new Map(roleData?.map(r => [r.user_id, r.role]) || []);
      const { data: teamsData } = await supabase.from('teams').select('leader_id');
      const pillarIds = new Set(teamsData?.map(t => t.leader_id).filter(Boolean) || []);

      const options: ManagerOption[] = (profiles || []).map(p => {
        const dbRole = roleMap.get(p.user_id) || 'manager';
        const isPillar = pillarIds.has(p.user_id);
        return { user_id: p.user_id, full_name: p.full_name, role: isPillar ? 'Pillar' : dbRole === 'admin' ? 'Admin' : 'Manager', team_name: (p.teams as any)?.name || null, team_id: p.team_id };
      });

      options.sort((a, b) => {
        const roleOrder = (r: string) => r === 'Pillar' ? 0 : r === 'Admin' ? 1 : 2;
        return roleOrder(a.role) - roleOrder(b.role) || a.full_name.localeCompare(b.full_name);
      });
      setManagerOptions(options);
    };
    fetchManagers();
  }, []);

  useEffect(() => {
    if (!managerSearch.trim()) { setFilteredManagers(managerOptions); return; }
    const q = managerSearch.toLowerCase();
    setFilteredManagers(managerOptions.filter(m => m.full_name.toLowerCase().includes(q) || (m.team_name && m.team_name.toLowerCase().includes(q))).slice(0, 20));
  }, [managerSearch, managerOptions]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (managerRef.current && !managerRef.current.contains(e.target as Node)) setShowManagerDropdown(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.recruitName.trim()) { toast.error('Please enter the recruit name'); return; }
    if (!formData.interviewerName.trim()) { toast.error('Please enter your name'); return; }
    if (!formData.outcome) { toast.error('Please select an outcome'); return; }

    const hasTeam = formData.teamId !== '__none__';
    if (hasTeam && !formData.reportsTo) { toast.error('Please select a Direct Manager'); return; }

    setIsSubmitting(true);
    try {
      const stored = localStorage.getItem('summit_interview_responses');
      const responses = stored ? JSON.parse(stored) : [];
      const teamName = teams.find(t => t.id === formData.teamId)?.name || '';

      responses.push({
        id: crypto.randomUUID(), interviewee: formData.recruitName, interview: 3, interviewer: formData.interviewerName, submitted: new Date().toISOString(),
        data: {
          'Before Questions': formData.beforeQuestions, '3-5 Pros': formData.prosList, 'Cons': formData.consList,
          'Hoping to Get': formData.hopingToGet, 'How Well Would You Do': formData.howWellWouldYouDo, 'Revenue Range': formData.revenueRange,
          'What With Money': formData.whatWithMoney, 'Pay Scale Recall': formData.payScaleRecall, 'What Separates You': formData.whatSeparatesYou,
          'Competitive': formData.competitive, 'Handle Feedback': formData.handleFeedback, 'Core Qualities': formData.coreQualities,
          'Readiness Scale (1-10)': formData.readinessScale, 'Bring to 10': formData.bringToTen, 'Offer Statement': formData.offerStatement,
          '1:1 Training Time': formData.oneOnOneTime, 'Onboarding Done': formData.onboardingDone ? 'Yes' : 'No',
          'After Onboarding Done': formData.afterOnboardingDone ? 'Yes' : 'No', 'Sent Intro': formData.sentIntroDone ? 'Yes' : 'No',
          'Other Questions Done': formData.otherQuestionsDone ? 'Yes' : 'No',
          'Final Outcome': formData.outcome === 'contract_signed' ? 'Contract Signed' : 'Contract Sent - Unsigned',
          'Team Assignment': hasTeam ? `${teamName} → ${formData.reportsTo?.full_name}` : 'Not assigned', 'Notes': formData.notes,
        },
      });
      localStorage.setItem('summit_interview_responses', JSON.stringify(responses));

      if (hasTeam && formData.reportsTo) {
        await supabase.from('rep_signups').insert({ rep_name: formData.recruitName, rep_email: 'pending@summit.com', rep_phone: '', team_id: formData.teamId, signed_by: user?.id, source: 'interview3' });
        const notifPromises = [];
        notifPromises.push(supabase.from('user_notifications').insert({ user_id: formData.reportsTo.user_id, title: `New Rep Assigned: ${formData.recruitName}`, message: `${formData.interviewerName} completed Interview 3 and assigned ${formData.recruitName} to your team.`, link: '/app/team' }));
        const managerExpiry = new Date(); managerExpiry.setHours(managerExpiry.getHours() + 48);
        notifPromises.push(supabase.from('team_notifications').insert({ team_id: formData.teamId, type: 'manager_only', signer_user_id: user?.id || '', signer_name: formData.interviewerName, new_rep_name: formData.recruitName, expires_at: managerExpiry.toISOString() }));
        const teamWideExpiry = new Date(); teamWideExpiry.setDate(teamWideExpiry.getDate() + 7);
        notifPromises.push(supabase.from('team_notifications').insert({ team_id: formData.teamId, type: 'team_wide', signer_user_id: user?.id || '', signer_name: formData.interviewerName, new_rep_name: formData.recruitName, expires_at: teamWideExpiry.toISOString() }));
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

  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;

  const hasTeam = formData.teamId !== '__none__';

  return (
    <AppLayout>
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <button onClick={() => navigate('/app/interviews')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /><span>Back to Interviews</span>
        </button>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">3</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Final Offer Interview</h1>
            <p className="text-muted-foreground text-xs mt-0.5">Final decision and potential onboarding</p>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-5">
          <ScriptTip label="Quick-start tip">
            If the recruit can start in the next 3 weeks, skip most of this and go straight to signing the contract.
            <br /><br />
            Our goal is to get people on blitzes within 2 weeks. After training 2, we book their flight out.
            <br /><br />
            <strong>Pull-back technique:</strong> If they say "I need to think about it," try: <em>"That's okay, after going through this I don't think this will work out, I think we'll take someone else."</em>
          </ScriptTip>

          {/* Names */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <FieldLabel>Recruit Name</FieldLabel>
              <input type="text" value={formData.recruitName} onChange={(e) => handleChange('recruitName', e.target.value)} placeholder="Enter recruit name" className={inputClass} />
            </div>
            <div>
              <FieldLabel>Interviewer</FieldLabel>
              <input type="text" value={formData.interviewerName} onChange={(e) => handleChange('interviewerName', e.target.value)} placeholder="Your name" className={inputClass} />
            </div>
          </div>

          <ScriptTip label="Intro script">
            "By now you've learned a lot about pest control — you understand pay, hours, day-to-day life and housing. Today we'll see if this is a good fit. Let's get started."
          </ScriptTip>

          <QuestionCard>
            <FieldLabel>Before we start, any questions?</FieldLabel>
            <textarea value={formData.beforeQuestions} onChange={(e) => handleChange('beforeQuestions', e.target.value)} placeholder="Record their questions..." rows={2} className={textareaClass} />
          </QuestionCard>

          {/* Interview Questions */}
          <SectionHeader step={1}>Evaluation Questions</SectionHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <QuestionCard>
              <FieldLabel>3-5 pros of the internship/job?</FieldLabel>
              <textarea value={formData.prosList} onChange={(e) => handleChange('prosList', e.target.value)} placeholder="List their pros..." rows={3} className={textareaClass} />
            </QuestionCard>
            <QuestionCard>
              <FieldLabel>Any cons?</FieldLabel>
              <textarea value={formData.consList} onChange={(e) => handleChange('consList', e.target.value)} placeholder="List their cons..." rows={3} className={textareaClass} />
            </QuestionCard>
          </div>

          <QuestionCard>
            <FieldLabel>What are you hoping to get out of this position?</FieldLabel>
            <FieldHint>Money, Travel, Experience</FieldHint>
            <textarea value={formData.hopingToGet} onChange={(e) => handleChange('hopingToGet', e.target.value)} placeholder="Response..." rows={2} className={textareaClass} />
          </QuestionCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <QuestionCard>
              <FieldLabel>How well would you do at this?</FieldLabel>
              <textarea value={formData.howWellWouldYouDo} onChange={(e) => handleChange('howWellWouldYouDo', e.target.value)} placeholder="Response..." rows={2} className={textareaClass} />
            </QuestionCard>
            <QuestionCard>
              <FieldLabel>Revenue range (75k low, 350k high)?</FieldLabel>
              <textarea value={formData.revenueRange} onChange={(e) => handleChange('revenueRange', e.target.value)} placeholder="Response..." rows={2} className={textareaClass} />
            </QuestionCard>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <QuestionCard>
              <FieldLabel>What would you do with that money?</FieldLabel>
              <textarea value={formData.whatWithMoney} onChange={(e) => handleChange('whatWithMoney', e.target.value)} placeholder="Response..." rows={2} className={textareaClass} />
            </QuestionCard>
            <QuestionCard>
              <FieldLabel>Do you remember the pay scale?</FieldLabel>
              <FieldHint>They'll likely say no — send pay scale and do the math.</FieldHint>
              <textarea value={formData.payScaleRecall} onChange={(e) => handleChange('payScaleRecall', e.target.value)} placeholder="Response..." rows={2} className={textareaClass} />
            </QuestionCard>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <QuestionCard>
              <FieldLabel>What separates you from other candidates?</FieldLabel>
              <textarea value={formData.whatSeparatesYou} onChange={(e) => handleChange('whatSeparatesYou', e.target.value)} placeholder="Response..." rows={2} className={textareaClass} />
            </QuestionCard>
            <QuestionCard>
              <FieldLabel>Are you competitive?</FieldLabel>
              <FieldHint>Bring up competitive incentives.</FieldHint>
              <textarea value={formData.competitive} onChange={(e) => handleChange('competitive', e.target.value)} placeholder="Response..." rows={2} className={textareaClass} />
            </QuestionCard>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <QuestionCard>
              <FieldLabel>How well do you handle feedback?</FieldLabel>
              <textarea value={formData.handleFeedback} onChange={(e) => handleChange('handleFeedback', e.target.value)} placeholder="Response..." rows={2} className={textareaClass} />
            </QuestionCard>
            <QuestionCard>
              <FieldLabel>Coachability & Work Ethic — good fit?</FieldLabel>
              <textarea value={formData.coreQualities} onChange={(e) => handleChange('coreQualities', e.target.value)} placeholder="Response..." rows={2} className={textareaClass} />
            </QuestionCard>
          </div>

          {/* Readiness */}
          <SectionHeader step={2}>Readiness Assessment</SectionHeader>

          <QuestionCard>
            <FieldLabel>On a scale of 1-10, how ready are you?</FieldLabel>
            <FieldHint>Watch as their pattern of thinking gets interrupted.</FieldHint>
            <RatingScale value={formData.readinessScale} onChange={(v) => handleChange('readinessScale', v)} />
          </QuestionCard>

          <QuestionCard>
            <FieldLabel>What would bring you to a 10?</FieldLabel>
            <ScriptTip label="Close it">
              Make it a final objection: "Awesome — so it sounds like you just need some hands-on experience now."
            </ScriptTip>
            <textarea value={formData.bringToTen} onChange={(e) => handleChange('bringToTen', e.target.value)} placeholder="Response..." rows={2} className={textareaClass} />
          </QuestionCard>

          {/* Offer */}
          <SectionHeader step={3}>Offer Statement</SectionHeader>

          <ScriptTip label="Offer script">
            "Your pros outweigh your cons, and your goals align with ours. Before we go further — if I offer you the position, can you attend trainings Wednesday at 7 PM EST?"
            <br /><br />
            "The company invests ~$8,000 per rep covering training, onboarding, and housing. That investment is protected by a 3-week commitment. If you follow expectations and it's not a fit within 3 weeks, you owe nothing. The only cost is housing, capped at $2,500."
            <br /><br />
            "Understanding that, are you prepared to move forward? <strong>Great — I'd officially like to offer you the position! Congratulations!</strong>"
          </ScriptTip>

          <QuestionCard>
            <FieldLabel>Offer statement response</FieldLabel>
            <textarea value={formData.offerStatement} onChange={(e) => handleChange('offerStatement', e.target.value)} placeholder="Record their response..." rows={2} className={textareaClass} />
          </QuestionCard>

          <QuestionCard>
            <FieldLabel>What day/time for 1-on-1 trainings?</FieldLabel>
            <input type="text" value={formData.oneOnOneTime} onChange={(e) => handleChange('oneOnOneTime', e.target.value)} placeholder="e.g. Tuesdays at 6pm EST" className={inputClass} />
          </QuestionCard>

          {/* Onboarding */}
          <SectionHeader step={4}>Onboarding Checklist</SectionHeader>

          <ScriptTip label="Onboarding overview">
            Walk through: 1099 contractor status, conduct expectations, professional appearance, non-compete, incentives/trips, pay structure, $2,500 scholarship requirements. Mute while they review.
          </ScriptTip>

          <div className="space-y-2">
            <ChecklistItem checked={formData.onboardingDone} onChange={() => handleChange('onboardingDone', !formData.onboardingDone)} label="Onboarding overview completed" />
          </div>

          <ScriptTip label="After agreement signed">
            Send: pitch (memorize before first training), training course link, script, questionnaire, and 1:1 time. Expectations: practice with intern every other day, complete weekly training with 70%+ completion, memorize basic pitch within 1 week.
          </ScriptTip>

          <div className="space-y-2">
            <ChecklistItem checked={formData.afterOnboardingDone} onChange={() => handleChange('afterOnboardingDone', !formData.afterOnboardingDone)} label="Post-onboarding materials sent" />
            <ChecklistItem checked={formData.sentIntroDone} onChange={() => handleChange('sentIntroDone', !formData.sentIntroDone)} label="Intro sent to the team" />
            <ChecklistItem checked={formData.otherQuestionsDone} onChange={() => handleChange('otherQuestionsDone', !formData.otherQuestionsDone)} label="All questions answered — told them to have a great day" />
          </div>

          {/* Team Assignment */}
          <SectionHeader step={5}>Team Assignment</SectionHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <FieldLabel required={false}>Assign to Team</FieldLabel>
              <Select value={formData.teamId} onValueChange={(v) => setFormData(prev => ({ ...prev, teamId: v, reportsTo: v === '__none__' ? null : prev.reportsTo }))}>
                <SelectTrigger><SelectValue placeholder="Select a team" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Assign later</SelectItem>
                  {teams.map(team => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel required={false}>Direct Manager</FieldLabel>
              {!hasTeam ? (
                <div className="px-3.5 py-2.5 bg-muted/20 border border-border/40 rounded-lg text-sm text-muted-foreground/50">Select a team first</div>
              ) : (
                <div ref={managerRef} className="relative">
                  {formData.reportsTo ? (
                    <div className="flex items-center justify-between px-3 py-2 bg-background border border-border/60 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center"><User className="w-3.5 h-3.5 text-primary" /></div>
                        <div>
                          <p className="text-sm font-medium">{formData.reportsTo.full_name}</p>
                          <p className="text-[11px] text-muted-foreground">{formData.reportsTo.role} • {formData.reportsTo.team_name}</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => setFormData(prev => ({ ...prev, reportsTo: null }))} className="text-xs text-muted-foreground hover:text-foreground">Change</button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                      <input type="text" value={managerSearch} onChange={(e) => { setManagerSearch(e.target.value); setShowManagerDropdown(true); }} onFocus={() => setShowManagerDropdown(true)} placeholder="Search managers..." className={cn(inputClass, "pl-10")} />
                    </div>
                  )}
                  {showManagerDropdown && !formData.reportsTo && (
                    <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-52 overflow-y-auto">
                      {filteredManagers.length === 0 ? (
                        <div className="p-3 text-center text-sm text-muted-foreground">{managerSearch ? `No results for '${managerSearch}'` : 'No managers available'}</div>
                      ) : (
                        <ul className="py-1">
                          {filteredManagers.map(m => (
                            <li key={m.user_id}>
                              <button type="button" onClick={() => { setFormData(prev => ({ ...prev, reportsTo: m })); setShowManagerDropdown(false); setManagerSearch(''); }} className="w-full text-left px-3 py-2.5 hover:bg-muted/50 flex items-center gap-3 text-sm">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"><User className="w-4 h-4 text-primary" /></div>
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
            <FieldLabel required={false}>Additional Notes</FieldLabel>
            <textarea value={formData.notes} onChange={(e) => handleChange('notes', e.target.value)} placeholder="Any other observations..." rows={2} className={textareaClass} />
          </div>

          {/* Outcome */}
          <QuestionCard>
            <FieldLabel>Final Outcome</FieldLabel>
            <div className="flex gap-2">
              <button type="button" onClick={() => handleChange('outcome', 'contract_signed')} className={cn('flex-1 py-2.5 rounded-lg font-medium transition-all border text-sm flex items-center justify-center gap-1.5', formData.outcome === 'contract_signed' ? 'bg-success/10 text-success border-success/30' : 'bg-background text-muted-foreground/60 border-border/50 hover:border-success/40')}>
                <CheckCircle2 className="w-4 h-4" />Contract Signed
              </button>
              <button type="button" onClick={() => handleChange('outcome', 'contract_sent_unsigned')} className={cn('flex-1 py-2.5 rounded-lg font-medium transition-all border text-sm flex items-center justify-center gap-1.5', formData.outcome === 'contract_sent_unsigned' ? 'bg-muted text-foreground border-border' : 'bg-background text-muted-foreground/60 border-border/50 hover:border-foreground/30')}>
                <FileCheck className="w-4 h-4" />Sent - Unsigned
              </button>
            </div>
          </QuestionCard>

          {/* Submit */}
          <button onClick={handleSubmit} disabled={isSubmitting} className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-colors disabled:opacity-50">
            {isSubmitting ? 'Submitting...' : 'Submit Interview'}
          </button>
        </div>
      </main>
    </AppLayout>
  );
}
