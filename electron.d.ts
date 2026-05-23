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
  created_at: string;
  updated_at: string;
}

export interface SystemInfo {
  platform: string;
  version: string;
  uptime: number;
  cwd: string;
}

export interface ThemePrefs {
  mode: ThemeMode;
  accent_color: string;
  density: Density;
}

export type NewTask = Omit<
  Task,
  'id' | 'category_name' | 'category_color' | 'created_at' | 'updated_at'
>;

export type UpdateTask = Partial<NewTask> & {
  id: number;
};

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
  mode: ThemeMode;
  accent_color: string;
  density: Density;
}

declare global {
  interface Window {
    electronAPI: {
      getSystemInfo: () => Promise<SystemInfo>;
      getTasks: () => Promise<Task[] | { error: string }>;
      createTask: (task: NewTask) => Promise<Task | { error: string }>;
      updateTask: (task: UpdateTask) => Promise<Task | { error: string }>;
      deleteTask: (id: number) => Promise<{ success: boolean } | { error: string }>;
      getCategories: () => Promise<Category[] | { error: string }>;
      createCategory: (
        category: CreateCategoryInput
      ) => Promise<Category | { error: string }>;
      updateCategory: (
        category: UpdateCategoryInput
      ) => Promise<Category | { error: string }>;
      deleteCategory: (
        id: number
      ) => Promise<{ success: boolean } | { error: string }>;
      getThemePrefs: () => Promise<ThemePrefs | { error: string }>;
      updateThemePrefs: (
        prefs: UpdateThemePrefsInput
      ) => Promise<ThemePrefs | { error: string }>;
    };
  }
}
