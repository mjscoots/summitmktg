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

// Training Folders - Rookie Content
export const rookieFolders: TrainingFolder[] = [
  {
    id: "rookie-1",
    title: "Sales Fundamentals",
    description: "Master the core principles of D2D sales",
    roleVisibility: "both",
    orderIndex: 1,
    lessons: [
      { id: "r1-l1", folderId: "rookie-1", title: "Introduction to D2D Sales", content: "Welcome to Summit. This lesson covers the fundamentals of door-to-door sales and what it takes to succeed in this industry.", contentType: "text", duration: "12 min", orderIndex: 1 },
      { id: "r1-l2", folderId: "rookie-1", title: "The Sales Mindset", content: "Your mindset determines your success. Learn how to develop mental toughness and resilience.", contentType: "text", duration: "15 min", orderIndex: 2 },
      { id: "r1-l3", folderId: "rookie-1", title: "Understanding Your Customer", content: "Learn to identify customer needs and pain points before making your pitch.", contentType: "text", duration: "18 min", orderIndex: 3 },
      { id: "r1-l4", folderId: "rookie-1", title: "First Impressions", content: "You have 7 seconds to make a first impression. Make them count.", contentType: "text", duration: "10 min", orderIndex: 4 },
      { id: "r1-l5", folderId: "rookie-1", title: "Module Recap", content: "Review key concepts from Sales Fundamentals.", contentType: "text", duration: "8 min", orderIndex: 5 },
    ],
  },
  {
    id: "rookie-2",
    title: "The Pitch",
    description: "Craft and deliver a compelling sales pitch",
    roleVisibility: "both",
    orderIndex: 2,
    lessons: [
      { id: "r2-l1", folderId: "rookie-2", title: "Anatomy of a Pitch", content: "Break down the structure of an effective sales pitch.", contentType: "text", duration: "20 min", orderIndex: 1 },
      { id: "r2-l2", folderId: "rookie-2", title: "Opening Strong", content: "Your opening line sets the tone. Learn proven openers that work.", contentType: "text", duration: "15 min", orderIndex: 2 },
      { id: "r2-l3", folderId: "rookie-2", title: "Building Value", content: "Show customers why they need what you're offering.", contentType: "text", duration: "18 min", orderIndex: 3 },
      { id: "r2-l4", folderId: "rookie-2", title: "Practice Session", content: "Practice your pitch with these exercises.", contentType: "text", duration: "25 min", orderIndex: 4 },
    ],
  },
  {
    id: "rookie-3",
    title: "Objection Handling",
    description: "Turn pushback into opportunity",
    roleVisibility: "both",
    orderIndex: 3,
    lessons: [
      { id: "r3-l1", folderId: "rookie-3", title: "Why Objections Are Good", content: "Objections mean engagement. Learn to see them as opportunities.", contentType: "text", duration: "12 min", orderIndex: 1 },
      { id: "r3-l2", folderId: "rookie-3", title: "Common Objections", content: "The top 10 objections you'll hear and how to handle each one.", contentType: "text", duration: "22 min", orderIndex: 2 },
      { id: "r3-l3", folderId: "rookie-3", title: "The Feel-Felt-Found Method", content: "A proven framework for addressing concerns.", contentType: "text", duration: "15 min", orderIndex: 3 },
      { id: "r3-l4", folderId: "rookie-3", title: "Price Objections", content: "When they say it's too expensive, here's what to do.", contentType: "text", duration: "18 min", orderIndex: 4 },
      { id: "r3-l5", folderId: "rookie-3", title: "Timing Objections", content: "Handling 'not right now' and 'let me think about it'.", contentType: "text", duration: "15 min", orderIndex: 5 },
    ],
  },
  {
    id: "rookie-4",
    title: "Closing",
    description: "Seal the deal with confidence",
    roleVisibility: "both",
    orderIndex: 4,
    lessons: [
      { id: "r4-l1", folderId: "rookie-4", title: "When to Close", content: "Recognize buying signals and know when to ask for the sale.", contentType: "text", duration: "14 min", orderIndex: 1 },
      { id: "r4-l2", folderId: "rookie-4", title: "Closing Techniques", content: "Five closing techniques every rep should master.", contentType: "text", duration: "20 min", orderIndex: 2 },
      { id: "r4-l3", folderId: "rookie-4", title: "The Assumptive Close", content: "Act as if the sale is already made.", contentType: "text", duration: "12 min", orderIndex: 3 },
      { id: "r4-l4", folderId: "rookie-4", title: "Paperwork & Next Steps", content: "Make the transaction smooth and professional.", contentType: "text", duration: "15 min", orderIndex: 4 },
    ],
  },
];

// Training Folders - Vet Only Content
export const vetFolders: TrainingFolder[] = [
  {
    id: "vet-1",
    title: "Advanced Techniques",
    description: "Level up your sales game with advanced strategies",
    roleVisibility: "vet",
    orderIndex: 5,
    lessons: [
      { id: "v1-l1", folderId: "vet-1", title: "Reading Body Language", content: "Advanced techniques for understanding non-verbal cues.", contentType: "text", duration: "20 min", orderIndex: 1 },
      { id: "v1-l2", folderId: "vet-1", title: "Mirroring & Rapport", content: "Build deep connection quickly using psychological techniques.", contentType: "text", duration: "18 min", orderIndex: 2 },
      { id: "v1-l3", folderId: "vet-1", title: "High-Ticket Selling", content: "Strategies for closing larger deals.", contentType: "text", duration: "25 min", orderIndex: 3 },
      { id: "v1-l4", folderId: "vet-1", title: "Referral Systems", content: "Turn every sale into multiple sales.", contentType: "text", duration: "22 min", orderIndex: 4 },
    ],
  },
  {
    id: "vet-2",
    title: "Team Leadership",
    description: "Lead and develop your team to peak performance",
    roleVisibility: "vet",
    orderIndex: 6,
    lessons: [
      { id: "v2-l1", folderId: "vet-2", title: "Leadership Fundamentals", content: "What makes an effective sales leader.", contentType: "text", duration: "20 min", orderIndex: 1 },
      { id: "v2-l2", folderId: "vet-2", title: "Coaching Reps", content: "How to train and develop new reps.", contentType: "text", duration: "25 min", orderIndex: 2 },
      { id: "v2-l3", folderId: "vet-2", title: "Running Effective Meetings", content: "Make your team meetings productive.", contentType: "text", duration: "15 min", orderIndex: 3 },
      { id: "v2-l4", folderId: "vet-2", title: "Performance Management", content: "Track metrics and drive accountability.", contentType: "text", duration: "22 min", orderIndex: 4 },
    ],
  },
  {
    id: "vet-3",
    title: "Territory Management",
    description: "Maximize results across your territory",
    roleVisibility: "vet",
    orderIndex: 7,
    lessons: [
      { id: "v3-l1", folderId: "vet-3", title: "Mapping Your Territory", content: "Strategic approaches to territory coverage.", contentType: "text", duration: "18 min", orderIndex: 1 },
      { id: "v3-l2", folderId: "vet-3", title: "Route Optimization", content: "Maximize doors knocked per day.", contentType: "text", duration: "15 min", orderIndex: 2 },
      { id: "v3-l3", folderId: "vet-3", title: "Time Management", content: "Structure your day for peak performance.", contentType: "text", duration: "20 min", orderIndex: 3 },
    ],
  },
];

// Combined folders for easy access
export const allFolders: TrainingFolder[] = [...rookieFolders, ...vetFolders];

// Mock Users (Reps)
export const mockUsers: User[] = [
  {
    id: "user-1",
    name: "Alex Johnson",
    email: "alex@summit.com",
    role: "rookie",
    lastActive: "2 hours ago",
    progress: [
      { lessonId: "r1-l1", status: "completed", completedAt: "2024-01-10" },
      { lessonId: "r1-l2", status: "completed", completedAt: "2024-01-11" },
      { lessonId: "r1-l3", status: "completed", completedAt: "2024-01-12" },
      { lessonId: "r1-l4", status: "in_progress", lastViewedAt: "2024-01-13" },
    ],
  },
  {
    id: "user-2",
    name: "Sarah Chen",
    email: "sarah@summit.com",
    role: "vet",
    lastActive: "1 day ago",
    progress: [
      { lessonId: "r1-l1", status: "completed", completedAt: "2024-01-05" },
      { lessonId: "r1-l2", status: "completed", completedAt: "2024-01-05" },
      { lessonId: "r1-l3", status: "completed", completedAt: "2024-01-06" },
      { lessonId: "r1-l4", status: "completed", completedAt: "2024-01-06" },
      { lessonId: "r1-l5", status: "completed", completedAt: "2024-01-07" },
      { lessonId: "r2-l1", status: "completed", completedAt: "2024-01-08" },
      { lessonId: "r2-l2", status: "completed", completedAt: "2024-01-08" },
      { lessonId: "r2-l3", status: "completed", completedAt: "2024-01-09" },
      { lessonId: "r2-l4", status: "completed", completedAt: "2024-01-09" },
      { lessonId: "r3-l1", status: "completed", completedAt: "2024-01-10" },
      { lessonId: "r3-l2", status: "in_progress", lastViewedAt: "2024-01-11" },
    ],
  },
  {
    id: "user-3",
    name: "Mike Davis",
    email: "mike@summit.com",
    role: "rookie",
    lastActive: "5 days ago",
    progress: [
      { lessonId: "r1-l1", status: "completed", completedAt: "2024-01-05" },
      { lessonId: "r1-l2", status: "in_progress", lastViewedAt: "2024-01-08" },
    ],
  },
  {
    id: "user-4",
    name: "Emily Rodriguez",
    email: "emily@summit.com",
    role: "vet",
    lastActive: "3 hours ago",
    progress: [
      { lessonId: "r1-l1", status: "completed" },
      { lessonId: "r1-l2", status: "completed" },
      { lessonId: "r1-l3", status: "completed" },
      { lessonId: "r1-l4", status: "completed" },
      { lessonId: "r1-l5", status: "completed" },
      { lessonId: "r2-l1", status: "completed" },
      { lessonId: "r2-l2", status: "completed" },
      { lessonId: "r2-l3", status: "completed" },
      { lessonId: "r2-l4", status: "completed" },
      { lessonId: "r3-l1", status: "completed" },
      { lessonId: "r3-l2", status: "completed" },
      { lessonId: "r3-l3", status: "completed" },
      { lessonId: "r3-l4", status: "completed" },
      { lessonId: "r3-l5", status: "completed" },
      { lessonId: "r4-l1", status: "completed" },
      { lessonId: "r4-l2", status: "completed" },
      { lessonId: "r4-l3", status: "in_progress" },
    ],
  },
  {
    id: "user-5",
    name: "James Wilson",
    email: "james@summit.com",
    role: "rookie",
    lastActive: "4 days ago",
    progress: [
      { lessonId: "r1-l1", status: "completed", completedAt: "2024-01-06" },
      { lessonId: "r1-l2", status: "completed", completedAt: "2024-01-07" },
      { lessonId: "r1-l3", status: "completed", completedAt: "2024-01-08" },
    ],
  },
  {
    id: "user-6",
    name: "Jessica Martinez",
    email: "jessica@summit.com",
    role: "rookie",
    lastActive: "1 hour ago",
    progress: [
      { lessonId: "r1-l1", status: "completed" },
      { lessonId: "r1-l2", status: "completed" },
      { lessonId: "r1-l3", status: "completed" },
      { lessonId: "r1-l4", status: "completed" },
      { lessonId: "r1-l5", status: "completed" },
      { lessonId: "r2-l1", status: "completed" },
      { lessonId: "r2-l2", status: "in_progress" },
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
