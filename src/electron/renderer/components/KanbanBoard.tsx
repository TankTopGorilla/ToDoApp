import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Category, Status, Task } from '../../../types/task';

interface Props {
  tasks: Task[];
  categories: Category[];
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
  onToggle: (task: Task) => void;
  onToggleFavorite: (task: Task) => void;
  onReorder: (updates: { id: number; status: Status; sort_order: number }[]) => void;
}

const COLUMNS: { id: Status; label: string; color: string }[] = [
  { id: 'todo', label: 'To Do', color: '#3b82f6' },
  { id: 'in-progress', label: 'In Progress', color: '#f59e0b' },
  { id: 'done', label: 'Done', color: '#10b981' },
];

function SortableTaskCard({
  task,
  onEdit,
  onDelete,
  onToggle,
  onToggleFavorite,
}: {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
  onToggle: (task: Task) => void;
  onToggleFavorite: (task: Task) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white/50 backdrop-blur-sm rounded-xl border border-white/60 p-4 cursor-grab active:cursor-grabbing transition-all hover:shadow-md hover:border-white/80"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(task); }}
            className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              task.status === 'done'
                ? 'bg-emerald-400 border-emerald-500'
                : 'border-gray-300 hover:border-blue-400'
            }`}
          >
            {task.status === 'done' && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><path d="M20 6L9 17L4 12"/></svg>
            )}
          </button>
          <span className={`text-sm font-semibold truncate ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
            {task.title}
          </span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(task); }}
          className="flex-shrink-0 hover:scale-110 transition-transform"
        >
          {task.is_favorite === 1 ? (
            <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
            </svg>
          ) : (
            <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.907c.961 0 1.36 1.254.588 1.81l-3.97 2.883a1 1 0 00-.364 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.971-2.883a1 1 0 00-1.175 0l-3.97 2.883c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.364-1.118l-3.97-2.883c-.772-.556-.373-1.81.588-1.81h4.906a1 1 0 00.95-.69l1.519-4.674z"/>
            </svg>
          )}
        </button>
      </div>

      {task.description && (
        <p className="mt-2 text-xs text-gray-500 line-clamp-2">{task.description}</p>
      )}

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        {task.category_name && task.category_color && (
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: task.category_color }}
            title={task.category_name}
          />
        )}
        {task.due_date && (
          <span className={`text-[10px] font-semibold uppercase ${
            new Date(task.due_date) < new Date(new Date().toDateString()) && task.status !== 'done'
              ? 'text-red-500' : 'text-gray-400'
          }`}>
            {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        )}
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
          task.priority === 'high' ? 'bg-red-100 text-red-600' :
          task.priority === 'medium' ? 'bg-amber-100 text-amber-600' :
          'bg-green-100 text-green-600'
        }`}>
          {task.priority}
        </span>
      </div>

      <div className="mt-3 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(task); }}
          className="p-1.5 rounded-lg hover:bg-white/60 text-gray-400 hover:text-gray-600 transition-all"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
          className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-all"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    </div>
  );
}

const MemoizedTaskCard = React.memo(SortableTaskCard, (prev, next) => {
  return prev.task === next.task
    && prev.onEdit === next.onEdit
    && prev.onDelete === next.onDelete
    && prev.onToggle === next.onToggle
    && prev.onToggleFavorite === next.onToggleFavorite;
});

function KanbanColumn({
  column,
  tasks,
  onEdit,
  onDelete,
  onToggle,
  onToggleFavorite,
  isOver,
}: {
  column: { id: Status; label: string; color: string };
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
  onToggle: (task: Task) => void;
  onToggleFavorite: (task: Task) => void;
  isOver: boolean;
}) {
  const taskIds = useMemo(() => tasks.map(t => t.id), [tasks]);
  const { setNodeRef } = useDroppable({ id: `column-${column.id}` });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-2xl transition-all duration-200 ${
        isOver ? 'bg-blue-50/40 ring-2 ring-blue-300/50' : 'bg-white/20'
      }`}
      style={{ minHeight: 200 }}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/20">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: column.color }} />
          <h3 className="font-bold text-gray-700 text-sm">{column.label}</h3>
        </div>
        <span className="px-3 py-1 bg-white/40 rounded-full text-xs font-bold text-gray-500">
          {tasks.length}
        </span>
      </div>

      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex-1 p-3 space-y-3">
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm font-medium italic">
              Drop tasks here
            </div>
          ) : (
            tasks.map(task => (
              <MemoizedTaskCard
                key={task.id}
                task={task}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggle={onToggle}
                onToggleFavorite={onToggleFavorite}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export default function KanbanBoard({
  tasks,
  categories,
  onEdit,
  onDelete,
  onToggle,
  onToggleFavorite,
  onReorder,
}: Props) {
  const [activeId, setActiveId] = useState<number | null>(null);
  const [overColumnId, setOverColumnId] = useState<Status | null>(null);
  const overColumnRef = useRef<Status | null>(null);

  const columns = useMemo(() => COLUMNS, []);

  const tasksByColumn = useMemo(() => {
    const map: Record<Status, Task[]> = { todo: [], 'in-progress': [], done: [] };
    for (const col of columns) map[col.id] = [];
    // Group tasks by status, sorted by sort_order
    for (const task of tasks) {
      if (map[task.status]) {
        map[task.status].push(task);
      }
    }
    // Sort within each column by sort_order
    for (const col of columns) {
      map[col.id].sort((a, b) => a.sort_order - b.sort_order);
    }
    return map;
  }, [tasks, columns]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const findColumnOfTask = useCallback((id: number | string): Status | null => {
    // Check if id is a column droppable id (e.g. "column-todo")
    if (typeof id === 'string' && id.startsWith('column-')) {
      return id.replace('column-', '') as Status;
    }
    for (const col of columns) {
      if (tasksByColumn[col.id].some(t => t.id === id)) return col.id;
    }
    return null;
  }, [columns, tasksByColumn]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = event.active.id;
    if (typeof id === 'number') setActiveId(id);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeCol = findColumnOfTask(active.id as number | string);
    const overCol = findColumnOfTask(over.id as number | string);

    if (activeCol && overCol && overCol !== overColumnRef.current) {
      overColumnRef.current = overCol;
      setOverColumnId(overCol);
    }
  }, [findColumnOfTask]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverColumnId(null);
    overColumnRef.current = null;

    if (!over) return;

    const activeIdVal = active.id as number;
    const overIdVal = over.id as number | string;

    const activeCol = findColumnOfTask(activeIdVal);
    const overCol = findColumnOfTask(overIdVal);

    if (!activeCol) return;

    // Same column — reorder
    if (activeCol === overCol) {
      const column = tasksByColumn[activeCol];
      const oldIndex = column.findIndex(t => t.id === activeIdVal);
      const newIndex = column.findIndex(t => t.id === overIdVal);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reordered = arrayMove(structuredClone(column), oldIndex, newIndex);
        const updates = reordered.map((t, i) => ({
          id: t.id,
          status: activeCol,
          sort_order: i,
        }));
        onReorder(updates);
      }
      return;
    }

    // Different column — move task and reorder
    if (overCol) {
      const sourceCol = tasksByColumn[activeCol];
      const destCol = tasksByColumn[overCol];
      const overIndex = typeof overIdVal === 'number' ? destCol.findIndex(t => t.id === overIdVal) : -1;

      const task = sourceCol.find(t => t.id === activeIdVal);
      if (!task) return;

      const newDest = [...destCol];
      const insertAt = overIndex >= 0 ? overIndex : newDest.length;

      const updates: { id: number; status: Status; sort_order: number }[] = [];

      const remainingSource = sourceCol.filter(t => t.id !== activeIdVal);
      remainingSource.forEach((t, i) => {
        updates.push({ id: t.id, status: activeCol, sort_order: i });
      });

      newDest.splice(insertAt, 0, { ...task, status: overCol });
      newDest.forEach((t, i) => {
        updates.push({ id: t.id, status: overCol, sort_order: i });
      });

      onReorder(updates);
    }
  }, [findColumnOfTask, tasksByColumn, onReorder]);

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 overflow-x-auto p-6">
        <div className="grid grid-cols-3 gap-6 h-full" style={{ minWidth: 600 }}>
          {columns.map(col => (
            <KanbanColumn
              key={col.id}
              column={col}
              tasks={tasksByColumn[col.id]}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggle={onToggle}
              onToggleFavorite={onToggleFavorite}
              isOver={overColumnId === col.id}
            />
          ))}
        </div>
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="bg-white/80 backdrop-blur-md rounded-xl border border-blue-300/60 p-4 shadow-lg rotate-2">
            <span className="text-sm font-semibold text-gray-800">{activeTask.title}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
