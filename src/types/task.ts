export type Priority = 'low' | 'medium' | 'high';
export type Status = 'todo' | 'in-progress' | 'done';
export type ThemeMode = 'light' | 'dark';
export type Density = 'compact' | 'comfortable' | 'spacious';
export type Recurrence = 'daily' | 'weekdays' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
export type SmartView = 'all' | 'today' | 'this-week' | 'overdue' | 'no-date';

export interface Category {
  id: number;
  name: string;
  color: string;
  task_count?: number;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  due_date: string | null;
  recurrence: Recurrence | null;
  priority: Priority;
  status: Status;
  category_id: number | null;
  category_name: string | null;
  category_color: string | null;
  is_favorite: number; // SQLite stores booleans as 0 and 1
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type NewTask = Omit<
  Task,
  'id' | 'created_at' | 'updated_at' | 'category_name' | 'category_color'
>;

export type TaskExport = {
  version: number;
  exported_at: string;
  tasks: Task[];
  categories: Category[];
  theme_prefs: UpdateThemePrefsInput | null;
};

export type UpdateTask = Partial<NewTask> & { id: number };

export interface CreateCategoryInput {
  name: string;
  color: string;
}

export interface UpdateCategoryInput {
  id: number;
  name: string;
  color: string;
}

export interface UpdateThemePrefsInput {
  mode: 'light' | 'dark';
  accent_color: string;
  density: 'compact' | 'comfortable' | 'spacious';
}
export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export const STATUS_LABELS: Record<Status, string> = {
  todo: 'To Do',
  'in-progress': 'In Progress',
  done: 'Done',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  low: 'bg-green-500/20 text-green-300',
  medium: 'bg-yellow-500/20 text-yellow-300',
  high: 'bg-red-500/20 text-red-300',
};

export const STATUS_COLORS: Record<Status, string> = {
  todo: 'bg-slate-500/20 text-slate-300',
  'in-progress': 'bg-blue-500/20 text-blue-300',
  done: 'bg-emerald-500/20 text-emerald-300',
};

export interface TemplateTaskItem {
  id: number;
  template_id: number;
  title: string;
  description: string;
  priority: Priority;
  category_id: number | null;
  sort_order: number;
}

export interface Template {
  id: number;
  name: string;
  description: string;
  task_count?: number;
  tasks?: TemplateTaskItem[];
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  tasks: Omit<TemplateTaskItem, 'id' | 'template_id'>[];
}

export interface UserStats {
  level: number;
  xp: number;
  total_tasks_added: number;
  total_tasks_completed: number;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
}

export interface XpResult {
  xp_gained: number;
  new_xp: number;
  new_level: number;
  leveled_up: boolean;
  unlocks: string[];
  streak: number;
  variable_bonus: boolean;
}

export interface ThemePrefs {
  mode: ThemeMode;
  accent_color: string;
  density: Density;
  unlocked_themes: string;
  player_title: string | null;
  status_emoji: string;
}

export const LEVEL_TITLES: Record<number, string> = {
  1: 'Apprentice',
  2: 'Apprentice',
  3: 'Task Tamer',
  4: 'Task Tamer',
  5: 'Productivity Pro',
  6: 'Productivity Pro',
  7: 'Focus Master',
  8: 'Focus Master',
  9: 'Task Legend',
  10: 'Task Legend',
};

export const LEVEL_UNLOCKS: Record<number, { id: string; label: string; desc: string }[]> = {
  1: [],
  2: [{ id: 'palette-sunset', label: 'Sunset Palette', desc: 'Warm oranges, pinks, coral' }],
  3: [{ id: 'bg-midnight', label: 'Midnight Background', desc: 'Darker sidebar + main area' }],
  5: [{ id: 'theme-ocean', label: 'Ocean Theme', desc: 'Teal/cyan accents, sea-foam backgrounds' }],
  7: [{ id: 'theme-forest', label: 'Forest Theme', desc: 'Green/emerald accents, natural tones' }],
  9: [{ id: 'theme-royal', label: 'Royal Theme', desc: 'Purple/gold accents, regal backgrounds' }],
  10: [{ id: 'density-pro', label: 'Pro Density', desc: 'Extra compact UI mode' }],
};

export function getTitleForLevel(level: number): string {
  const clamped = Math.min(Math.max(level, 1), 10);
  return LEVEL_TITLES[clamped] || 'Apprentice';
}

export function getUnlocksForLevel(level: number): string[] {
  const ids: string[] = [];
  for (const [lvl, items] of Object.entries(LEVEL_UNLOCKS)) {
    if (Number(lvl) <= level) {
      ids.push(...items.map(i => i.id));
    }
  }
  return ids;
}

export function getXpForLevel(level: number): number {
  if (level <= 1) return 0;
  return 50 * level * level + 50;
}

export function getLevelFromXp(totalXp: number): number {
  let level = 1;
  while (getXpForLevel(level + 1) <= totalXp && level < 10) level++;
  return level;
}
