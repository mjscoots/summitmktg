export function canReadCapturedApplicants(role: string | null | undefined): boolean {
  return role === 'owner';
}

export function capturedApplicationSubmitted(lead: { apply_stage?: string | null; application_id?: string | null }): boolean {
  return Boolean(lead.application_id) || lead.apply_stage === 'submitting';
}

export function capturedApplicationStage(lead: { apply_stage?: string | null; application_id?: string | null }): string {
  if (capturedApplicationSubmitted(lead)) return 'Submitted';
  const titles: Record<string, string> = {
    contact: 'How do we reach you?',
    interests: 'What are you most interested in?',
    experience: 'What have you done before?',
    style: 'In person or remote?',
    revenue: 'Last season revenue',
    markets: 'Markets you have worked',
    goal: 'What is your earnings goal for your first year?',
    location: 'Where are you located?',
    referral: 'Who told you about Trinity?',
  };
  return titles[lead.apply_stage || ''] || '';
}