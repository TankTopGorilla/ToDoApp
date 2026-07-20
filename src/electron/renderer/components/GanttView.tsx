import React, { useMemo, useRef, useState } from 'react';
import { Task } from '../../../types/task';

interface Props {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
  onToggle: (task: Task) => void;
}

const PX_PER_DAY = 22;
const ROW_HEIGHT = 40;
const LEFT_PANEL_WIDTH = 260;
const HEADER_HEIGHT = 56;
const WEEK_COUNT = 14;

function getMonday(d: Date): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function formatHeader(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

function daysBetween(a: Date, b: Date): number {
  const diff = b.getTime() - a.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function toDateOnly(s: string): Date {
  const d = new Date(s);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function GanttView({ tasks, onEdit, onDelete, onToggle }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);

  const { rangeStart, rangeEnd, totalDays, weeks, dayColumns, todayOffset } = useMemo(() => {
    const start = getMonday(new Date());
    const end = addDays(start, WEEK_COUNT * 7);
    const total = daysBetween(start, end);
    const wks: { start: Date; end: Date; index: number }[] = [];
    for (let i = 0; i < WEEK_COUNT; i++) {
      const ws = addDays(start, i * 7);
      const we = addDays(ws, 6);
      wks.push({ start: ws, end: we, index: i });
    }
    const cols = Array.from({ length: total }, (_, i) => addDays(start, i));
    const todayOff = daysBetween(start, toDateOnly(new Date().toISOString().split('T')[0]));
    return { rangeStart: start, rangeEnd: end, totalDays: total, weeks: wks, dayColumns: cols, todayOffset: todayOff };
  }, []);

  const rows = useMemo(() => {
    const result: { task: Task; left: number; width: number; overdue: boolean }[] = [];
    for (const task of tasks) {
      if (!task.due_date) continue;

      const dueDate = toDateOnly(task.due_date);
      const createdDate = toDateOnly(task.created_at);

      // Bar start: max(created_at, rangeStart)
      let barStart: Date;
      let barStartDays: number;
      if (createdDate < rangeStart) {
        barStart = rangeStart;
        barStartDays = 0;
      } else {
        barStart = createdDate;
        barStartDays = daysBetween(rangeStart, createdDate);
      }

      // Bar end: min(due_date, rangeEnd)
      const barEndDays = Math.min(daysBetween(rangeStart, dueDate), totalDays);
      const duration = barEndDays - barStartDays;

      if (barEndDays <= 0 || duration <= 0) continue;

      result.push({
        task,
        left: barStartDays * PX_PER_DAY,
        width: duration * PX_PER_DAY,
        overdue: task.status !== 'done' && dueDate < toDateOnly(new Date().toISOString().split('T')[0]),
      });
    }

    // Sort: overdue first, then by due_date, then by status
    result.sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
      return a.task.due_date!.localeCompare(b.task.due_date!);
    });

    return result;
  }, [tasks, rangeStart, rangeEnd, totalDays]);

  const noDateTasks = useMemo(() => {
    return tasks.filter(t => !t.due_date || t.status === 'done').sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [tasks]);

  const totalWidth = totalDays * PX_PER_DAY;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollY(e.currentTarget.scrollTop);
  };

  return (
    <div className="flex-1 flex flex-col bg-white/25 backdrop-blur-sm rounded-[2rem] border border-white/40 overflow-hidden">
      {/* Header row: fixed left panel + scrollable time axis */}
      <div className="flex border-b border-white/20" style={{ height: HEADER_HEIGHT }}>
        <div
          className="flex-shrink-0 flex items-center px-5 border-r border-white/20 bg-white/30"
          style={{ width: LEFT_PANEL_WIDTH }}
        >
          <span className="text-xs font-black uppercase tracking-widest text-gray-500">Tasks</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <div style={{ width: totalWidth, height: '100%', display: 'flex' }}>
            {/* Week headers with day markers */}
            {weeks.map(week => {
              const weekLeft = week.index * 7 * PX_PER_DAY;
              return (
                <div
                  key={week.index}
                  className="flex-shrink-0 border-r border-white/10 px-2 flex flex-col justify-center"
                  style={{ width: 7 * PX_PER_DAY }}
                >
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    {formatHeader(week.start)} - {formatHeader(week.end)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Body: scrollable */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel (task names) */}
        <div
          className="flex-shrink-0 border-r border-white/20 bg-white/20 overflow-hidden"
          style={{ width: LEFT_PANEL_WIDTH }}
        >
          <div
            className="overflow-y-auto"
            style={{ height: '100%', marginTop: -scrollY }}
            onScroll={handleScroll}
          >
            <div style={{ paddingTop: 0 }}>
              {rows.map(({ task }) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 px-4 border-b border-white/10 hover:bg-white/20 transition-colors cursor-pointer"
                  style={{ height: ROW_HEIGHT }}
                  onClick={() => onEdit(task)}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggle(task); }}
                    className={`flex-shrink-0 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-all ${
                      task.status === 'done'
                        ? 'bg-emerald-400 border-emerald-500'
                        : 'border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {task.status === 'done' && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="5"><path d="M20 6L9 17L4 12"/></svg>}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold truncate ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                        {task.title}
                      </span>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded flex-shrink-0 ${
                        task.priority === 'high' ? 'bg-red-100 text-red-600' :
                        task.priority === 'medium' ? 'bg-amber-100 text-amber-600' :
                        'bg-green-100 text-green-600'
                      }`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                    className="p-1 rounded hover:bg-red-100 text-gray-300 hover:text-red-500 opacity-0 hover:opacity-100 transition-all flex-shrink-0"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
              ))}
            </div>

            {/* Unscheduled / done tasks footer */}
            {noDateTasks.length > 0 && (
              <div className="border-t border-white/20 mt-2">
                <div className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Unscheduled / Done
                </div>
                {noDateTasks.slice(0, 20).map(task => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 px-4 border-b border-white/10 hover:bg-white/20 transition-colors cursor-pointer"
                    style={{ height: ROW_HEIGHT }}
                    onClick={() => onEdit(task)}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggle(task); }}
                      className={`flex-shrink-0 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center ${
                        task.status === 'done' ? 'bg-emerald-400 border-emerald-500' : 'border-gray-300'
                      }`}
                    >
                      {task.status === 'done' && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="5"><path d="M20 6L9 17L4 12"/></svg>}
                    </button>
                    <span className={`text-sm truncate flex-1 ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-600'}`}>{task.title}</span>
                  </div>
                ))}
                {noDateTasks.length > 20 && (
                  <div className="px-4 py-2 text-xs text-gray-400 italic text-center">
                    +{noDateTasks.length - 20} more
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right panel (time grid + bars) — synced scroll */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-auto"
          onScroll={(e) => {
            const target = e.currentTarget;
            const leftPanel = target.parentElement?.querySelector('.gantt-left-panel-scroll');
            if (leftPanel) {
              leftPanel.scrollTop = target.scrollTop;
            }
          }}
        >
          {/* Synchronize vertical scroll via a hidden element in the left panel */}
          <div style={{ width: totalWidth, position: 'relative', minHeight: rows.length * ROW_HEIGHT + (noDateTasks.length > 0 ? 60 + Math.min(noDateTasks.length, 20) * ROW_HEIGHT : 0) }}>
            {/* Today marker */}
            {todayOffset >= 0 && todayOffset < totalDays && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-20 pointer-events-none"
                style={{ left: todayOffset * PX_PER_DAY, boxShadow: '0 0 6px rgba(239,68,68,0.5)' }}
              >
                <div className="w-3 h-3 bg-red-400 rounded-full -ml-[5px] -mt-[2px]" />
              </div>
            )}

            {/* Day grid lines */}
            {dayColumns.map((day, i) => (
              <div
                key={i}
                className={`absolute top-0 bottom-0 w-px ${day.getDay() === 0 || day.getDay() === 6 ? 'bg-white/10' : 'bg-white/5'}`}
                style={{ left: i * PX_PER_DAY, pointerEvents: 'none' }}
              />
            ))}

            {/* Week separators (heavier lines) */}
            {weeks.slice(1).map(week => (
              <div
                key={week.index}
                className="absolute top-0 bottom-0 w-0.5 bg-white/20 pointer-events-none"
                style={{ left: week.index * 7 * PX_PER_DAY }}
              />
            ))}

            {/* Task bars */}
            {rows.map(({ task, left, width, overdue }) => (
              <div
                key={task.id}
                className="absolute flex items-center cursor-pointer group"
                style={{ height: ROW_HEIGHT, top: rows.indexOf({ task, left, width, overdue }) * ROW_HEIGHT, left: 0, right: 0 }}
                onClick={() => onEdit(task)}
              >
                {/* The actual bar */}
                <div
                  className={`absolute h-7 rounded-lg flex items-center px-3 transition-all hover:shadow-md hover:scale-y-110 ${
                    task.status === 'done'
                      ? 'bg-emerald-400/60 border border-emerald-500/30'
                      : overdue
                      ? 'bg-red-400/60 border border-red-500/30'
                      : task.status === 'in-progress'
                      ? 'bg-amber-400/50 border border-amber-500/30'
                      : 'bg-blue-400/50 border border-blue-500/30'
                  }`}
                  style={{ left, width: Math.max(width, 12) }}
                >
                  <span className={`text-[11px] font-bold truncate ${
                    task.status === 'done' ? 'text-emerald-800' :
                    overdue ? 'text-red-900' : 'text-gray-800'
                  }`}>
                    {width > 60 ? task.title : ''}
                  </span>
                </div>
              </div>
            ))}

            {/* No tasks in range */}
            {rows.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <svg className="w-12 h-12 mx-auto mb-3 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
                  </svg>
                  <p className="text-sm font-bold">No tasks with dates in this range</p>
                  <p className="text-xs mt-1">Add due dates to tasks to see them on the Gantt.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
