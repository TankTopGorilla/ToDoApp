/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    getSystemInfo: () => Promise<{
      platform: string;
      version: string;
      uptime: number;
      cwd: string;
    }>;
    getTasks: () => Promise<unknown>;
    createTask: (task: unknown) => Promise<unknown>;
    updateTask: (task: unknown) => Promise<unknown>;
    deleteTask: (id: number) => Promise<unknown>;
    getCategories: () => Promise<unknown>;
    createCategory: (category: unknown) => Promise<unknown>;
    updateCategory: (category: unknown) => Promise<unknown>;
    deleteCategory: (id: number) => Promise<unknown>;
    getThemePrefs: () => Promise<unknown>;
    updateThemePrefs: (prefs: unknown) => Promise<unknown>;
  };
}
