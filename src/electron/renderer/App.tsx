import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';
import {
  Category,
  CreateCategoryInput,
  Density,
  NewTask,
  Task,
  ThemeMode,
  UpdateCategoryInput,
} from '../../types/task';
import TaskList from './components/TaskList';
import TaskModal from './components/TaskModal';
import CategoryManager from './components/CategoryManager';

type FilterStatus = 'all' | 'todo' | 'in-progress' | 'done';
type CategoryFilter = 'all' | number;

function isErrorResult(value: unknown): value is { error: string } {
  return typeof value === 'object' && value !== null && 'error' in value;
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [search, setSearch] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'high-priority' | 'favorites'>('all');

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

  useEffect(() => {
    Promise.all([loadTasks(), loadCategories()]).then(() => setLoading(false));
  }, [loadTasks, loadCategories]);

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
    await window.electronAPI.updateTask({
      id: task.id,
      status: task.status === 'done' ? 'todo' : 'done',
    });
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

  const filteredTasks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesStatus = filter === 'all' || task.status === filter;
      const matchesCategory = categoryFilter === 'all' || task.category_id === categoryFilter;
      if (!normalizedSearch) return matchesStatus && matchesCategory;
      const title = task.title.toLowerCase();
      return matchesStatus && matchesCategory && title.includes(normalizedSearch);
    });
  }, [categoryFilter, filter, search, tasks]);

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
    <div className="w-screen h-screen flex text-white font-sans overflow-hidden">
      {/* LEFT SIDEBAR - Dark Glass */}
      <aside className="w-72 h-full glass-panel-dark flex flex-col p-8 gap-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl shadow-[0_0_20px_rgba(0,163,255,0.8)] flex items-center justify-center border border-white/40">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
              <path d="M20 6L9 17L4 12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-white text-2xl font-bold tracking-tight">ToDoApp</span>
        </div>

        <div className="space-y-4">
          <h3 className="text-white/40 text-xs font-black uppercase tracking-widest pl-2">Status</h3>
          <nav className="space-y-2">
            {[
              { id: 'all', label: 'All Tasks', count: tasks.length },
              { id: 'todo', label: 'To Do', count: tasks.filter(t => t.status === 'todo').length },
              { id: 'in-progress', label: 'In Progress', count: tasks.filter(t => t.status === 'in-progress').length },
              { id: 'done', label: 'Completed', count: tasks.filter(t => t.status === 'done').length },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setFilter(item.id as FilterStatus)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 ${
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

        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-white/40 text-xs font-black uppercase tracking-widest">Categories</h3>
            <button onClick={() => setCategoryManagerOpen(true)} className="text-cyan-400 text-xs font-bold hover:underline">Manage</button>
          </div>
          <div className="space-y-1">
            <button 
              onClick={() => setCategoryFilter('all')}
              className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${categoryFilter === 'all' ? 'aero-selected' : 'text-white/60 hover:bg-white/5'}`}
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
                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${categoryFilter === cat.id ? 'aero-selected' : 'text-white/60 hover:bg-white/5'}`}
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
           <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-3">
                 <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3"><path d="M20 6L9 17L4 12" strokeLinecap="round" strokeLinejoin="round"/></svg>
                 </div>
                 <span className="text-white text-sm font-bold">{stats.done} Completed</span>
              </div>
              <div className="flex items-center gap-3 mb-3">
                 <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="3"><path d="M12 19V13M12 9V5M5 12H19" strokeLinecap="round" strokeLinejoin="round"/></svg>
                 </div>
                 <span className="text-white text-sm font-bold">{stats.high} High Priority</span>
              </div>
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="3"><path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7Z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                 </div>
                 <span className="text-white text-sm font-bold">{stats.categorized} Categorized</span>
              </div>
           </div>
        </div>
      </aside>

      {/* RIGHT MAIN CONTENT - Light Glass */}
      <main className="flex-1 h-full glass-panel m-4 rounded-[2rem] flex flex-col overflow-hidden">
        <header className="p-10 flex justify-between items-start border-b border-white/10">
          <div>
            <h2 className="text-5xl font-black text-gray-800 tracking-tighter mb-2 drop-shadow-md">
              {filter === 'all' ? 'All Tasks' : filterLabel[filter]}
            </h2>
              <p className="text-gray-600 font-bold uppercase tracking-widest text-xs">
                {currentCategoryLabel} • {displayedTasks.length} tasks
              </p>
          </div>
          <div className="flex items-center gap-4">
             <div className="relative group">
                <input 
                  type="text" 
                  placeholder="Search tasks..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-64 bg-white/60 backdrop-blur-md border border-white/50 rounded-full px-6 py-3 pl-12 outline-none focus:bg-white/80 focus:ring-4 focus:ring-blue-500/20 transition-all font-medium placeholder:text-gray-500 shadow-inner"
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
             </div>
             <div className="relative">
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="bg-white/70 backdrop-blur-md border border-white/50 px-6 py-3 rounded-full font-bold text-gray-700 hover:bg-white/90 transition-all flex items-center gap-2 shadow-sm"
                >
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
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
                onClick={() => { setEditingTask(null); setModalOpen(true); }}
                className="aero-btn px-8 py-3 rounded-full font-bold text-white flex items-center gap-2 transition"
             >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><path d="M12 5v14M5 12h14"/></svg>
                New Task
             </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 space-y-6">
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[1,2,3].map(i => <div key={i} className="h-24 bg-white/20 rounded-[2rem]"></div>)}
            </div>
          ) : (
            displayedTasks.map(task => (
              <div 
                key={task.id} 
                className={`group relative p-6 rounded-[2rem] border border-white/40 flex items-center gap-6 transition-all duration-300 hover:scale-[1.01] hover:shadow-xl ${
                  task.status === 'done' 
                  ? 'bg-emerald-100/40 border-emerald-500/20' 
                  : 'bg-white/40 backdrop-blur-md'
                }`}
              >
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleToggle(task);
                  }}
                  className={`w-10 h-10 rounded-full border-4 flex items-center justify-center transition-all ${
                    task.status === 'done' 
                    ? 'bg-emerald-500 border-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                    : 'border-white bg-white/20 hover:bg-white/40'
                  }`}
                >
                  {task.status === 'done' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><path d="M20 6L9 17L4 12"/></svg>}
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
                    <svg className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 text-white/50 hover:text-white/80" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.907c.961 0 1.36 1.254.588 1.81l-3.97 2.883a1 1 0 00-.364 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.971-2.883a1 1 0 00-1.175 0l-3.97 2.883c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.364-1.118l-3.97-2.883c-.772-.556-.373-1.81.588-1.81h4.906a1 1 0 00.95-.69l1.519-4.674z"/>
                    </svg>
                  )}
                </button>
                
                <div className="flex-1">
                  <h4 className={`text-xl font-bold tracking-tight mb-2 ${task.status === 'done' ? 'text-gray-500 line-through opacity-60' : 'text-gray-800'}`}>
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

                <div className="flex items-center gap-6 text-gray-500">
                  <span className="text-xs font-bold uppercase opacity-40">Just now</span>
                  
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingTask(task); setModalOpen(true); }} className="p-3 bg-white/40 hover:bg-white/60 rounded-xl border border-white transition-all"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7m-8-3 9.2-9.2a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg></button>
                    <button onClick={() => handleDelete(task.id)} className="p-3 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl border border-rose-500/20 text-rose-500 transition-all"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
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
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditingTask(null); }}
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
    </div>
  );
}
