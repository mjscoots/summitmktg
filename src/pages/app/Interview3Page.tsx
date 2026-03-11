import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { ArrowLeft, Search, User, CheckCircle2, FileCheck } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PageBackButton } from '@/components/shared/PageBackButton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ScriptTip, ChecklistItem, QuestionCard,
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
  whatSeparatesYou: string;
  competitive: string;
  handleFeedback: string;
  coreQualities: string;
  readinessScale: string;
  readinessConfidence: string;
  bringToTen: string;
  offerStatement: string;
  oneOnOneTime: string;
  onboardingDone: boolean;
  afterOnboardingDone: boolean;
  sentIntroDone: boolean;
  otherQuestions: string;
  finalGoodbyeDone: boolean;
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
    whatSeparatesYou: '',
    competitive: '',
    handleFeedback: '',
    coreQualities: '',
    readinessScale: '',
    readinessConfidence: '',
    bringToTen: '',
    offerStatement: '',
    oneOnOneTime: '',
    onboardingDone: false,
    afterOnboardingDone: false,
    sentIntroDone: false,
    otherQuestions: '',
    finalGoodbyeDone: false,
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
        id: crypto.randomUUID(), interviewee: formData.recruitName, interview: 3,
        interviewer: formData.interviewerName, submitted: new Date().toISOString(),
        data: {
          'Before Questions': formData.beforeQuestions, '3-5 Pros': formData.prosList, 'Cons': formData.consList,
          'Hoping to Get': formData.hopingToGet, 'How Well Would You Do': formData.howWellWouldYouDo,
          'Revenue Range': formData.revenueRange, 'What With Money': formData.whatWithMoney,
          'What Separates You': formData.whatSeparatesYou, 'Competitive': formData.competitive,
          'Handle Feedback': formData.handleFeedback, 'Core Qualities': formData.coreQualities,
          'Readiness Scale (1-10)': formData.readinessScale, 'Readiness Confidence': formData.readinessConfidence,
          'Bring to 10': formData.bringToTen, 'Offer Statement': formData.offerStatement,
          '1:1 Training Time': formData.oneOnOneTime, 'Onboarding Done': formData.onboardingDone ? 'Yes' : 'No',
          'After Onboarding Done': formData.afterOnboardingDone ? 'Yes' : 'No',
          'Sent Intro': formData.sentIntroDone ? 'Yes' : 'No',
          'Other Questions': formData.otherQuestions,
          'Final Outcome': formData.outcome === 'contract_signed' ? 'Contract Signed' : 'Contract Sent - Unsigned',
          'Team Assignment': hasTeam ? `${teamName} → ${formData.reportsTo?.full_name}` : 'Not assigned',
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
    } finally { setIsSubmitting(false); }
  };

  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  const hasTeam = formData.teamId !== '__none__';

  return (
    <AppLayout>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Back Button */}
        <PageBackButton to="/app/interviews" label="Forms" />

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">3</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Summit: Third Interview Call</h1>
            <p className="text-muted-foreground text-xs mt-0.5">Final interview and potential offer</p>
          </div>
        </div>

        {/* Script tip */}
        <ScriptTip>
          (If the sales representative can start in the next 3 weeks you can skip most of this interview and just go straight to having them sign the contract and after)
          <br /><br />
          Our goal is to get people on blitzes within 2 weeks. Some people will take longer and will only want to do 1-2 trainings a week. Some will want to do 3-4. Make sure they understand that after they finish training 2, we'll book their flight out to a blitz so they can start making money.
          <br /><br />
          (If at any point in the third interview, if they say "I need to think about it or I need to talk with my parents etc" Use a pull back to see if they're actually interested.)
          <br /><br />
          "That's okay, after going through this I don't think this will work out, I think we'll take someone else"
          <br /><br />
          See how they react and what they do. See if they fight for it. People that are successful in sales are decisive and creative.
        </ScriptTip>

        {/* Form */}
        <div className="space-y-6 mt-8">
          <QuestionCard>
            <FieldLabel>Name of Recruit</FieldLabel>
            <input type="text" value={formData.recruitName} onChange={(e) => handleChange('recruitName', e.target.value)} placeholder="Enter recruit's full name" className={inputClass} />
          </QuestionCard>

          <QuestionCard>
            <FieldLabel>Name of Interviewer</FieldLabel>
            <input type="text" value={formData.interviewerName} onChange={(e) => handleChange('interviewerName', e.target.value)} placeholder="Your name" className={inputClass} />
          </QuestionCard>

          <QuestionCard>
            <FieldLabel>Before we get started do you have any questions?</FieldLabel>
            <FieldHint>By this time you've already learned a lot about pest control. You understand why we are growing so much, why we're looking to develop more salesmen and managers. You should understand pay, hours, typical day to day life and housing. Today we're going to see if this will be a good fit for you and us. Let's get started.</FieldHint>
            <textarea value={formData.beforeQuestions} onChange={(e) => handleChange('beforeQuestions', e.target.value)} placeholder="Your answer" rows={3} className={textareaClass} />
          </QuestionCard>

          <QuestionCard>
            <FieldLabel>What are 3-5 pros of getting the internship or Job:</FieldLabel>
            <textarea value={formData.prosList} onChange={(e) => handleChange('prosList', e.target.value)} placeholder="Your answer" rows={3} className={textareaClass} />
          </QuestionCard>

          <QuestionCard>
            <FieldLabel>Any cons can you think of?</FieldLabel>
            <textarea value={formData.consList} onChange={(e) => handleChange('consList', e.target.value)} placeholder="Your answer" rows={3} className={textareaClass} />
          </QuestionCard>

          <QuestionCard>
            <FieldLabel>What are you hoping to get out of this position?</FieldLabel>
            <FieldHint>(Money, Travel, Experience)</FieldHint>
            <textarea value={formData.hopingToGet} onChange={(e) => handleChange('hopingToGet', e.target.value)} placeholder="Your answer" rows={3} className={textareaClass} />
          </QuestionCard>

          <QuestionCard>
            <FieldLabel>How well do you feel you would do at something like this? What makes you say that?</FieldLabel>
            <textarea value={formData.howWellWouldYouDo} onChange={(e) => handleChange('howWellWouldYouDo', e.target.value)} placeholder="Your answer" rows={3} className={textareaClass} />
          </QuestionCard>

          <QuestionCard>
            <FieldLabel>If 75k revenue is low and 350k revenue is high, where do you see yourself?</FieldLabel>
            <textarea value={formData.revenueRange} onChange={(e) => handleChange('revenueRange', e.target.value)} placeholder="Your answer" rows={3} className={textareaClass} />
          </QuestionCard>

          <QuestionCard>
            <FieldLabel>What would you do with that kind of money?</FieldLabel>
            <FieldHint>Do you remember how much that was on the pay scale? They will probably say no. (Send them the pay scale and do the math)</FieldHint>
            <textarea value={formData.whatWithMoney} onChange={(e) => handleChange('whatWithMoney', e.target.value)} placeholder="Your answer" rows={3} className={textareaClass} />
          </QuestionCard>

          <QuestionCard>
            <FieldLabel>What separates you from the others we're considering hiring for the position?</FieldLabel>
            <textarea value={formData.whatSeparatesYou} onChange={(e) => handleChange('whatSeparatesYou', e.target.value)} placeholder="Your answer" rows={3} className={textareaClass} />
          </QuestionCard>

          <QuestionCard>
            <FieldLabel>Would you consider yourself a competitive person?</FieldLabel>
            <FieldHint>(Bring up competitive nature of the summer and incentives.)</FieldHint>
            <textarea value={formData.competitive} onChange={(e) => handleChange('competitive', e.target.value)} placeholder="Your answer" rows={3} className={textareaClass} />
          </QuestionCard>

          <QuestionCard>
            <FieldLabel>How well do you handle feedback?</FieldLabel>
            <textarea value={formData.handleFeedback} onChange={(e) => handleChange('handleFeedback', e.target.value)} placeholder="Your answer" rows={3} className={textareaClass} />
          </QuestionCard>

          <QuestionCard>
            <FieldLabel>Summit looks for 2 core qualities in every representative: Coachability, and Work Ethic. Knowing our company core qualities, do you feel like this would be a good fit for you? Why?</FieldLabel>
            <textarea value={formData.coreQualities} onChange={(e) => handleChange('coreQualities', e.target.value)} placeholder="Your answer" rows={3} className={textareaClass} />
          </QuestionCard>

          <QuestionCard>
            <FieldLabel>On a scale of 1-10, (1 being low, 10 being high), how ready are you to get started? What makes you have that much confidence in yourself that you would succeed?</FieldLabel>
            <FieldHint>(Watch as you see their pattern of thinking interrupted.)</FieldHint>
            <RatingScale value={formData.readinessScale} onChange={(v) => handleChange('readinessScale', v)} />
            <textarea value={formData.readinessConfidence} onChange={(e) => handleChange('readinessConfidence', e.target.value)} placeholder="What makes you have that much confidence in yourself that you would succeed?" rows={3} className={textareaClass} />
          </QuestionCard>

          <QuestionCard>
            <FieldLabel>Going back to our previous question we're only interested in giving offers to people that are wanting to work with us. What would need to happen to bring you up to a 10? Is there anything else? No question in your mind? (Make it a final objection) "Awesome so it sounds like you're as sure as you can be and you just need some hands on experience now"</FieldLabel>
            <ChecklistItem checked={formData.bringToTen !== ''} onChange={() => handleChange('bringToTen', formData.bringToTen ? '' : 'done')} label="Done" />
          </QuestionCard>

          <QuestionCard>
            <FieldLabel>Offer Statement</FieldLabel>
            <FieldHint>Say this: "It sounds like your pros outweigh your cons, your goals align with the company and what we're trying to accomplish. Before we go any further, if I offer you the position would you be able to attend trainings on Wednesday at 7 PM EST. One important clarification. The company invests roughly $8,000 per rep, covering training, onboarding, and summer housing. That investment is protected by a minimum three-week commitment. If someone shows up, follows expectations—no drinking on the job, no smoking before morning meetings—and still decides it's not a fit within those three weeks, they owe nothing. If someone fails to commit or becomes a problem, we still don't charge the full amount. The only cost passed on is housing, capped at $2,500. Understanding that lack of a three-week commitment may result in a housing charge, are you prepared to move forward and take this seriously? Only do this next part if they are 100% able to come: Great! I'd officially like to offer you the position! Congratulations, I'll go over your onboarding forms now."</FieldHint>
            <textarea value={formData.offerStatement} onChange={(e) => handleChange('offerStatement', e.target.value)} placeholder="Your answer" rows={3} className={textareaClass} />
          </QuestionCard>

          <QuestionCard>
            <FieldLabel>What day and time do you want to do your 1 on 1 trainings?</FieldLabel>
            <input type="text" value={formData.oneOnOneTime} onChange={(e) => handleChange('oneOnOneTime', e.target.value)} placeholder="" className={inputClass} />
          </QuestionCard>

          {/* Onboarding */}
          <div>
            <p className="text-sm font-semibold text-foreground">Onboarding Overview</p>
            <FieldHint>Great—let's get your onboarding completed. Walk them through: 1099 contractor status, conduct expectations, professional appearance, non-compete clause, incentives and trips, pay structure, $2,500 scholarship requirements. Mute while they review agreement.</FieldHint>
            <ChecklistItem checked={formData.onboardingDone} onChange={() => handleChange('onboardingDone', !formData.onboardingDone)} label="Done" />
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">After onboarding / agreement signed</p>
            <FieldHint>Congratulations—we're excited to work with you. If available to knock soon, aim for blitz within 2 weeks. Send them: pitch (memorize before first training), training course link, script, questionnaire, and 1:1 time. Expectations: Practice with another intern every other day, complete weekly training forms with 70%+ completion, memorize basic pitch within 1 week, submit pitch video after full training.</FieldHint>
            <ChecklistItem checked={formData.afterOnboardingDone} onChange={() => handleChange('afterOnboardingDone', !formData.afterOnboardingDone)} label="Done" />
          </div>

          <div>
            <p className="text-sm font-medium text-foreground">Did you send them the intro? <span className="text-destructive">*</span></p>
            <ChecklistItem checked={formData.sentIntroDone} onChange={() => handleChange('sentIntroDone', !formData.sentIntroDone)} label="Done" />
          </div>

          <QuestionCard>
            <FieldLabel>Any other questions?</FieldLabel>
            <textarea value={formData.otherQuestions} onChange={(e) => handleChange('otherQuestions', e.target.value)} placeholder="Your answer" rows={3} className={textareaClass} />
          </QuestionCard>

          <div>
            <p className="text-sm font-medium text-foreground">Tell them have a great day and see you tomorrow</p>
            <ChecklistItem checked={formData.finalGoodbyeDone} onChange={() => handleChange('finalGoodbyeDone', !formData.finalGoodbyeDone)} label="Done" />
          </div>

          {/* Team Assignment */}
          <div className="pt-4 border-t border-border/40">
            <p className="text-base font-semibold text-foreground mb-4">Team Assignment</p>
            <div className="space-y-4">
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
          <button onClick={handleSubmit} disabled={isSubmitting} className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            ✈ {isSubmitting ? 'Submitting...' : 'Submit Interview 3'}
          </button>
        </div>
      </main>
    </AppLayout>
  );
}
