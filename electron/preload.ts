import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getSystemInfo: () => ipcRenderer.invoke('system-info'),
  getTasks: () => ipcRenderer.invoke('tasks:get-all'),
  createTask: (task: unknown) => ipcRenderer.invoke('tasks:create', task),
  updateTask: (task: unknown) => ipcRenderer.invoke('tasks:update', task),
  deleteTask: (id: number) => ipcRenderer.invoke('tasks:delete', id),
  getCategories: () => ipcRenderer.invoke('categories:get-all'),
  createCategory: (category: unknown) =>
    ipcRenderer.invoke('categories:create', category),
  updateCategory: (category: unknown) =>
    ipcRenderer.invoke('categories:update', category),
  deleteCategory: (id: number) => ipcRenderer.invoke('categories:delete', id),
  getThemePrefs: () => ipcRenderer.invoke('theme:get-prefs'),
  updateThemePrefs: (prefs: unknown) =>
    ipcRenderer.invoke('theme:update-prefs', prefs),
});
