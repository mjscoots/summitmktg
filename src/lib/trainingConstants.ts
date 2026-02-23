// All training video categories (used in admin forms & filters)
export const ALL_VIDEO_CATEGORIES = [
  'Introduction',
  'Switchover',
  'Fresh Account',
  'Body Language',
  'Tonality',
  'Objections',
  'Closing',
  'Advanced Training',
  'Mental Mastery',
  'Zoom Trainings',
  'Manager Training',
];

// Categories that are treated as optional bonus content
// Videos in these categories do NOT count toward completion percentages
export const BONUS_VIDEO_CATEGORIES = ['Manager Training', 'Zoom Trainings'];

// Required category tabs (shown first in filter)
export const REQUIRED_CATEGORY_TABS = [
  'All Videos',
  'Introduction',
  'Switchover',
  'Fresh Account',
  'Body Language',
  'Tonality',
  'Objections',
  'Closing',
  'Advanced Training',
  'Mental Mastery',
];

// Bonus category tabs (shown after divider)
export const BONUS_CATEGORY_TABS = [
  'Manager Training',
  'Zoom Trainings',
];

export function isBonusCategory(category: string): boolean {
  return BONUS_VIDEO_CATEGORIES.includes(category);
}
