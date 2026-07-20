import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import {
  Category,
  CreateCategoryInput,
  Density,
  getTitleForLevel,
  NewTask,
  SmartView,
  Status,
  Task,
  ThemeMode,
  UpdateCategoryInput,
} from '../../types/task';
import TaskList from './components/TaskList';
import TaskModal from './components/TaskModal';
import CategoryManager from './components/CategoryManager';
import KanbanBoard from './components/KanbanBoard';
import CalendarView from './components/CalendarView';
import TimelineView from './components/TimelineView';
import GanttView from './components/GanttView';
import FocusTimer from './components/FocusTimer';
import XpBar from './components/XpBar';
import ThemeSettings from './components/ThemeSettings';
import BackgroundEffect from './components/BackgroundEffect';

type FilterStatus = 'all' | 'todo' | 'in-progress' | 'done';
type CategoryFilter = 'all' | number;

function isErrorResult(value: unknown): value is { error: string } {
  return typeof value === 'object' && value !== null && 'error' in value;
}

function isOverdue(task: Task): boolean {
  if (task.status === 'done' || !task.due_date) return false;
  const due = new Date(task.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '99, 102, 241';
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const taskDate = new Date(date);
  taskDate.setHours(0, 0, 0, 0);
  const diffDays = Math.round((taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
  return date.toLocaleDateString();
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [modalPreFill, setModalPreFill] = useState<{ due_date?: string } | null>(null);
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
  const [quickCaptureTitle, setQuickCaptureTitle] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [smartView, setSmartView] = useState<SmartView>('all');
  const [filteredSmartTasks, setFilteredSmartTasks] = useState<Task[] | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [search, setSearch] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'high-priority' | 'favorites'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'calendar' | 'timeline' | 'gantt'>('list');
  const [focusTask, setFocusTask] = useState<{ id: number; title: string } | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [xpRefreshKey, setXpRefreshKey] = useState(0);
  const [xpToast, setXpToast] = useState<{ text: string; variant: 'normal' | 'bonus' | 'streak' } | null>(null);
  const [levelUp, setLevelUp] = useState<{ level: number; title: string; unlocks: string[] } | null>(null);
  const [themeSettingsOpen, setThemeSettingsOpen] = useState(false);
  const [playerLevel, setPlayerLevel] = useState(1);
  const [themePrefs, setThemePrefs] = useState<{ mode: 'light' | 'dark'; accent_color: string; density: string; background: string; unlocked_themes: string[] } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const loadTasks = useCallback(async () => {
    const result = await window.electronAPI.getTasks();
    if (Array.isArray(result)) {
      setTasks(result as Task[]);
      return;
    }
    if (isErrorResult(result)) {
      console.error(result.error);
      return;
    }
  }, []);

  const loadCategories = useCallback(async () => {
    const result = await window.electronAPI.getCategories();
    if (Array.isArray(result)) {
      setCategories(result as Category[]);
      return;
    }
    if (isErrorResult(result)) {
      console.error(result.error);
      return;
    }
  }, []);

  const loadThemePrefs = useCallback(async () => {
    const result = await window.electronAPI.getStats();
    if (result && typeof result === 'object' && !('error' in result)) {
      const r = result as { stats: { level: number }; unlocks: string[]; player_title: string | null; status_emoji: string };
      setPlayerLevel(r.stats.level);
      // Also get raw theme prefs
      const prefsResult = await window.electronAPI.getThemePrefs();
      if (prefsResult && typeof prefsResult === 'object' && !('error' in prefsResult)) {
        const p = prefsResult as { mode: string; accent_color: string; density: string; background: string };
        setThemePrefs({
          mode: p.mode as 'light' | 'dark',
          accent_color: p.accent_color,
          density: p.density,
          background: p.background || 'default',
          unlocked_themes: r.unlocks,
        });
      }
    }
  }, []);

  useEffect(() => {
    Promise.all([loadTasks(), loadCategories()]).then(() => setLoading(false));
  }, [loadTasks, loadCategories]);

  useEffect(() => { loadThemePrefs(); }, [loadThemePrefs]);

  useEffect(() => {
    const cleanup = window.electronAPI.onQuickCapture(() => {
      setQuickCaptureTitle('');
      setQuickCaptureOpen(true);
    });
    return cleanup;
  }, []);

  // Keyboard shortcut: Escape to close quick capture
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && quickCaptureOpen) {
        setQuickCaptureOpen(false);
        setQuickCaptureTitle('');
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quickCaptureOpen]);

  // Global keyboard shortcuts
  useEffect(() => {
    function handleGlobalKey(e: KeyboardEvent) {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
      if (isInput) return;

      // When modals are open, handle Escape to close, ? for help
      if (modalOpen || categoryManagerOpen) {
        if (e.key === 'Escape') {
          setCategoryManagerOpen(false);
          setModalOpen(false);
        } else if (e.key === '?') {
          setShowShortcuts(prev => !prev);
        }
        return;
      }

      switch (e.key) {
        case 'n':
        case 'N':
          e.preventDefault();
          setEditingTask(null);
          setModalPreFill(null);
          setModalOpen(true);
          break;
        case '1':
          setViewMode('list');
          break;
        case '2':
          setViewMode('kanban');
          break;
        case '3':
          setViewMode('calendar');
          break;
        case '4':
          setViewMode('timeline');
          break;
        case '5':
          setViewMode('gantt');
          break;
        case '/':
          e.preventDefault();
          searchInputRef.current?.focus();
          break;
        case '?':
          setShowShortcuts(prev => !prev);
          break;
      }
    }

    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [modalOpen, categoryManagerOpen]);

  function showXpResult(result: { xp_gained: number; leveled_up: boolean; new_level: number; unlocks: string[]; variable_bonus: boolean; streak: number }) {
    // Show XP toast
    if (result.variable_bonus) {
      setXpToast({ text: `+${result.xp_gained} XP 🔥`, variant: 'bonus' });
    } else if (result.streak >= 3) {
      setXpToast({ text: `+${result.xp_gained} XP (×${Math.min(1 + (result.streak - 1) * 0.5, 3).toFixed(1)} streak)`, variant: 'streak' });
    } else {
      setXpToast({ text: `+${result.xp_gained} XP`, variant: 'normal' });
    }

    setTimeout(() => setXpToast(null), 2200);

    // Level-up celebration
    if (result.leveled_up) {
      setLevelUp({
        level: result.new_level,
        title: getTitleForLevel(result.new_level),
        unlocks: result.unlocks,
      });
    }

    setXpRefreshKey(k => k + 1);
  }

  async function handleCreateCategory(data: CreateCategoryInput) {
    const result = await window.electronAPI.createCategory(data);
    if (!isErrorResult(result)) await loadCategories();
  }

  async function handleUpdateCategory(data: UpdateCategoryInput) {
    const result = await window.electronAPI.updateCategory(data);
    if (!isErrorResult(result)) await loadCategories();
  }

  async function handleDeleteCategory(id: number) {
    const result = await window.electronAPI.deleteCategory(id);
    if (!isErrorResult(result)) await loadCategories();
  }

  async function handleSave(data: NewTask) {
    if (editingTask) {
      await window.electronAPI.updateTask({ id: editingTask.id, ...data });
    } else {
      await window.electronAPI.createTask(data);
      // XP for adding a task
      const xpResult = await window.electronAPI.addXp('add_task');
      if (xpResult && typeof xpResult === 'object' && 'xp_gained' in xpResult) {
        showXpResult(xpResult as { xp_gained: number; leveled_up: boolean; new_level: number; unlocks: string[]; variable_bonus: boolean; streak: number });
      }
    }
    await Promise.all([loadTasks(), loadCategories()]);
    setModalOpen(false);
    setEditingTask(null);
  }

  async function handleDelete(id: number) {
    if (window.confirm('Delete this task?')) {
      await window.electronAPI.deleteTask(id);
      await loadTasks();
    }
  }

  async function handleToggle(task: Task) {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    await window.electronAPI.updateTask({
      id: task.id,
      status: newStatus,
    });
    // Auto-generate next recurring task if completing a recurring task
    if (newStatus === 'done' && task.recurrence) {
      await window.electronAPI.autoRecurTask(task.id);
    }
    // XP for completing a task
    if (newStatus === 'done') {
      const action = task.due_date && new Date(task.due_date) < new Date(new Date().toDateString()) ? 'catch_up' : 'complete_task';
      const xpResult = await window.electronAPI.addXp(action);
      if (xpResult && typeof xpResult === 'object' && 'xp_gained' in xpResult) {
        showXpResult(xpResult as { xp_gained: number; leveled_up: boolean; new_level: number; unlocks: string[]; variable_bonus: boolean; streak: number });
      }
    }
    await loadTasks();
  }

  async function handleToggleFavorite(task: Task) {
    const currentState = task.is_favorite || 0;
    const newState = currentState === 1 ? 0 : 1;
    await window.electronAPI.updateTask({
      id: task.id,
      is_favorite: newState,
    });
    await loadTasks();
  }

  async function handleQuickCaptureSave() {
    const title = quickCaptureTitle.trim();
    if (!title) return;
    await window.electronAPI.createTask({ title });
    setQuickCaptureOpen(false);
    setQuickCaptureTitle('');
    await loadTasks();
  }

  async function handleExport() {
    const data = await window.electronAPI.exportData();
    if (data && typeof data === 'object' && 'error' in data) {
      console.error(data.error);
      return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `todoapp-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const result = await window.electronAPI.importData(data);
        if (result && typeof result === 'object' && 'error' in result) {
          alert('Import failed: ' + (result as { error: string }).error);
          return;
        }
        await Promise.all([loadTasks(), loadCategories()]);
      } catch {
        alert('Invalid backup file.');
      }
    };
    input.click();
  }

  async function handleReorder(updates: { id: number; status: Status; sort_order: number }[]) {
    // Optimistically update local state so the kanban board responds instantly
    setTasks(prev => prev.map(t => {
      const update = updates.find(u => u.id === t.id);
      return update ? { ...t, status: update.status, sort_order: update.sort_order } : t;
    }));
    await window.electronAPI.updateTaskOrder(updates);
    await loadTasks();
  }

  async function handleThemeSave(prefs: { mode: string; accent_color: string; density: string; background?: string }) {
    // Map density-pro → compact for backend storage; keep 'pro' in local state for CSS
    const backendDensity = prefs.density === 'density-pro' ? 'compact' : prefs.density;
    const uiDensity = prefs.density;
    const result = await window.electronAPI.updateThemePrefs({ mode: prefs.mode, accent_color: prefs.accent_color, density: backendDensity, background: prefs.background || 'default' });
    if (result && typeof result === 'object' && 'error' in result) {
      console.error('Theme save failed:', (result as { error: string }).error);
      return;
    }
    setThemePrefs(prev => prev ? { ...prev, mode: prefs.mode as 'light' | 'dark', accent_color: prefs.accent_color, density: uiDensity, background: prefs.background || prev.background } : null);
    setThemeSettingsOpen(false);
  }

  async function handleAddDate(date: string) {
    setEditingTask(null);
    // Pre-fill the modal with the selected date
    setModalPreFill({ due_date: date });
    setModalOpen(true);
  }

  const filteredTasks = useMemo(() => {
    // When smart view is active, use the server-filtered results
    const source = smartView !== 'all' && filteredSmartTasks ? filteredSmartTasks : tasks;
    const normalizedSearch = search.trim().toLowerCase();
    return source.filter((task) => {
      const matchesStatus = smartView !== 'all' || filter === 'all' || task.status === filter;
      const matchesCategory = categoryFilter === 'all' || task.category_id === categoryFilter;
      if (!normalizedSearch) return matchesStatus && matchesCategory;
      const title = task.title.toLowerCase();
      return matchesStatus && matchesCategory && title.includes(normalizedSearch);
    });
  }, [categoryFilter, filter, search, tasks, smartView, filteredSmartTasks]);

  const displayedTasks = useMemo(() => {
    let base = filteredTasks;
    switch (activeFilter) {
      case 'high-priority':
        return base.filter(t => t.priority === 'high');
      case 'favorites':
        return base.filter(t => t.is_favorite === 1);
      default:
        return base;
    }
  }, [filteredTasks, activeFilter]);

  const stats = useMemo(() => ({
    done: tasks.filter((task) => task.status === 'done').length,
    high: tasks.filter((task) => task.priority === 'high' && task.status !== 'done').length,
    categorized: tasks.filter((task) => task.category_id !== null).length,
  }), [tasks]);

  const filterLabel: Record<FilterStatus, string> = {
    all: 'All Tasks',
    todo: 'To Do',
    'in-progress': 'In Progress',
    done: 'Completed',
  };

  const currentCategoryLabel =
    categoryFilter === 'all'
      ? 'All Categories'
      : categories.find((category) => category.id === categoryFilter)?.name ??
      'Category';

  return (
    <>
      <BackgroundEffect />
      <div
        data-theme-mode={themePrefs?.mode || 'dark'}
        data-ui-density={themePrefs?.density === 'density-pro' ? 'pro' : themePrefs?.density || 'comfortable'}
        data-ui-background={themePrefs?.background || 'default'}
        style={{
          '--accent-color': themePrefs?.accent_color || '#6366f1',
          '--accent-rgb': hexToRgb(themePrefs?.accent_color || '#6366f1'),
        } as React.CSSProperties}
        className="w-screen h-screen flex text-white font-sans overflow-hidden relative z-10"
      >
      {/* LEFT SIDEBAR - Dark Glass */}
      <aside className="w-60 h-full glass-panel-dark flex flex-col p-4 gap-3 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl shadow-[0_0_20px_rgba(0,163,255,0.8)] flex items-center justify-center border border-white/40">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
              <path d="M20 6L9 17L4 12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-white text-2xl font-bold tracking-tight flex-1">ToDoApp</span>
          <button
            onClick={() => setThemeSettingsOpen(true)}
            className="p-2 rounded-xl hover:bg-white/10 transition-all text-white/40 hover:text-white/80"
            title="Theme Settings"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>

        <div className="space-y-2">
          <h3 className="text-white/40 text-xs font-black uppercase tracking-widest pl-2">Smart Views</h3>
          <nav className="space-y-1">
            {[
              { id: 'all' as SmartView, label: 'All Tasks', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
              { id: 'today' as SmartView, label: 'Today', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
              { id: 'this-week' as SmartView, label: 'This Week', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
              { id: 'overdue' as SmartView, label: 'Overdue', icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
              { id: 'no-date' as SmartView, label: 'No Due Date', icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setSmartView(item.id);
                  if (item.id === 'all') {
                    setFilteredSmartTasks(null);
                  } else {
                    window.electronAPI.getSmartTasks(item.id).then((result) => {
                      if (Array.isArray(result)) {
                        setFilteredSmartTasks(result as Task[]);
                      }
                    });
                  }
                }}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all duration-300 ${
                  smartView === item.id ? 'aero-selected' : 'text-white/60 hover:bg-white/5'
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                  <path d={item.icon} />
                </svg>
                <span className="font-semibold">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="space-y-2">
          <h3 className="text-white/40 text-xs font-black uppercase tracking-widest pl-2">Status</h3>
          <nav className="space-y-1">
            {[
              { id: 'all', label: 'All Tasks', count: tasks.length },
              { id: 'todo', label: 'To Do', count: tasks.filter(t => t.status === 'todo').length },
              { id: 'in-progress', label: 'In Progress', count: tasks.filter(t => t.status === 'in-progress').length },
              { id: 'done', label: 'Completed', count: tasks.filter(t => t.status === 'done').length },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setFilter(item.id as FilterStatus)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all duration-300 ${
                  filter === item.id ? 'aero-selected' : 'text-white/60 hover:bg-white/5'
                }`}
              >
                <span className="font-semibold">{item.label}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${filter === item.id ? 'bg-blue-600/50 text-blue-100 border border-blue-400/30' : 'bg-white/10'}`}>
                  {item.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-white/40 text-xs font-black uppercase tracking-widest">Categories</h3>
            <div className="flex gap-3">
              <button onClick={() => setCategoryManagerOpen(true)} className="text-cyan-400 text-xs font-bold hover:underline">Manage</button>
            </div>
          </div>
          <div className="space-y-1">
            <button 
              onClick={() => setCategoryFilter('all')}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all ${categoryFilter === 'all' ? 'aero-selected' : 'text-white/60 hover:bg-white/5'}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-white/40"></div>
                <span className="font-semibold">All Categories</span>
              </div>
              <span className="text-xs font-bold opacity-60">{tasks.length}</span>
            </button>
            {categories.map(cat => (
              <button 
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all ${categoryFilter === cat.id ? 'aero-selected' : 'text-white/60 hover:bg-white/5'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{backgroundColor: cat.color}}></div>
                  <span className="font-semibold truncate max-w-[120px]">{cat.name}</span>
                </div>
                <span className="text-xs font-bold opacity-60">{cat.task_count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto space-y-3">
           <XpBar refreshKey={xpRefreshKey} />
        </div>
      </aside>

      {/* RIGHT MAIN CONTENT - Light Glass */}
      <main className="flex-1 h-full glass-panel m-2 rounded-[1.5rem] flex flex-col overflow-hidden">
        <header className="p-4 flex justify-between items-start border-b border-white/10 gap-3">
          <div className="min-w-0">
            <h2 className="text-3xl font-black text-gray-800 tracking-tighter mb-1 drop-shadow-md truncate">
              {smartView !== 'all'
                ? smartView === 'today' ? 'Today' : smartView === 'this-week' ? 'This Week' : smartView === 'overdue' ? 'Overdue' : smartView === 'no-date' ? 'No Due Date' : 'All Tasks'
                : filter === 'all' ? 'All Tasks' : filterLabel[filter]}
            </h2>
              <p className="text-gray-600 font-bold uppercase tracking-widest text-xs">
                {currentCategoryLabel} • {displayedTasks.length} tasks
              </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
             <div className="relative group">
                <input 
                  ref={searchInputRef}
                  type="text" 
                  placeholder="Search tasks..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-44 bg-white/60 backdrop-blur-md border border-white/50 rounded-full px-4 py-2.5 pl-10 outline-none focus:bg-white/80 focus:ring-4 focus:ring-blue-500/20 focus:w-56 transition-all duration-[var(--transition-normal)] font-medium placeholder:text-gray-500 shadow-inner text-sm"
                />
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
             </div>
             <div className="relative">
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="bg-white/70 backdrop-blur-md border border-white/50 px-4 py-2.5 rounded-full font-bold text-gray-700 hover:bg-white/90 transition-all flex items-center gap-1.5 shadow-sm text-sm"
                >
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
                   {activeFilter === 'all' ? 'Filters' : activeFilter === 'high-priority' ? 'High Priority' : 'Favorites'}
                </button>
                {isFilterOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-200 p-2 z-50">
                    <button
                      className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition ${activeFilter === 'all' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100 text-gray-700'}`}
                      onClick={() => { setActiveFilter('all'); setIsFilterOpen(false); }}
                    >
                      All Tasks
                    </button>
                    <button
                      className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition ${activeFilter === 'high-priority' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100 text-gray-700'}`}
                      onClick={() => { setActiveFilter('high-priority'); setIsFilterOpen(false); }}
                    >
                      High Priority
                    </button>
                    <button
                      className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition ${activeFilter === 'favorites' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100 text-gray-700'}`}
                      onClick={() => { setActiveFilter('favorites'); setIsFilterOpen(false); }}
                    >
                      Favorites
                    </button>
                  </div>
                )}
             </div>
             <button
                onClick={handleExport}
                className="bg-white/70 backdrop-blur-md border border-white/50 p-2.5 rounded-full text-gray-600 hover:bg-white/90 transition-all shadow-sm"
                title="Export backup"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </button>
              <button
                onClick={handleImport}
                className="bg-white/70 backdrop-blur-md border border-white/50 p-2.5 rounded-full text-gray-600 hover:bg-white/90 transition-all shadow-sm"
                title="Import backup"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </button>
              <div className="flex gap-1 bg-white/40 backdrop-blur-sm rounded-full p-1 border border-white/40 shadow-sm">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-full transition-all ${
                    viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="List view"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`p-2.5 rounded-full transition-all ${
                    viewMode === 'kanban' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Kanban board"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`p-2.5 rounded-full transition-all ${
                    viewMode === 'calendar' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Calendar view"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('timeline')}
                  className={`p-2.5 rounded-full transition-all ${
                    viewMode === 'timeline' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Timeline view"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('gantt')}
                  className={`p-2.5 rounded-full transition-all ${
                    viewMode === 'gantt' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Gantt chart"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
                  </svg>
                </button>
              </div>
              <FocusTimer
                focusTask={focusTask}
                onFocusComplete={() => setFocusTask(null)}
              />
              <button 
                onClick={() => { setEditingTask(null); setModalOpen(true); }}
                className="aero-btn px-5 py-2.5 rounded-full font-bold text-white flex items-center gap-1.5 transition text-sm"
             >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><path d="M12 5v14M5 12h14"/></svg>
                New Task
             </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[1,2,3].map(i => <div key={i} className="h-24 bg-white/20 rounded-[2rem]"></div>)}
            </div>
          ) : viewMode === 'kanban' ? (
            <KanbanBoard
              tasks={displayedTasks}
              categories={categories}
              onEdit={(task) => { setEditingTask(task); setModalOpen(true); }}
              onDelete={handleDelete}
              onToggle={handleToggle}
              onToggleFavorite={handleToggleFavorite}
              onReorder={handleReorder}
            />
          ) : viewMode === 'calendar' ? (
            <CalendarView
              tasks={tasks}
              categories={categories}
              onEdit={(task) => { setEditingTask(task); setModalOpen(true); }}
              onDelete={handleDelete}
              onToggle={handleToggle}
              onToggleFavorite={handleToggleFavorite}
              onAddDate={handleAddDate}
            />
          ) : viewMode === 'timeline' ? (
            <TimelineView
              tasks={tasks}
              onEdit={(task) => { setEditingTask(task); setModalOpen(true); }}
              onDelete={handleDelete}
              onToggle={handleToggle}
              onToggleFavorite={handleToggleFavorite}
            />
          ) : viewMode === 'gantt' ? (
            <GanttView
              tasks={tasks}
              onEdit={(task) => { setEditingTask(task); setModalOpen(true); }}
              onDelete={handleDelete}
              onToggle={handleToggle}
            />
          ) : (
            displayedTasks.map(task => (
              <div 
                key={task.id} 
                className={`group relative p-4 rounded-[1.5rem] border flex items-center gap-4 transition-all duration-300 hover:scale-[1.01] hover:shadow-xl ${
                  isOverdue(task)
                  ? 'bg-red-100/60 border-red-400/50 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                  : task.status === 'done' 
                  ? 'bg-emerald-100/40 border-emerald-500/20' 
                  : 'bg-white/40 backdrop-blur-md border-white/40'
                }`}
              >
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleToggle(task);
                  }}
                  className={`w-8 h-8 rounded-full border-3 flex items-center justify-center transition-all ${
                    task.status === 'done' 
                    ? 'bg-emerald-500 border-emerald-600 shadow-[0_0_12px_rgba(16,185,129,0.4)]' 
                    : 'border-white bg-white/20 hover:bg-white/40'
                  }`}
                >
                  {task.status === 'done' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><path d="M20 6L9 17L4 12"/></svg>}
                </button>
                
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleToggleFavorite(task);
                  }}
                  className="hover:scale-110 transition-transform flex-shrink-0"
                  aria-label={task.is_favorite === 1 ? 'Remove from favorites' : 'Add to favorites'}
                >
                  {task.is_favorite === 1 ? (
                    <svg className="w-6 h-6 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-white/50 hover:text-white/80" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.907c.961 0 1.36 1.254.588 1.81l-3.97 2.883a1 1 0 00-.364 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.971-2.883a1 1 0 00-1.175 0l-3.97 2.883c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.364-1.118l-3.97-2.883c-.772-.556-.373-1.81.588-1.81h4.906a1 1 0 00.95-.69l1.519-4.674z"/>
                    </svg>
                  )}
                </button>
                
                <div className="flex-1">
                  <h4 className={`text-lg font-bold tracking-tight mb-1 ${task.status === 'done' ? 'text-gray-500 line-through opacity-60' : 'text-gray-800'}`}>
                    {task.title}
                  </h4>
                  <div className="flex gap-2">
                     <span className="px-3 py-1 bg-amber-400/20 border border-amber-500/20 rounded-full text-[10px] font-black uppercase text-amber-700 tracking-wider">
                        • {task.priority}
                     </span>
                     <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        task.status === 'done' 
                        ? 'bg-emerald-500/20 border-emerald-500/20 text-emerald-700' 
                        : 'bg-blue-500/20 border-blue-500/20 text-blue-700'
                     }`}>
                        {task.status}
                     </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-gray-500">
                  <div className="flex flex-col items-end gap-1">
                    {task.due_date && (
                      <span className={`text-xs font-bold uppercase whitespace-nowrap ${
                        isOverdue(task) ? 'text-red-500 opacity-100' : 'opacity-40'
                      }`}>
                        {isOverdue(task) && (
                          <svg className="w-3 h-3 inline mr-1 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="12" r="10" />
                          </svg>
                        )}{formatDate(task.due_date)}
                      </span>
                    )}
                    <span className="text-xs font-bold uppercase opacity-40 whitespace-nowrap">{formatDate(task.created_at)}</span>
                  </div>
                  
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingTask(task); setModalOpen(true); }} className="p-2 bg-white/40 hover:bg-white/60 rounded-xl border border-white transition-all"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7m-8-3 9.2-9.2a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg></button>
                    <button onClick={() => setFocusTask({ id: task.id, title: task.title })} className="p-2 bg-amber-500/10 hover:bg-amber-500/20 rounded-xl border border-amber-500/20 text-amber-600 transition-all"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></button>
                    <button onClick={() => handleDelete(task.id)} className="p-2 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl border border-rose-500/20 text-rose-500 transition-all"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {modalOpen && (
        <TaskModal
          task={editingTask}
          categories={categories}
          initialDate={modalPreFill?.due_date ?? null}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditingTask(null); setModalPreFill(null); }}
        />
      )}

      {categoryManagerOpen && (
        <CategoryManager
          categories={categories}
          onCreate={handleCreateCategory}
          onUpdate={handleUpdateCategory}
          onDelete={handleDeleteCategory}
          onClose={() => setCategoryManagerOpen(false)}
        />
      )}

      {themeSettingsOpen && themePrefs && (
        <ThemeSettings
          prefs={themePrefs}
          unlockedThemes={themePrefs.unlocked_themes}
          currentLevel={playerLevel}
          onSave={handleThemeSave}
          onClose={() => setThemeSettingsOpen(false)}
        />
      )}

      {quickCaptureOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
          style={{ background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)' }}
          onClick={() => { setQuickCaptureOpen(false); setQuickCaptureTitle(''); }}
        >
          <div
            className="w-full max-w-lg"
            style={{
              background: 'rgba(30, 41, 59, 0.9)',
              borderRadius: '1.5rem',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              animation: 'slideUp 0.2s both',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <input
                autoFocus
                type="text"
                placeholder="What do you need to do?"
                value={quickCaptureTitle}
                onChange={(e) => setQuickCaptureTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleQuickCaptureSave();
                  if (e.key === 'Escape') { setQuickCaptureOpen(false); setQuickCaptureTitle(''); }
                }}
                className="w-full text-xl bg-transparent border-none outline-none text-white placeholder-gray-400 font-bold tracking-tight"
              />
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                <span className="text-xs text-gray-400 font-medium">
                  Press <kbd className="px-2 py-0.5 bg-white/10 rounded text-gray-300">Enter</kbd> to save · <kbd className="px-2 py-0.5 bg-white/10 rounded text-gray-300">Esc</kbd> to cancel
                </span>
                <button
                  onClick={handleQuickCaptureSave}
                  disabled={!quickCaptureTitle.trim()}
                  className="aero-btn px-5 py-2 rounded-full text-sm font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Add Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* XP Toast */}
      {xpToast && (
        <div
          className="fixed bottom-8 right-8 z-50 pointer-events-none transition-all duration-300"
          style={{ animation: 'slideUp 0.3s both' }}
        >
          <div className={`px-5 py-3 rounded-full backdrop-blur-md border font-bold text-sm shadow-lg ${
            xpToast.variant === 'bonus'
              ? 'bg-gradient-to-r from-amber-500/90 to-orange-500/90 border-amber-400/50 text-white'
              : xpToast.variant === 'streak'
              ? 'bg-gradient-to-r from-orange-500/90 to-red-500/90 border-orange-400/50 text-white'
              : 'bg-white/90 border-white/60 text-gray-800'
          }`}>
            {xpToast.text}
          </div>
        </div>
      )}

      {/* Level-up celebration */}
      {levelUp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)' }}
          onClick={() => setLevelUp(null)}
        >
          <div
            className="text-center p-10"
            style={{ animation: 'scaleIn 0.4s both' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-[0_0_40px_rgba(251,146,60,0.5)]">
              <span className="text-3xl font-black text-white">{levelUp.level}</span>
            </div>
            <h2 className="text-3xl font-black text-white mb-2">Level Up!</h2>
            <p className="text-lg text-amber-300 font-bold mb-2">{levelUp.title}</p>
            {levelUp.unlocks.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm text-white/60 font-medium">New unlocks:</p>
                {levelUp.unlocks.map((u, i) => (
                  <div key={i} className="px-6 py-3 bg-white/10 rounded-xl border border-white/10 text-white font-semibold text-sm">
                    {u.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setLevelUp(null)}
              className="mt-8 px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-white font-bold transition-all"
            >
              Awesome!
            </button>
          </div>
        </div>
      )}

      {/* Keyboard shortcuts help */}
      {showShortcuts && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(6px)' }}
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="w-full max-w-md p-6"
            style={{
              background: 'rgba(30, 41, 59, 0.9)',
              borderRadius: '1.5rem',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              animation: 'slideUp 0.2s both',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Keyboard Shortcuts</h2>
              <button onClick={() => setShowShortcuts(false)} className="text-gray-400 hover:text-white p-1">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="space-y-3">
              {[
                { keys: 'N', desc: 'New task' },
                { keys: '1 - 5', desc: 'Switch views (List → Kanban → Calendar → Timeline → Gantt)' },
                { keys: '/', desc: 'Focus search bar' },
                { keys: '?', desc: 'Toggle this help' },
                { keys: 'Esc', desc: 'Close modals / Cancel' },
              ].map(item => (
                <div key={item.keys} className="flex items-center justify-between py-2 border-b border-white/10 last:border-0">
                  <span className="text-gray-300 text-sm">{item.desc}</span>
                  <kbd className="px-3 py-1.5 bg-white/10 rounded-lg text-sm font-bold text-cyan-300 font-mono tracking-wider">
                    {item.keys}
                  </kbd>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-500 mt-6 text-center">
              Shortcuts work when no input fields are focused
            </p>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
