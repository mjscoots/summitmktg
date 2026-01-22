// Mock data for training folders, lessons, users, and announcements

export type Role = "rookie" | "vet";
export type RoleVisibility = "rookie" | "vet" | "both";
export type LessonStatus = "not_started" | "in_progress" | "completed" | "locked";
export type FolderStatus = "locked" | "in_progress" | "completed";

export interface TrainingFolder {
  id: string;
  title: string;
  description: string;
  roleVisibility: RoleVisibility;
  orderIndex: number;
  lessons: Lesson[];
  required: boolean; // Required for rookies, optional for vets
}

export interface Lesson {
  id: string;
  folderId: string;
  title: string;
  content: string;
  contentType: "text" | "video" | "link";
  duration: string;
  orderIndex: number;
}

export interface UserProgress {
  lessonId: string;
  status: LessonStatus;
  completedAt?: string;
  lastViewedAt?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  progress: UserProgress[];
  lastActive: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  visibility: RoleVisibility;
  createdAt: string;
}

// ============================================================================
// TRAINING MODULES - Based on Summit Training Structure
// ============================================================================

// MODULE 1: Script Foundations (Required for all)
const module1ScriptFoundations: TrainingFolder = {
  id: "module-1-script",
  title: "Module 1: Script Foundations",
  description: "Master the spine of every pitch. Universal door intro, pivot question, flow control, tonality.",
  roleVisibility: "both",
  orderIndex: 1,
  required: true,
  lessons: [
    { id: "m1-l1", folderId: "module-1-script", title: "Universal Door Intro", content: "The first 7 seconds set the tone. Learn the exact words that open doors.", contentType: "text", duration: "10 min", orderIndex: 1 },
    { id: "m1-l2", folderId: "module-1-script", title: "The Pivot Question", content: "'Do you guys have someone, or not yet?' – why this question changes everything.", contentType: "text", duration: "12 min", orderIndex: 2 },
    { id: "m1-l3", folderId: "module-1-script", title: "Flow Control", content: "How to control the conversation without being pushy. Guide, don't push.", contentType: "text", duration: "15 min", orderIndex: 3 },
    { id: "m1-l4", folderId: "module-1-script", title: "Tonality & Pace", content: "Speed, pitch, pauses. Sound like a friend, not a salesman.", contentType: "text", duration: "12 min", orderIndex: 4 },
    { id: "m1-l5", folderId: "module-1-script", title: "Script Foundation Quiz", content: "Test your knowledge before moving on.", contentType: "text", duration: "10 min", orderIndex: 5 },
  ],
};

// MODULE 2: Basic Pitch (Fresh Accounts)
const module2BasicPitch: TrainingFolder = {
  id: "module-2-basic",
  title: "Module 2: Basic Pitch",
  description: "The fresh account pitch. Intro, bridge, price sheet, soft close. Memorize this.",
  roleVisibility: "both",
  orderIndex: 2,
  required: true,
  lessons: [
    { id: "m2-l1", folderId: "module-2-basic", title: "The Full Basic Pitch", content: "Start to finish. The complete fresh account script.", contentType: "text", duration: "20 min", orderIndex: 1 },
    { id: "m2-l2", folderId: "module-2-basic", title: "Intro & Bridge", content: "Get them nodding before you pitch. Build agreement momentum.", contentType: "text", duration: "12 min", orderIndex: 2 },
    { id: "m2-l3", folderId: "module-2-basic", title: "Price Sheet Presentation", content: "How to present price without triggering price resistance.", contentType: "text", duration: "15 min", orderIndex: 3 },
    { id: "m2-l4", folderId: "module-2-basic", title: "Soft Close Techniques", content: "Low-pressure closes that feel natural and convert.", contentType: "text", duration: "12 min", orderIndex: 4 },
    { id: "m2-l5", folderId: "module-2-basic", title: "Basic Pitch Quiz", content: "Rookies must pass. Vets can skip.", contentType: "text", duration: "15 min", orderIndex: 5 },
  ],
};

// MODULE 3: Switchover & DIY
const module3Switchover: TrainingFolder = {
  id: "module-3-switchover",
  title: "Module 3: Switchover & DIY",
  description: "Handle preempted homes and DIY objections. Competitor positioning and value stacking.",
  roleVisibility: "both",
  orderIndex: 3,
  required: true,
  lessons: [
    { id: "m3-l1", folderId: "module-3-switchover", title: "Preempted vs Non-Preempted", content: "Know the difference and adjust your approach instantly.", contentType: "text", duration: "12 min", orderIndex: 1 },
    { id: "m3-l2", folderId: "module-3-switchover", title: "Competitor Positioning", content: "How to handle 'I already have someone' without bashing the competition.", contentType: "text", duration: "15 min", orderIndex: 2 },
    { id: "m3-l3", folderId: "module-3-switchover", title: "Value Stacking", content: "Stack value until price becomes irrelevant. The pyramid approach.", contentType: "text", duration: "15 min", orderIndex: 3 },
    { id: "m3-l4", folderId: "module-3-switchover", title: "'Rather Than' Comparisons", content: "Reframe competitor weaknesses as your strengths.", contentType: "text", duration: "12 min", orderIndex: 4 },
    { id: "m3-l5", folderId: "module-3-switchover", title: "DIY Reframes", content: "When they say 'I do it myself' – here's your response.", contentType: "text", duration: "12 min", orderIndex: 5 },
  ],
};

// MODULE 4: Objection Handling (Unlocks progressively)
const module4Objections: TrainingFolder = {
  id: "module-4-objections",
  title: "Module 4: Objection Handling",
  description: "Every objection you'll hear and exactly how to handle it. Unlocks progressively.",
  roleVisibility: "both",
  orderIndex: 4,
  required: true,
  lessons: [
    { id: "m4-l1", folderId: "module-4-objections", title: "Money Objections", content: "'It's too expensive' – turn price into value.", contentType: "text", duration: "15 min", orderIndex: 1 },
    { id: "m4-l2", folderId: "module-4-objections", title: "Spouse Objection", content: "'I need to talk to my spouse' – keep the deal alive.", contentType: "text", duration: "12 min", orderIndex: 2 },
    { id: "m4-l3", folderId: "module-4-objections", title: "Renting Objection", content: "'I'm just renting' – why that doesn't matter.", contentType: "text", duration: "10 min", orderIndex: 3 },
    { id: "m4-l4", folderId: "module-4-objections", title: "DIY Objection", content: "'I do it myself' – detailed breakdown.", contentType: "text", duration: "12 min", orderIndex: 4 },
    { id: "m4-l5", folderId: "module-4-objections", title: "'Leave Me a Card'", content: "Don't leave. Here's how to stay in the conversation.", contentType: "text", duration: "10 min", orderIndex: 5 },
    { id: "m4-l6", folderId: "module-4-objections", title: "One-Time Spray", content: "Handle 'I just want one treatment' with confidence.", contentType: "text", duration: "10 min", orderIndex: 6 },
    { id: "m4-l7", folderId: "module-4-objections", title: "Contract Objection", content: "'I don't like contracts' – reframe the commitment.", contentType: "text", duration: "12 min", orderIndex: 7 },
    { id: "m4-l8", folderId: "module-4-objections", title: "'No Bugs / Not a Big Deal'", content: "Create urgency when they don't see the problem.", contentType: "text", duration: "12 min", orderIndex: 8 },
  ],
};

// MODULE 5: Closing Systems
const module5Closing: TrainingFolder = {
  id: "module-5-closing",
  title: "Module 5: Closing Systems",
  description: "Soft vs hard, option closes, assumptive closes, the sincere close. Flashcard-style.",
  roleVisibility: "both",
  orderIndex: 5,
  required: true,
  lessons: [
    { id: "m5-l1", folderId: "module-5-closing", title: "Soft vs Hard Closes", content: "Know when to use each. Read the situation.", contentType: "text", duration: "12 min", orderIndex: 1 },
    { id: "m5-l2", folderId: "module-5-closing", title: "Option Closes", content: "Give them choices that all lead to yes.", contentType: "text", duration: "12 min", orderIndex: 2 },
    { id: "m5-l3", folderId: "module-5-closing", title: "Assignment Closes", content: "Assign them the outcome. Lead with certainty.", contentType: "text", duration: "10 min", orderIndex: 3 },
    { id: "m5-l4", folderId: "module-5-closing", title: "Assumptive Closes", content: "Act as if. The psychology of presumption.", contentType: "text", duration: "12 min", orderIndex: 4 },
    { id: "m5-l5", folderId: "module-5-closing", title: "Statement Closes", content: "Close with a statement, not a question.", contentType: "text", duration: "10 min", orderIndex: 5 },
    { id: "m5-l6", folderId: "module-5-closing", title: "The Sincere Close", content: "Last resort. When nothing else works, be real.", contentType: "text", duration: "12 min", orderIndex: 6 },
  ],
};

// MODULE 6: Environmental Close (Backyard Pitch)
const module6Environmental: TrainingFolder = {
  id: "module-6-environmental",
  title: "Module 6: Environmental Close",
  description: "The backyard pitch. A pitch, a close, a momentum reset. A conversion weapon.",
  roleVisibility: "both",
  orderIndex: 6,
  required: true,
  lessons: [
    { id: "m6-l1", folderId: "module-6-environmental", title: "Environmental Close Overview", content: "Why this is your secret weapon. When and why it works.", contentType: "text", duration: "12 min", orderIndex: 1 },
    { id: "m6-l2", folderId: "module-6-environmental", title: "Step-by-Step Flow", content: "The exact sequence from door to backyard to close.", contentType: "text", duration: "15 min", orderIndex: 2 },
    { id: "m6-l3", folderId: "module-6-environmental", title: "Value-Building Examples", content: "Show, don't tell. Real examples that close.", contentType: "text", duration: "15 min", orderIndex: 3 },
    { id: "m6-l4", folderId: "module-6-environmental", title: "Movement Philosophy", content: "Movement creates momentum. The psychology of walking.", contentType: "text", duration: "12 min", orderIndex: 4 },
    { id: "m6-l5", folderId: "module-6-environmental", title: "Price-Drop Justification", content: "When and how to drop price. The logic behind discounts.", contentType: "text", duration: "12 min", orderIndex: 5 },
  ],
};

// Vet-Only Advanced Modules
const vetModule1Advanced: TrainingFolder = {
  id: "vet-advanced",
  title: "Advanced Techniques",
  description: "Body language, mirroring, high-ticket strategies, referral systems.",
  roleVisibility: "vet",
  orderIndex: 7,
  required: false,
  lessons: [
    { id: "v1-l1", folderId: "vet-advanced", title: "Reading Body Language", content: "Advanced techniques for understanding non-verbal cues.", contentType: "text", duration: "20 min", orderIndex: 1 },
    { id: "v1-l2", folderId: "vet-advanced", title: "Mirroring & Rapport", content: "Build deep connection quickly using psychological techniques.", contentType: "text", duration: "18 min", orderIndex: 2 },
    { id: "v1-l3", folderId: "vet-advanced", title: "High-Ticket Selling", content: "Strategies for closing larger deals.", contentType: "text", duration: "25 min", orderIndex: 3 },
    { id: "v1-l4", folderId: "vet-advanced", title: "Referral Systems", content: "Turn every sale into multiple sales.", contentType: "text", duration: "22 min", orderIndex: 4 },
  ],
};

const vetModule2Leadership: TrainingFolder = {
  id: "vet-leadership",
  title: "Team Leadership",
  description: "Lead and develop your team to peak performance.",
  roleVisibility: "vet",
  orderIndex: 8,
  required: false,
  lessons: [
    { id: "v2-l1", folderId: "vet-leadership", title: "Leadership Fundamentals", content: "What makes an effective sales leader.", contentType: "text", duration: "20 min", orderIndex: 1 },
    { id: "v2-l2", folderId: "vet-leadership", title: "Coaching Reps", content: "How to train and develop new reps.", contentType: "text", duration: "25 min", orderIndex: 2 },
    { id: "v2-l3", folderId: "vet-leadership", title: "Running Effective Meetings", content: "Make your team meetings productive.", contentType: "text", duration: "15 min", orderIndex: 3 },
    { id: "v2-l4", folderId: "vet-leadership", title: "Performance Management", content: "Track metrics and drive accountability.", contentType: "text", duration: "22 min", orderIndex: 4 },
  ],
};

// Combined folders for easy access
export const allFolders: TrainingFolder[] = [
  module1ScriptFoundations,
  module2BasicPitch,
  module3Switchover,
  module4Objections,
  module5Closing,
  module6Environmental,
  vetModule1Advanced,
  vetModule2Leadership,
];

// For backwards compatibility
export const rookieFolders = allFolders.filter(f => f.roleVisibility === "both" || f.roleVisibility === "rookie");
export const vetFolders = allFolders.filter(f => f.roleVisibility === "vet");

// Mock Users (Reps)
export const mockUsers: User[] = [
  {
    id: "user-1",
    name: "Alex Johnson",
    email: "alex@summit.com",
    role: "rookie",
    lastActive: "2 hours ago",
    progress: [
      { lessonId: "m1-l1", status: "completed", completedAt: "2024-01-10" },
      { lessonId: "m1-l2", status: "completed", completedAt: "2024-01-11" },
      { lessonId: "m1-l3", status: "completed", completedAt: "2024-01-12" },
      { lessonId: "m1-l4", status: "in_progress", lastViewedAt: "2024-01-13" },
    ],
  },
  {
    id: "user-2",
    name: "Sarah Chen",
    email: "sarah@summit.com",
    role: "vet",
    lastActive: "1 day ago",
    progress: [
      { lessonId: "m1-l1", status: "completed", completedAt: "2024-01-05" },
      { lessonId: "m1-l2", status: "completed", completedAt: "2024-01-05" },
      { lessonId: "m1-l3", status: "completed", completedAt: "2024-01-06" },
      { lessonId: "m1-l4", status: "completed", completedAt: "2024-01-06" },
      { lessonId: "m1-l5", status: "completed", completedAt: "2024-01-07" },
      { lessonId: "m2-l1", status: "completed", completedAt: "2024-01-08" },
      { lessonId: "m2-l2", status: "completed", completedAt: "2024-01-08" },
      { lessonId: "m2-l3", status: "completed", completedAt: "2024-01-09" },
      { lessonId: "m2-l4", status: "completed", completedAt: "2024-01-09" },
      { lessonId: "m3-l1", status: "completed", completedAt: "2024-01-10" },
      { lessonId: "m3-l2", status: "in_progress", lastViewedAt: "2024-01-11" },
    ],
  },
  {
    id: "user-3",
    name: "Mike Davis",
    email: "mike@summit.com",
    role: "rookie",
    lastActive: "5 days ago",
    progress: [
      { lessonId: "m1-l1", status: "completed", completedAt: "2024-01-05" },
      { lessonId: "m1-l2", status: "in_progress", lastViewedAt: "2024-01-08" },
    ],
  },
  {
    id: "user-4",
    name: "Emily Rodriguez",
    email: "emily@summit.com",
    role: "vet",
    lastActive: "3 hours ago",
    progress: [
      { lessonId: "m1-l1", status: "completed" },
      { lessonId: "m1-l2", status: "completed" },
      { lessonId: "m1-l3", status: "completed" },
      { lessonId: "m1-l4", status: "completed" },
      { lessonId: "m1-l5", status: "completed" },
      { lessonId: "m2-l1", status: "completed" },
      { lessonId: "m2-l2", status: "completed" },
      { lessonId: "m2-l3", status: "completed" },
      { lessonId: "m2-l4", status: "completed" },
      { lessonId: "m2-l5", status: "completed" },
      { lessonId: "m3-l1", status: "completed" },
      { lessonId: "m3-l2", status: "completed" },
      { lessonId: "m3-l3", status: "completed" },
      { lessonId: "m3-l4", status: "completed" },
      { lessonId: "m3-l5", status: "completed" },
      { lessonId: "m4-l1", status: "completed" },
      { lessonId: "m4-l2", status: "completed" },
      { lessonId: "m4-l3", status: "in_progress" },
    ],
  },
  {
    id: "user-5",
    name: "James Wilson",
    email: "james@summit.com",
    role: "rookie",
    lastActive: "4 days ago",
    progress: [
      { lessonId: "m1-l1", status: "completed", completedAt: "2024-01-06" },
      { lessonId: "m1-l2", status: "completed", completedAt: "2024-01-07" },
      { lessonId: "m1-l3", status: "completed", completedAt: "2024-01-08" },
    ],
  },
  {
    id: "user-6",
    name: "Jessica Martinez",
    email: "jessica@summit.com",
    role: "rookie",
    lastActive: "1 hour ago",
    progress: [
      { lessonId: "m1-l1", status: "completed" },
      { lessonId: "m1-l2", status: "completed" },
      { lessonId: "m1-l3", status: "completed" },
      { lessonId: "m1-l4", status: "completed" },
      { lessonId: "m1-l5", status: "completed" },
      { lessonId: "m2-l1", status: "completed" },
      { lessonId: "m2-l2", status: "in_progress" },
    ],
  },
];

// Mock Announcements
export const mockAnnouncements: Announcement[] = [
  {
    id: "ann-1",
    title: "Summer Sales Push Starts Monday",
    body: "All hands on deck. We're launching a major initiative next week. Check your territories and come prepared.",
    visibility: "both",
    createdAt: "2024-01-12",
  },
  {
    id: "ann-2",
    title: "New Training Module Available",
    body: "Advanced Closing Techniques is now live. All vets should complete by end of month.",
    visibility: "vet",
    createdAt: "2024-01-10",
  },
  {
    id: "ann-3",
    title: "Weekly Leaderboard Update",
    body: "Top performers this week: Emily R., Sarah C., Jessica M. Keep pushing.",
    visibility: "both",
    createdAt: "2024-01-09",
  },
];

// Helper functions
export function getFoldersForRole(role: Role): TrainingFolder[] {
  return allFolders.filter(
    (f) => f.roleVisibility === "both" || f.roleVisibility === role
  );
}

export function getAnnouncementsForRole(role: Role): Announcement[] {
  return mockAnnouncements.filter(
    (a) => a.visibility === "both" || a.visibility === role
  );
}

export function calculateFolderProgress(
  folder: TrainingFolder,
  userProgress: UserProgress[]
): { completed: number; total: number; percentage: number } {
  const total = folder.lessons.length;
  const completed = folder.lessons.filter((lesson) =>
    userProgress.some((p) => p.lessonId === lesson.id && p.status === "completed")
  ).length;
  return {
    completed,
    total,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

export function getFolderStatus(
  folder: TrainingFolder,
  userProgress: UserProgress[],
  previousFolderCompleted: boolean
): FolderStatus {
  const { completed, total } = calculateFolderProgress(folder, userProgress);
  if (completed === total && total > 0) return "completed";
  if (completed > 0 || previousFolderCompleted) return "in_progress";
  return "locked";
}

export function getLessonStatus(
  lesson: Lesson,
  userProgress: UserProgress[],
  previousLessonCompleted: boolean,
  isFirstLesson: boolean
): LessonStatus {
  const progress = userProgress.find((p) => p.lessonId === lesson.id);
  if (progress?.status === "completed") return "completed";
  if (progress?.status === "in_progress") return "in_progress";
  if (isFirstLesson || previousLessonCompleted) return "not_started";
  return "locked";
}
