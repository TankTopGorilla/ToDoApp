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
    getSmartTasks: (view: string) => Promise<unknown>;
    getTasksByMonth: (year: number, month: number) => Promise<unknown>;
    createTask: (task: unknown) => Promise<unknown>;
    updateTask: (task: unknown) => Promise<unknown>;
    deleteTask: (id: number) => Promise<unknown>;
    updateTaskOrder: (updates: unknown) => Promise<unknown>;
    autoRecurTask: (id: number) => Promise<unknown>;
    exportData: () => Promise<unknown>;
    importData: (data: unknown) => Promise<unknown>;
    getCategories: () => Promise<unknown>;
    createCategory: (category: unknown) => Promise<unknown>;
    updateCategory: (category: unknown) => Promise<unknown>;
    deleteCategory: (id: number) => Promise<unknown>;
    getThemePrefs: () => Promise<unknown>;
    updateThemePrefs: (prefs: unknown) => Promise<unknown>;
    onQuickCapture: (callback: () => void) => () => void;
    sendNotification: (data: { title: string; body: string }) => Promise<unknown>;
    getTemplates: () => Promise<unknown>;
    getTemplate: (id: number) => Promise<unknown>;
    createTemplate: (input: unknown) => Promise<unknown>;
    updateTemplate: (input: unknown) => Promise<unknown>;
    deleteTemplate: (id: number) => Promise<unknown>;
    applyTemplate: (input: unknown) => Promise<unknown>;
    getStats: () => Promise<unknown>;
    addXp: (action: string) => Promise<unknown>;
  };
}
