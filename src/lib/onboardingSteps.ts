/**
 * The five onboarding steps, in the order they happen.
 * Invite accepted, Training done and Fully onboarded tick themselves.
 * Agreement signed and Payroll setup are ticked by a manager, a pillar or the owner.
 */
export interface OnboardingState {
  invite_accepted: boolean;
  agreement_signed: boolean;
  training_done: boolean;
  payroll_setup: boolean;
  fully_onboarded: boolean;
  done: number;
  total: number;
}

export type ManualStep = 'agreement_signed' | 'payroll_setup';

export const ONBOARDING_STEPS: {
  key: keyof OnboardingState;
  label: string;
  manual: boolean;
}[] = [
  { key: 'invite_accepted', label: 'Invite accepted', manual: false },
  { key: 'agreement_signed', label: 'Agreement signed', manual: true },
  { key: 'training_done', label: 'Training done', manual: false },
  { key: 'payroll_setup', label: 'Payroll setup', manual: true },
  { key: 'fully_onboarded', label: 'Fully onboarded', manual: false },
];

export const EMPTY_ONBOARDING: OnboardingState = {
  invite_accepted: false,
  agreement_signed: false,
  training_done: false,
  payroll_setup: false,
  fully_onboarded: false,
  done: 0,
  total: 5,
};
