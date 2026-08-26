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
  { key: 'installs', label: 'Installs', path: '/app/installs', icon: Wifi },
  { key: 'money', label: 'Money', path: '/app/money', icon: DollarSign },
  { key: 'team', label: 'Team', path: '/app/team', icon: Users },
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
  { key: 'forms', label: 'Forms', path: '/app/forms', icon: FileText, minTier: 'manager' },
  { key: 'approvals', label: 'Approvals', path: '/app/pitch-approvals', icon: Video, minTier: 'manager' },
  { key: 'admin', label: 'Admin', path: '/admin/inbox', icon: Shield, minTier: 'admin' },
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

export const MANAGE_KEYS = ['team', 'leads', 'forms', 'approvals'];

export function manageDestinations(role: string | null | undefined): NavDest[] {
  const tier = tierOf(role);
  return DESTINATIONS.filter((d) => MANAGE_KEYS.includes(d.key) && allowed(d, tier));
}

/**
 * The phone drawer list, in the owner's order: the main destinations first,
 * then Manage, then Admin and Profile.
 */
export function drawerDestinations(role: string | null | undefined): NavDest[] {
  const tier = tierOf(role);
  const main = DESKTOP_MAIN;
  const rest = DESTINATIONS.filter(
    (d) => !DESKTOP_MAIN_KEYS.includes(d.key) && allowed(d, tier)
  );
  return [...main, ...rest];
}

/** The "Go to" list in the phone sheet, in the owner's order. */
export function sheetDestinations(role: string | null | undefined): NavDest[] {
  const tier = tierOf(role);
  return DESTINATIONS.filter((d) => allowed(d, tier));
}

export function canSeeAdmin(role: string | null | undefined): boolean {
  const tier = tierOf(role);
  return tier === 'admin' || tier === 'owner';
}
