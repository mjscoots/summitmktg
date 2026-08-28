import {
  Home,
  GraduationCap,
  MessageCircle,
  DollarSign,
  CalendarClock,
  Trophy,
  Users,
  PhoneCall,
  FileText,
  Video,
  Shield,
  User,
  Wifi,
  ClipboardList,

  type LucideIcon,
} from 'lucide-react';
import { tierOf, type Tier } from '@/lib/tiers';

export interface NavDest {
  key: string;
  label: string;
  path: string;
  icon: LucideIcon;
  /** Minimum tier that can see this destination. */
  minTier?: Tier;
}

const TIER_ORDER: Tier[] = ['sales', 'manager', 'admin', 'owner'];

function allowed(dest: NavDest, tier: Tier): boolean {
  if (!dest.minTier) return true;
  return TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf(dest.minTier);
}

/** Pest bottom bar: the five places a pest rep works from. */
export const PHONE_BAR: NavDest[] = [
  { key: 'home', label: 'Home', path: '/app', icon: Home },
  { key: 'chat', label: 'Chat', path: '/app/chat', icon: MessageCircle },
  { key: 'training', label: 'Training', path: '/app/training', icon: GraduationCap },
  { key: 'money', label: 'Money', path: '/app/money', icon: DollarSign },
  { key: 'leaderboard', label: 'Board', path: '/app/leaderboard', icon: Trophy },
];

/** Fiber works on installs, not accounts, so its bar carries its own work. */
export const FIBER_PHONE_BAR: NavDest[] = [
  { key: 'home', label: 'Home', path: '/app', icon: Home },
  { key: 'chat', label: 'Chat', path: '/app/chat', icon: MessageCircle },
  { key: 'money', label: 'Money', path: '/app/money', icon: DollarSign },
  { key: 'board', label: 'Board', path: '/app/leaderboard', icon: Trophy },
];

/** Life works on appointments and a pipeline, so its bar carries that work. */
export const LIFE_PHONE_BAR: NavDest[] = [
  { key: 'home', label: 'Home', path: '/app', icon: Home },
  { key: 'chat', label: 'Chat', path: '/app/chat', icon: MessageCircle },
  { key: 'pipeline', label: 'Pipeline', path: '/app/pipeline', icon: ClipboardList },
  { key: 'training', label: 'Training', path: '/app/training', icon: GraduationCap },
  { key: 'money', label: 'Money', path: '/app/money', icon: DollarSign },
];

/** The phone bottom bar for the active workspace. */
export function phoneBar(vertical: string | null | undefined): NavDest[] {
  if (vertical === 'Fiber') return FIBER_PHONE_BAR;
  if (vertical === 'Life') return LIFE_PHONE_BAR;
  return PHONE_BAR;
}


/** Everything else a rep can reach. One definition, used by the phone sheet and the sidebar. */
export const DESTINATIONS: NavDest[] = [
  { key: 'money', label: 'My money', path: '/app/money', icon: DollarSign },
  { key: 'schedule', label: 'Schedule', path: '/app/events', icon: CalendarClock },
  { key: 'leaderboard', label: 'Leaderboard', path: '/app/leaderboard', icon: Trophy },
  { key: 'leads', label: 'Leads', path: '/app/leads', icon: PhoneCall, minTier: 'manager' },
  { key: 'team', label: 'Team', path: '/app/team', icon: Users, minTier: 'manager' },
  { key: 'approvals', label: 'Approvals', path: '/app/pitch-approvals', icon: Video, minTier: 'manager' },
  { key: 'admin', label: 'Admin', path: '/admin/requests', icon: Shield, minTier: 'admin' },
  { key: 'profile', label: 'Profile', path: '/app/profile', icon: User },
];

/** Desktop sidebar main group: the same five plus Schedule and Leaderboard. */
export const DESKTOP_MAIN_KEYS = ['home', 'learn', 'chat', 'money', 'schedule', 'leaderboard'];

export const DESKTOP_MAIN: NavDest[] = [
  { key: 'home', label: 'Home', path: '/app', icon: Home },
  { key: 'learn', label: 'Learn', path: '/app/training', icon: GraduationCap },
  { key: 'chat', label: 'Chat', path: '/app/chat', icon: MessageCircle },
  { key: 'money', label: 'My money', path: '/app/money', icon: DollarSign },
  { key: 'schedule', label: 'Schedule', path: '/app/events', icon: CalendarClock },
  { key: 'leaderboard', label: 'Leaderboard', path: '/app/leaderboard', icon: Trophy },
];

export const MANAGE_KEYS = ['team', 'week', 'leads', 'approvals'];

/** Every destination a workspace can offer, keyed for the filters below. */
const ALL: Record<string, NavDest> = {
  home: { key: 'home', label: 'Home', path: '/app', icon: Home },
  learn: { key: 'learn', label: 'Learn', path: '/app/training', icon: GraduationCap },
  chat: { key: 'chat', label: 'Chat', path: '/app/chat', icon: MessageCircle },
  money: { key: 'money', label: 'My money', path: '/app/money', icon: DollarSign },
  schedule: { key: 'schedule', label: 'Schedule', path: '/app/events', icon: CalendarClock },
  blitzes: { key: 'blitzes', label: 'Blitzes', path: '/app/events', icon: CalendarClock },
  leaderboard: { key: 'leaderboard', label: 'Leaderboard', path: '/app/leaderboard', icon: Trophy },
  board: { key: 'board', label: 'Board', path: '/app/leaderboard', icon: Trophy },
  season: { key: 'season', label: 'Season', path: '/app/season', icon: Trophy },
  installs: { key: 'installs', label: 'Installs', path: '/app/installs', icon: Wifi },
  pipeline: { key: 'pipeline', label: 'Pipeline', path: '/app/pipeline', icon: ClipboardList },
  team: { key: 'team', label: 'Team', path: '/app/team', icon: Users, minTier: 'manager' },
  week: { key: 'week', label: 'My week', path: '/app/week', icon: CalendarClock, minTier: 'manager' },
  leads: { key: 'leads', label: 'Leads', path: '/app/leads', icon: PhoneCall, minTier: 'manager' },
  forms: { key: 'forms', label: 'Forms', path: '/app/forms', icon: FileText, minTier: 'manager' },
  approvals: { key: 'approvals', label: 'Approvals', path: '/app/pitch-approvals', icon: Video, minTier: 'manager' },
  admin: { key: 'admin', label: 'Admin', path: '/admin/requests', icon: Shield, minTier: 'admin' },
  profile: { key: 'profile', label: 'Profile', path: '/app/profile', icon: User },
};

type Workspace = 'pest' | 'fiber' | 'life';

function ws(vertical: string | null | undefined): Workspace {
  const v = (vertical || 'Pest').toLowerCase();
  return v === 'fiber' || v === 'life' ? (v as Workspace) : 'pest';
}

/** The main group per workspace: every surface shows the same set. */
const MAIN_KEYS: Record<Workspace, string[]> = {
  pest: ['home', 'learn', 'chat', 'money', 'leaderboard'],
  // Fiber Learn only appears once the Fiber training has published content.
  fiber: ['home', 'chat', 'money', 'board'],
  life: ['home', 'pipeline', 'chat', 'learn', 'money'],
};

/** The Manage group per workspace. */
const WS_MANAGE_KEYS: Record<Workspace, string[]> = {
  pest: ['team', 'week', 'leads', 'approvals'],
  fiber: ['team', 'week', 'leads'],
  life: ['team', 'week'],
};

export function desktopMain(vertical: string | null | undefined): NavDest[] {
  return MAIN_KEYS[ws(vertical)].map((k) => ALL[k]);
}

export function manageFor(vertical: string | null | undefined, role: string | null | undefined): NavDest[] {
  const tier = tierOf(role);
  return WS_MANAGE_KEYS[ws(vertical)].map((k) => ALL[k]).filter((d) => allowed(d, tier));
}

/**
 * Every destination for a workspace and role, in one order:
 * the main group, then Manage, then Admin and Profile.
 */
export function destinations(
  vertical: string | null | undefined,
  role: string | null | undefined
): NavDest[] {
  const tier = tierOf(role);
  const tail = [ALL.admin, ALL.profile].filter((d) => allowed(d, tier));
  return [...desktopMain(vertical), ...manageFor(vertical, role), ...tail];
}

export function manageDestinations(role: string | null | undefined): NavDest[] {
  const tier = tierOf(role);
  return DESTINATIONS.filter((d) => MANAGE_KEYS.includes(d.key) && allowed(d, tier));
}

/**
 * The phone drawer list, in the owner's order: the main destinations first,
 * then Manage, then Admin and Profile.
 */
export function drawerDestinations(
  role: string | null | undefined,
  vertical?: string | null
): NavDest[] {
  return destinations(vertical, role);
}

/** The "Go to" list in the phone sheet, in the owner's order. */
export function sheetDestinations(
  role: string | null | undefined,
  vertical?: string | null
): NavDest[] {
  return destinations(vertical, role);
}


export function canSeeAdmin(role: string | null | undefined): boolean {
  const tier = tierOf(role);
  return tier === 'admin' || tier === 'owner';
}
