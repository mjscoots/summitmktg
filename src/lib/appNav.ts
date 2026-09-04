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
  MoreHorizontal,
  BookOpen,
  Link2,
  Sparkles,
  Wrench,
  Palette,
  Bell,
  Lock,

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

/**
 * The one phone bar for every workspace: the five places the day runs
 * through, plus More for everything else.
 */
export const PHONE_BAR: NavDest[] = [
  { key: 'home', label: 'Home', path: '/app', icon: Home },
  { key: 'chat', label: 'Chat', path: '/app/chat', icon: MessageCircle },
  { key: 'events', label: 'Events', path: '/app/events', icon: CalendarClock },
  { key: 'money', label: 'Money', path: '/app/money', icon: DollarSign },
  { key: 'training', label: 'Training', path: '/app/training', icon: GraduationCap },
  { key: 'more', label: 'More', path: '/app/more', icon: MoreHorizontal },
];

/** The phone bottom bar. Every workspace shares it. */
export function phoneBar(_vertical?: string | null): NavDest[] {
  return PHONE_BAR;
}



/** Everything else a rep can reach. One definition, used by the phone sheet and the sidebar. */
export const DESTINATIONS: NavDest[] = [
  { key: 'money', label: 'My money', path: '/app/money', icon: DollarSign },
  { key: 'events', label: 'Events', path: '/app/events', icon: CalendarClock },
  { key: 'leaderboard', label: 'Leaderboard', path: '/app/leaderboard', icon: Trophy },
  { key: 'leads', label: 'Leads', path: '/app/leads', icon: PhoneCall, minTier: 'manager' },
  { key: 'team', label: 'Team', path: '/app/team', icon: Users, minTier: 'manager' },
  { key: 'approvals', label: 'Approvals', path: '/app/pitch-approvals', icon: Video, minTier: 'manager' },
  { key: 'admin', label: 'Pillar', path: '/admin/requests', icon: Shield, minTier: 'admin' },
  { key: 'profile', label: 'Profile', path: '/app/profile', icon: User },
];

/** Desktop sidebar main group: the same five plus Schedule and Leaderboard. */
export const DESKTOP_MAIN_KEYS = ['home', 'learn', 'chat', 'money', 'events', 'leaderboard'];

export const DESKTOP_MAIN: NavDest[] = [
  { key: 'home', label: 'Home', path: '/app', icon: Home },
  { key: 'learn', label: 'Learn', path: '/app/training', icon: GraduationCap },
  { key: 'chat', label: 'Chat', path: '/app/chat', icon: MessageCircle },
  { key: 'money', label: 'My money', path: '/app/money', icon: DollarSign },
  { key: 'events', label: 'Events', path: '/app/events', icon: CalendarClock },
  { key: 'leaderboard', label: 'Leaderboard', path: '/app/leaderboard', icon: Trophy },
];

export const MANAGE_KEYS = ['team', 'leads', 'approvals'];

/** Every destination a workspace can offer, keyed for the filters below. */
const ALL: Record<string, NavDest> = {
  home: { key: 'home', label: 'Home', path: '/app', icon: Home },
  learn: { key: 'learn', label: 'Learn', path: '/app/training', icon: GraduationCap },
  chat: { key: 'chat', label: 'Chat', path: '/app/chat', icon: MessageCircle },
  money: { key: 'money', label: 'My money', path: '/app/money', icon: DollarSign },
  events: { key: 'events', label: 'Events', path: '/app/events', icon: CalendarClock },
  schedule: { key: 'schedule', label: 'Events', path: '/app/events', icon: CalendarClock },
  blitzes: { key: 'blitzes', label: 'Blitzes', path: '/app/events', icon: CalendarClock },
  leaderboard: { key: 'leaderboard', label: 'Leaderboard', path: '/app/leaderboard', icon: Trophy },
  board: { key: 'board', label: 'Board', path: '/app/leaderboard', icon: Trophy },
  season: { key: 'season', label: 'Season', path: '/app/season', icon: Trophy },
  installs: { key: 'installs', label: 'Installs', path: '/app/installs', icon: Wifi },
  stacks: { key: 'stacks', label: 'Stacks', path: '/app/stacks', icon: DollarSign, minTier: 'manager' },
  pipeline: { key: 'pipeline', label: 'Pipeline', path: '/app/pipeline', icon: ClipboardList },
  team: { key: 'team', label: 'Team', path: '/app/team', icon: Users, minTier: 'manager' },
  week: { key: 'week', label: 'My week', path: '/app/week', icon: CalendarClock, minTier: 'manager' },
  leads: { key: 'leads', label: 'Leads', path: '/app/leads', icon: PhoneCall, minTier: 'manager' },
  forms: { key: 'forms', label: 'Forms', path: '/app/forms', icon: FileText, minTier: 'manager' },
  approvals: { key: 'approvals', label: 'Approvals', path: '/app/pitch-approvals', icon: Video, minTier: 'manager' },
  admin: { key: 'admin', label: 'Pillar', path: '/admin/requests', icon: Shield, minTier: 'admin' },
  profile: { key: 'profile', label: 'Profile', path: '/app/profile', icon: User },
  chatLook: { key: 'chatLook', label: 'Chat look', path: '/app/chat-look', icon: Palette },
  appearance: { key: 'appearance', label: 'Appearance', path: '/app/appearance', icon: Palette },
  notificationSettings: {
    key: 'notificationSettings',
    label: 'Notifications',
    path: '/app/notifications',
    icon: Bell,
  },
  account: { key: 'account', label: 'Account', path: '/app/account', icon: Lock },
  scripts: { key: 'scripts', label: 'Scripts', path: '/app/scripts', icon: BookOpen },
  resources: { key: 'resources', label: 'Resources', path: '/app/links', icon: Link2 },
  ask: { key: 'ask', label: 'Ask Summit', path: '/app/ask', icon: Sparkles },
  doors: { key: 'doors', label: 'Doors mode', path: '/app/doors', icon: Home },
  missions: { key: 'missions', label: 'To do', path: '/app/missions', icon: ClipboardList },
  recruits: { key: 'recruits', label: 'Recruits', path: '/app/recruits', icon: Users, minTier: 'manager' },
  industries: { key: 'industries', label: 'Industries', path: '/app/industries', icon: Wrench },
  estimate: { key: 'estimate', label: 'Estimate earnings', path: '/app/estimate-earnings', icon: DollarSign },
  alumni: { key: 'alumni', label: 'Alumni', path: '/app/alumni', icon: Users },
  today: { key: 'today', label: 'Today', path: '/app/day', icon: CalendarClock, minTier: 'manager' },
  prep: { key: 'prep', label: 'One on one prep', path: '/app/one-on-ones/prep', icon: FileText, minTier: 'manager' },
  sweep: { key: 'sweep', label: 'Roster sweep', path: '/app/roster/sweep', icon: ClipboardList, minTier: 'manager' },
  warroom: { key: 'warroom', label: 'War room', path: '/app/war-room', icon: Shield, minTier: 'manager' },
  logistics: { key: 'logistics', label: 'Rep logistics', path: '/app/logistics', icon: ClipboardList, minTier: 'manager' },
  command: { key: 'command', label: 'Command center', path: '/command', icon: Shield, minTier: 'admin' },
  videos: { key: 'videos', label: 'Video library', path: '/app/training/videos', icon: Video },
  managerVideos: {
    key: 'managerVideos',
    label: 'Manager videos',
    path: '/app/training/manager-videos',
    icon: Video,
    minTier: 'manager',
  },
  managerMeeting: {
    key: 'managerMeeting',
    label: 'Manager meeting',
    path: '/app/manager-meeting',
    icon: CalendarClock,
    minTier: 'manager',
  },
};

export interface NavGroup {
  title: string;
  items: NavDest[];
}

/**
 * The More screen: everything the phone bar does not carry, grouped by the
 * job it belongs to and filtered to what this person can open.
 */
export function moreGroups(
  vertical: string | null | undefined,
  role: string | null | undefined
): NavGroup[] {
  const tier = tierOf(role);
  const w = ws(vertical);

  const workspaceKeys =
    w === 'fiber'
      ? ['leaderboard', 'installs', 'stacks', 'industries']
      : w === 'life'
        ? ['pipeline', 'leaderboard', 'industries']
        : ['leaderboard', 'season', 'missions', 'doors', 'industries'];

  const groups: NavGroup[] = [
    { title: 'Your work', items: workspaceKeys.map((k) => ALL[k]) },
    {
      title: 'Learn and tools',
      items: ['scripts', 'resources', 'videos', 'ask', ...(w === 'pest' ? ['estimate'] : [])].map(
        (k) => ALL[k]
      ),
    },
    {
      title: 'Manage',
      items: [
        'today',
        'team',
        'leads',
        'approvals',
        'forms',
        'prep',
        'sweep',
        'recruits',
        'warroom',
        'logistics',
        'managerVideos',
        'managerMeeting',
      ].map((k) => ALL[k]),
    },
    { title: 'Company', items: ['admin', 'command', 'alumni'].map((k) => ALL[k]) },
    {
      title: 'Settings',
      items: ['profile', 'appearance', 'notificationSettings', 'account'].map((k) => ALL[k]),
    },
  ];

  return groups
    .map((g) => ({ title: g.title, items: g.items.filter((d) => d && allowed(d, tier)) }))
    .filter((g) => g.items.length > 0);
}


type Workspace = 'pest' | 'fiber' | 'life';

function ws(vertical: string | null | undefined): Workspace {
  const v = (vertical || 'Pest').toLowerCase();
  return v === 'fiber' || v === 'life' ? (v as Workspace) : 'pest';
}

/** The main group per workspace: every surface shows the same set. */
const MAIN_KEYS: Record<Workspace, string[]> = {
  pest: ['home', 'learn', 'chat', 'money', 'events', 'leaderboard'],
  // Fiber Learn only appears once the Fiber training has published content.
  fiber: ['home', 'chat', 'money', 'events', 'board'],
  life: ['home', 'pipeline', 'chat', 'learn', 'money', 'events'],
};

/** The Manage group per workspace. */
const WS_MANAGE_KEYS: Record<Workspace, string[]> = {
  pest: ['team', 'leads', 'approvals'],
  fiber: ['team', 'leads'],
  life: ['team'],
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
