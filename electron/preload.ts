import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getSystemInfo: () => ipcRenderer.invoke('system-info'),
  getTasks: () => ipcRenderer.invoke('tasks:get-all'),
  getSmartTasks: (view: string) => ipcRenderer.invoke('tasks:get-smart', view),
  getTasksByMonth: (year: number, month: number) => ipcRenderer.invoke('tasks:get-by-month', year, month),
  createTask: (task: unknown) => ipcRenderer.invoke('tasks:create', task),
  updateTask: (task: unknown) => ipcRenderer.invoke('tasks:update', task),
  deleteTask: (id: number) => ipcRenderer.invoke('tasks:delete', id),
  updateTaskOrder: (updates: unknown) => ipcRenderer.invoke('tasks:update-order', updates),
  autoRecurTask: (id: number) => ipcRenderer.invoke('tasks:auto-recur', id),
  exportData: () => ipcRenderer.invoke('tasks:export'),
  importData: (data: unknown) => ipcRenderer.invoke('tasks:import', data),
  getCategories: () => ipcRenderer.invoke('categories:get-all'),
  createCategory: (category: unknown) =>
    ipcRenderer.invoke('categories:create', category),
  updateCategory: (category: unknown) =>
    ipcRenderer.invoke('categories:update', category),
  deleteCategory: (id: number) => ipcRenderer.invoke('categories:delete', id),
  getThemePrefs: () => ipcRenderer.invoke('theme:get-prefs'),
  updateThemePrefs: (prefs: unknown) =>
    ipcRenderer.invoke('theme:update-prefs', prefs),
  onQuickCapture: (callback: () => void) => {
    ipcRenderer.on('quick-capture', callback);
    return () => ipcRenderer.removeListener('quick-capture', callback);
  },
  sendNotification: (data: { title: string; body: string }) =>
    ipcRenderer.invoke('notifications:send', data),
  getTemplates: () => ipcRenderer.invoke('templates:get-all'),
  getTemplate: (id: number) => ipcRenderer.invoke('templates:get', id),
  createTemplate: (input: unknown) => ipcRenderer.invoke('templates:create', input),
  updateTemplate: (input: unknown) => ipcRenderer.invoke('templates:update', input),
  deleteTemplate: (id: number) => ipcRenderer.invoke('templates:delete', id),
  applyTemplate: (input: unknown) => ipcRenderer.invoke('templates:apply', input),
  getStats: () => ipcRenderer.invoke('stats:get'),
  addXp: (action: string) => ipcRenderer.invoke('stats:add-xp', action),
});
