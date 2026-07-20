import React, { useMemo } from 'react';
import { Task } from '../../../types/task';

interface Props {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
  onToggle: (task: Task) => void;
  onToggleFavorite: (task: Task) => void;
}

interface TimelineGroup {
  id: string;
  label: string;
  tasks: Task[];
  color: string;
  dotColor: string;
}

function daysFromToday(dateStr: string): number {
  const d = new Date(dateStr);
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - t.getTime()) / (1000 * 60 * 60 * 24));
}

function formatGroupDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function TimelineView({ tasks, onEdit, onDelete, onToggle, onToggleFavorite }: Props) {
  const groups = useMemo(() => {
    const grouped: TimelineGroup[] = [];

    const overdue: Task[] = [];
    const today: Task[] = [];
    const tomorrow: Task[] = [];
    const thisWeek: Task[] = [];
    const nextWeek: Task[] = [];
    const later: Task[] = [];
    const noDate: Task[] = [];

    for (const task of tasks) {
      if (!task.due_date) {
        if (task.status !== 'done') noDate.push(task);
        continue;
      }

      const diff = daysFromToday(task.due_date);

      if (task.status === 'done') continue; // done tasks go to "completed"

      if (diff < 0) { overdue.push(task); continue; }
      if (diff === 0) { today.push(task); continue; }
      if (diff === 1) { tomorrow.push(task); continue; }
      if (diff <= 7) { thisWeek.push(task); continue; }
      if (diff <= 14) { nextWeek.push(task); continue; }
      later.push(task);
    }

    // Done tasks grouped by week
    const doneTasks = tasks.filter(t => t.status === 'done' && t.due_date);
    const doneRecent = doneTasks.filter(t => daysFromToday(t.due_date!) >= -14);

    if (overdue.length) grouped.push({ id: 'overdue', label: 'Overdue', tasks: overdue, color: 'text-red-600', dotColor: 'bg-red-500' });
    if (today.length) grouped.push({ id: 'today', label: 'Today', tasks: today, color: 'text-blue-600', dotColor: 'bg-blue-500' });
    if (tomorrow.length) grouped.push({ id: 'tomorrow', label: 'Tomorrow', tasks: tomorrow, color: 'text-indigo-600', dotColor: 'bg-indigo-500' });
    if (thisWeek.length) grouped.push({ id: 'this-week', label: 'This Week', tasks: thisWeek, color: 'text-purple-600', dotColor: 'bg-purple-500' });
    if (nextWeek.length) grouped.push({ id: 'next-week', label: 'Next Week', tasks: nextWeek, color: 'text-teal-600', dotColor: 'bg-teal-500' });
    if (later.length) grouped.push({ id: 'later', label: 'Later', tasks: later, color: 'text-gray-500', dotColor: 'bg-gray-400' });
    if (noDate.length) grouped.push({ id: 'no-date', label: 'Unscheduled', tasks: noDate, color: 'text-gray-400', dotColor: 'bg-gray-300' });
    if (doneRecent.length) grouped.push({ id: 'done', label: 'Recently Done', tasks: doneRecent, color: 'text-emerald-600', dotColor: 'bg-emerald-400' });

    return grouped;
  }, [tasks]);

  if (tasks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-10">
        <div className="text-center text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <p className="text-lg font-bold">No tasks to show</p>
          <p className="text-sm mt-1">Add some tasks to see them on the timeline.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto relative pl-8">
        {/* Vertical timeline line */}
        <div className="absolute left-[17px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-300 via-purple-300 to-emerald-300 opacity-40" />

        {groups.map(group => (
          <div key={group.id} className="mb-8">
            {/* Group header */}
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-[10px] h-[10px] rounded-full ${group.dotColor} ring-4 ring-white shadow-sm relative z-10`} />
              <div className="flex items-center gap-3">
                <h3 className={`text-sm font-black uppercase tracking-widest ${group.color}`}>
                  {group.label}
                </h3>
                <span className="px-2.5 py-0.5 bg-white/30 rounded-full text-xs font-bold text-gray-500">
                  {group.tasks.length}
                </span>
              </div>
            </div>

            {/* Task cards */}
            <div className="space-y-3 ml-1">
              {group.tasks.map(task => {
                const isOverdue = group.id === 'overdue';
                const dateLabel = task.due_date ? formatGroupDate(task.due_date) : null;

                return (
                  <div
                    key={task.id}
                    className={`group relative rounded-xl border transition-all hover:shadow-md ${
                      isOverdue
                        ? 'bg-red-50/60 border-red-200/50'
                        : task.status === 'done'
                        ? 'bg-emerald-50/40 border-emerald-200/30'
                        : 'bg-white/50 backdrop-blur-sm border-white/70 hover:bg-white/70'
                    }`}
                  >
                    <div className="p-4 pl-14">
                      {/* Timeline dot for this task */}
                      <div className="absolute left-[-29px] top-[22px] w-[9px] h-[9px] rounded-full border-2 border-white bg-gray-300 shadow-sm" />

                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <button
                          onClick={() => onToggle(task)}
                          className={`flex-shrink-0 w-[22px] h-[22px] mt-0.5 rounded-full border-2 flex items-center justify-center transition-all ${
                            task.status === 'done'
                              ? 'bg-emerald-400 border-emerald-500'
                              : isOverdue
                              ? 'border-red-300 hover:border-red-400'
                              : 'border-gray-300 hover:border-blue-400'
                          }`}
                        >
                          {task.status === 'done' && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="5"><path d="M20 6L9 17L4 12"/></svg>
                          )}
                        </button>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className={`text-base font-bold tracking-tight ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                              {task.title}
                            </h4>
                            {task.is_favorite === 1 && (
                              <svg className="w-4 h-4 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                              </svg>
                            )}
                          </div>

                          {task.description && (
                            <p className="text-sm text-gray-500 mt-1 line-clamp-1">{task.description}</p>
                          )}

                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            {dateLabel && (
                              <span className={`text-xs font-semibold ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
                                {dateLabel}
                              </span>
                            )}
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              task.priority === 'high' ? 'bg-red-100 text-red-600' :
                              task.priority === 'medium' ? 'bg-amber-100 text-amber-600' :
                              'bg-green-100 text-green-600'
                            }`}>
                              {task.priority}
                            </span>
                            {task.category_name && task.category_color && (
                              <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: task.category_color }} />
                                <span className="text-xs text-gray-400 font-medium">{task.category_name}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
                            className="p-2 rounded-lg hover:bg-white/60 text-gray-400 hover:text-gray-600 transition-all"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onToggleFavorite(task); }}
                            className={`p-2 rounded-lg transition-all ${
                              task.is_favorite === 1 ? 'text-yellow-500 hover:bg-yellow-50' : 'text-gray-400 hover:bg-white/60'
                            }`}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill={task.is_favorite === 1 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                            </svg>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                            className="p-2 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-all"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
