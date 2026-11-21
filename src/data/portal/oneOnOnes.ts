export type OneOnOneKind = 'rep' | 'pillar';
export type Answers = Record<string, string>;
export type FormField = {
  key: string;
  label: string;
  type?: 'text' | 'textarea' | 'number' | 'date' | 'time' | 'radio' | 'select';
  options?: readonly string[];
  min?: number;
  max?: number;
};
export type FormSection = {
  title?: string;
  helper?: string;
  fields: FormField[];
  layout?: 'pairs' | 'counts';
};

export const ONE_ON_ONE_NOTICE = "These forms are not saved to TRNTY yet. They save on this device only. Copy or print before you close. Saving to the team log needs Mathew's yes.";
export const ONE_ON_ONE_BOOKING = 'https://calendly.com/mathewjoyce/interviews';
export const STORAGE_KEYS = { rep: 'trnty.1on1.rep.v1', pillar: 'trnty.1on1.pillar.v1' } as const;
export const PILLARS = ['Gabe Brugellis (Bru)', 'Mathew Rubino (Bino)', 'Liam Gardner', 'Colton Joyce', 'Salvatore Viviano (Sal)'] as const;

const field = (key: string, label: string, type: FormField['type'] = 'text'): FormField => ({ key, label, type });
const choice = (key: string, label: string, options: readonly string[]): FormField => ({ key, label, type: 'radio', options });
const energy = (label: string): FormField => ({ key: 'energy', label, type: 'number', min: 1, max: 10 });
const countFields = (activity: string): FormField[] => [activity, 'Conversations', 'Sets or appointments', 'Sales or installs'].flatMap((label, index) => [
  field(`count${index}Last`, `${label} — Last week`, 'number'),
  field(`count${index}Goal`, `${label} — Goal`, 'number'),
]);
const referrals = (): FormField[] => [1, 2, 3].flatMap((n) => [field(`referral${n}Name`, `Name ${n}`), field(`referral${n}Number`, `Number ${n}`)]);
const lastCommitment = (proof: string): FormSection => ({
  title: "3. Last week's commitment",
  fields: [field('lastCommitment', 'What it was'), choice('lastHit', 'Hit / Miss', ['Hit', 'Miss']), field('lastProof', proof)],
});
const routing: FormSection = {
  title: 'Place to stay, travel, or pay',
  helper: 'Write the question, route it, do not answer.',
  fields: [field('routingQuestion', 'Question'), field('routedTo', 'Routed to')],
};
const nextMeeting: FormSection = {
  title: 'Next 1:1', layout: 'pairs',
  fields: [field('nextDate', 'Next 1:1 date', 'date'), field('nextTime', 'Next 1:1 time', 'time')],
};

export const REP_SECTIONS: FormSection[] = [
  { layout: 'pairs', fields: [field('rep', 'Rep'), field('manager', 'Manager'), field('date', 'Date', 'date'), field('weekOf', 'Week of', 'date'), choice('stage', 'Stage', ['Rookie', 'Vet', 'Manager']), choice('vertical', 'Vertical', ['Pest', 'Life', 'Fiber'])] },
  {
    title: "1. Last week's numbers vs the goal. Counts only. Leave a line blank if it does not belong to this vertical. Off-season: use trainings, recruiting, or prep on the activity line.",
    layout: 'counts', fields: countFields('Activity (doors, or off-season work)'),
    helper: 'Counts only. Never write pay, bonus, or revenue numbers.',
  },
  { ...lastCommitment('Proof, or the real reason it was a miss (one line, no stories)'), title: "2. Last week's commitment" },
  { title: "3. What's in the way?", fields: [field('obstacle', 'Biggest obstacle this week, and what caused it', 'textarea')] },
  { title: '4. Mind (skill and certainty)', fields: [field('mind', 'Where is their skill this week? What do they need to get better at?', 'textarea')], helper: 'Certainty is a practice, not a feeling.' },
  { title: '5. Heart (desire and energy)', fields: [energy('Energy this week 1 to 10'), field('heart', "What's in their head, and why they still want this", 'textarea')] },
  { title: '6. Feet (activity)', fields: [field('feet', "Did they hit the floor they set? What's the one activity to change this week?", 'textarea')] },
  { title: '7. Best stretch this week, and what made it different?', fields: [field('bestStretch', 'Best stretch this week, and what made it different?', 'textarea')] },
  { title: '8. Skill drill', fields: [choice('skill', 'Skill drill', ['Door approach', 'Objection handling', 'Close']), field('specificDrill', 'Specific objection or close'), field('didWell', 'What they did well'), field('correct', 'What to correct'), field('secondRun', 'Second run, better or not')] },
  { title: "9. This week's commitment", fields: [field('commitment', 'The one thing'), field('commitmentDue', 'Due', 'date')], helper: 'One sentence, one due date. Their word should close the day they give it.' },
  { title: "10. This week's focus", fields: [choice('focus', "This week's focus", ['Mind (skill)', 'Heart (desire)', 'Feet (activity)']), field('drill', 'The drill'), field('drillWhen', 'When they will run it')] },
  { title: '11. One thing the manager does for them this week', fields: [field('managerAction', 'What you will do'), field('managerDue', 'By when', 'date')] },
  { title: '12. Who do they know that would kill it out here?', layout: 'pairs', fields: referrals() },
  nextMeeting,
  routing,
  { title: 'Notes', fields: [field('notes', 'Notes', 'textarea')] },
  { title: 'Same-night text', helper: 'Send it before the night is over.', fields: [choice('sent', 'Sent', ['Yes', 'No']), field('timeSent', 'Time sent', 'time')] },
];

export const PILLAR_SECTIONS: FormSection[] = [
  { layout: 'pairs', fields: [{ key: 'pillar', label: 'Pillar', type: 'select', options: PILLARS }, field('runBy', 'Run by'), field('date', 'Date', 'date'), field('weekOf', 'Week of', 'date')] },
  {
    title: '1. Team 1:1s last week (Monday review)',
    fields: [field('oneOnOnesDone', '1:1s done', 'number'), field('oneOnOnesDue', '1:1s due', 'number'), field('missedNames', 'Missed 1:1s, names', 'textarea'), field('rescheduledNames', 'Rescheduled same day, names', 'textarea')],
    helper: 'A missed 1:1 with no same-day reschedule is a manager miss, not a rep miss.',
  },
  { title: '2. Team numbers vs goal, counts only', layout: 'counts', fields: countFields('Activity'), helper: 'Counts only. Never write pay, bonus, or revenue numbers.' },
  lastCommitment('Proof, or the real reason'),
  { title: '4. Biggest win this week?', fields: [field('win', 'Biggest win this week?', 'textarea')] },
  { title: '5. Biggest obstacle this week?', fields: [field('obstacle', 'Biggest obstacle this week?', 'textarea')] },
  { title: '6. What help do you need?', fields: [field('help', 'What help do you need?', 'textarea')] },
  { title: '7. Goal for next week?', fields: [field('goal', 'Goal for next week?', 'textarea')] },
  { title: '8. Energy this week, 1 to 10', fields: [energy('Energy this week, 1 to 10')] },
  { title: '9. Anything going on outside work? (optional)', fields: [field('outsideWork', 'Anything going on outside work? (optional)', 'textarea')] },
  { title: '10. Rookie check-ins', fields: [field('rookieCheckIns', 'Who did you sit with this week, and how are they doing?', 'textarea')] },
  { title: "11. Who's struggling?", layout: 'pairs', fields: [1, 2].flatMap((n) => [field(`struggling${n}Name`, `Name ${n}`), field(`struggling${n}Issue`, `What's going on ${n}`)]) },
  { title: "12. Who's ready for more?", layout: 'pairs', fields: [1, 2].flatMap((n) => [field(`ready${n}Name`, `Name ${n}`), field(`ready${n}For`, `Ready for ${n}`)]) },
  { title: '13. Who do you know that would kill it out here?', layout: 'pairs', fields: referrals() },
  { title: "14. This week's commitment", fields: [choice('focus', 'Focus', ['Mind', 'Heart', 'Feet']), field('commitment', 'The one thing'), field('commitmentDue', 'Due', 'date')] },
  routing,
  nextMeeting,
  { title: 'Notes', fields: [field('notes', 'Notes', 'textarea')] },
];

export const FORM_CONFIG = {
  rep: {
    title: 'Rep 1:1',
    subtitle: "Manager-run with each rep, about 10 minutes. Pull last week's numbers and last week's commitment before you sit down. Questions about a place to stay, travel, or pay get written down and routed to Mathew, not answered here.",
    sections: REP_SECTIONS,
  },
  pillar: {
    title: 'Pillar 1:1',
    subtitle: 'Mathew with each pillar, every Monday. Counts only. Never write pay, bonus, or revenue numbers.',
    sections: PILLAR_SECTIONS,
  },
} as const;

function localDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function formDefaults(kind: OneOnOneKind, fullName: string, now = new Date()): Answers {
  const monday = new Date(now);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return { date: localDate(now), weekOf: localDate(monday), [kind === 'rep' ? 'manager' : 'runBy']: fullName };
}

export function sameNightText(answers: Answers): string {
  return `Commitment is ${answers.commitment || '[The one thing]'}. Drill is ${answers.drill || '[The drill]'}, run it ${answers.drillWhen || '[when]'}.`;
}

export function notesSummary(kind: OneOnOneKind, answers: Answers): string {
  const config = FORM_CONFIG[kind];
  const blocks = config.sections.flatMap((section) => {
    const lines = section.fields.flatMap(({ key, label }) => answers[key]?.trim() ? [`${label}: ${answers[key]}`] : []);
    if (kind === 'rep' && section.title === 'Same-night text' && (answers.commitment || answers.drill || answers.drillWhen)) lines.unshift(`Same-night text: ${sameNightText(answers)}`);
    return lines.length ? [[section.title, ...lines].filter(Boolean).join('\n')] : [];
  });
  return [config.title, ...blocks].join('\n\n');
}

export function restoreAnswers(kind: OneOnOneKind, raw: string | null, defaults: Answers): Answers {
  if (!raw) return defaults;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return defaults;
    const entries = FORM_CONFIG[kind].sections.flatMap((s) => s.fields).flatMap(({ key }) => {
      const value = (parsed as Record<string, unknown>)[key];
      return typeof value === 'string' ? [[key, value] as const] : [];
    });
    return { ...defaults, ...Object.fromEntries(entries) };
  } catch {
    return defaults;
  }
}