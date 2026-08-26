/** The Summit Life pipeline stages, in the order the work moves. */
export const LIFE_STAGES = [
  'New',
  'Contacted',
  'Appointment set',
  'Presented',
  'Closed',
  'Not now',
] as const;

export type LifeStage = (typeof LIFE_STAGES)[number];

export interface LifeContact {
  id: string;
  user_id: string;
  contact_name: string;
  phone: string | null;
  stage: string;
  next_step: string | null;
  next_at: string | null;
  notes: string | null;
}

/** The stage that follows this one, wrapping back to the start. */
export function nextStage(stage: string): LifeStage {
  const i = LIFE_STAGES.indexOf(stage as LifeStage);
  return LIFE_STAGES[(i + 1) % LIFE_STAGES.length];
}

export const LIFE_CARD = 'rounded-2xl border border-border bg-card';
