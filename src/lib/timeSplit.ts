// Honest time helpers.
// `app_minutes` is every minute in the app. `training_minutes` is lesson + video + training pages only.

export interface DailyTimeRow {
  user_id: string;
  date: string;
  app_minutes: number | null;
  training_minutes: number | null;
}

export interface UserWeekData {
  days: { minutes: number; training: number }[];
  totalMinutes: number;
  trainingMinutes: number;
}

export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function companyWeekRange(): { start: string; end: string } {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const day = now.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMon);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: fmtDate(monday), end: fmtDate(sunday) };
}

export function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function buildWeekMap(rows: DailyTimeRow[]): Map<string, UserWeekData> {
  const { start } = companyWeekRange();
  const parts = start.split('-');
  const monday = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));

  const byUser = new Map<string, DailyTimeRow[]>();
  rows.forEach(r => {
    if (!byUser.has(r.user_id)) byUser.set(r.user_id, []);
    byUser.get(r.user_id)!.push(r);
  });

  const map = new Map<string, UserWeekData>();
  byUser.forEach((userRows, userId) => {
    const days: { minutes: number; training: number }[] = [];
    let total = 0;
    let training = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const match = userRows.find(r => r.date === fmtDate(d));
      const mins = match?.app_minutes ?? 0;
      const tmins = match?.training_minutes ?? 0;
      days.push({ minutes: mins, training: tmins });
      total += mins;
      training += tmins;
    }
    map.set(userId, { days, totalMinutes: total, trainingMinutes: training });
  });

  return map;
}
