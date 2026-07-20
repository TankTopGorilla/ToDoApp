import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Category, Status, Task } from '../../../types/task';

interface Props {
  tasks: Task[];
  categories: Category[];
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
  onToggle: (task: Task) => void;
  onToggleFavorite: (task: Task) => void;
  onAddDate: (date: string) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function getMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay(); // 0=Sun
  const totalDays = lastDay.getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= totalDays; d++) days.push(d);
  // Pad to fill complete rows (multiple of 7)
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function isToday(year: number, month: number, day: number) {
  const t = new Date();
  return t.getFullYear() === year && t.getMonth() === month && t.getDate() === day;
}

function formatTaskDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function CalendarView({
  tasks,
  categories,
  onEdit,
  onDelete,
  onToggle,
  onToggleFavorite,
  onAddDate,
}: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      if (!task.due_date) continue;
      const existing = map.get(task.due_date) || [];
      existing.push(task);
      map.set(task.due_date, existing);
    }
    return map;
  }, [tasks]);

  const selectedTasks = useMemo(() => {
    if (!selectedDate) return [];
    return tasksByDate.get(selectedDate) || [];
  }, [selectedDate, tasksByDate]);

  const grid = useMemo(() => getMonthGrid(year, month), [year, month]);

  const goPrev = useCallback(() => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDate(null);
  }, [month]);

  const goNext = useCallback(() => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDate(null);
  }, [month]);

  const goToday = useCallback(() => {
    const t = new Date();
    setYear(t.getFullYear());
    setMonth(t.getMonth());
    setSelectedDate(null);
  }, []);

  const handleDayClick = useCallback((day: number | null) => {
    if (day === null) return;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(prev => prev === dateStr ? null : dateStr);
  }, [year, month]);

  const totalCount = tasks.length;
  const doneCount = tasks.filter(t => t.status === 'done').length;

  return (
    <div className="flex-1 flex gap-4 p-6 overflow-hidden" style={{ minHeight: 0 }}>
      {/* Calendar grid */}
      <div className="flex-1 flex flex-col bg-white/30 backdrop-blur-md rounded-[2rem] border border-white/40 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-white/20">
          <div className="flex items-center gap-4">
            <button onClick={goPrev} className="p-2 rounded-xl hover:bg-white/30 transition-all text-gray-500">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">
              {MONTHS[month]} <span className="font-bold text-gray-400">{year}</span>
            </h2>
            <button onClick={goNext} className="p-2 rounded-xl hover:bg-white/30 transition-all text-gray-500">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
          <button
            onClick={goToday}
            className="px-5 py-2 bg-white/60 backdrop-blur-sm border border-white/60 rounded-full text-sm font-bold text-gray-600 hover:bg-white/80 transition-all shadow-sm"
          >
            Today
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-white/10">
          {WEEKDAYS.map(d => (
            <div key={d} className="py-3 text-center text-[11px] font-black uppercase tracking-widest text-gray-400">
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-y-auto">
          {grid.map((day, i) => {
            if (day === null) return <div key={`e-${i}`} className="border-r border-b border-white/10 bg-white/5" />;

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayTasks = tasksByDate.get(dateStr) || [];
            const today = isToday(year, month, day);
            const selected = selectedDate === dateStr;

            return (
              <button
                key={dateStr}
                onClick={() => handleDayClick(day)}
                className={`flex flex-col items-start p-2 border-r border-b border-white/10 transition-all cursor-pointer text-left
                  ${today ? 'bg-blue-50/60' : 'hover:bg-white/20'}
                  ${selected ? 'ring-2 ring-blue-400/60 ring-inset bg-blue-50/40' : ''}
                `}
              >
                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold mb-1
                  ${today ? 'bg-blue-500 text-white' : 'text-gray-700'}
                `}>
                  {day}
                </span>
                <div className="flex flex-col gap-0.5 w-full">
                  {dayTasks.slice(0, 3).map(t => (
                    <div
                      key={t.id}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold truncate"
                      style={{
                        backgroundColor: t.category_color ? `${t.category_color}20` : 'rgba(99,102,241,0.15)',
                        color: t.category_color || '#6366f1',
                      }}
                      title={t.title}
                    >
                      {t.status === 'done' ? (
                        <svg className="w-2.5 h-2.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                      ) : (
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          t.priority === 'high' ? 'bg-red-500' : t.priority === 'medium' ? 'bg-amber-500' : 'bg-green-500'
                        }`} />
                      )}
                      <span className="truncate">{t.title}</span>
                    </div>
                  ))}
                  {dayTasks.length > 3 && (
                    <span className="text-[10px] font-bold text-gray-400 pl-1.5">
                      +{dayTasks.length - 3} more
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Side panel: selected day tasks */}
      {selectedDate && (
        <div className="w-80 flex-shrink-0 bg-white/40 backdrop-blur-md rounded-[2rem] border border-white/40 flex flex-col overflow-hidden">
          <div className="px-6 py-5 border-b border-white/20">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800 text-lg">{formatTaskDate(selectedDate)}</h3>
              <button onClick={() => setSelectedDate(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <p className="text-xs text-gray-500 font-medium mt-1">{selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''}</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {selectedTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm italic">
                No tasks for this day
              </div>
            ) : (
              selectedTasks.map(task => {
                const isOverdue = task.status !== 'done' && new Date(task.due_date!) < new Date(new Date().toDateString());
                return (
                  <div
                    key={task.id}
                    className={`p-4 rounded-xl border transition-all hover:shadow-sm ${
                      task.status === 'done' ? 'bg-emerald-50/50 border-emerald-200/40' :
                      isOverdue ? 'bg-red-50/50 border-red-200/40' :
                      'bg-white/60 border-white/80'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <button
                        onClick={() => onToggle(task)}
                        className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center transition-all ${
                          task.status === 'done' ? 'bg-emerald-400 border-emerald-500' : 'border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        {task.status === 'done' && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><path d="M20 6L9 17L4 12"/></svg>
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold truncate ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                            {task.title}
                          </span>
                          {task.is_favorite === 1 && (
                            <svg className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                            </svg>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            task.priority === 'high' ? 'bg-red-100 text-red-600' :
                            task.priority === 'medium' ? 'bg-amber-100 text-amber-600' :
                            'bg-green-100 text-green-600'
                          }`}>
                            {task.priority}
                          </span>
                          {task.category_name && (
                            <span className="text-[10px] font-medium text-gray-400 truncate">{task.category_name}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-1 mt-2">
                      <button onClick={() => onEdit(task)} className="p-1 rounded hover:bg-white/60 text-gray-400 hover:text-gray-600">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button onClick={() => onDelete(task.id)} className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-4 border-t border-white/20">
            <button
              onClick={() => { onAddDate(selectedDate); }}
              className="w-full py-2.5 bg-white/70 backdrop-blur-sm border border-white/60 rounded-xl text-sm font-bold text-gray-600 hover:bg-white/90 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
              Add task on this date
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
