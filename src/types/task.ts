export type Priority = 'low' | 'medium' | 'high';
export type Status = 'todo' | 'in-progress' | 'done';
export type ThemeMode = 'light' | 'dark';
export type Density = 'compact' | 'comfortable' | 'spacious';

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
  priority: Priority;
  status: Status;
  category_id: number | null;
  category_name: string | null;
  category_color: string | null;
  is_favorite: number; // SQLite stores booleans as 0 and 1
  created_at: string;
  updated_at: string;
}

export type NewTask = Omit<
  Task,
  'id' | 'created_at' | 'updated_at' | 'category_name' | 'category_color'
>;

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
