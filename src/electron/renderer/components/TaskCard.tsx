import React from 'react';
import {
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  Task,
} from '../../../types/task';

interface Props {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
  onToggle: (task: Task) => void;
  onTaskUpdate?: () => void;
}

export default function TaskCard({ task, onEdit, onDelete, onToggle, onTaskUpdate }: Props) {
  const isDone = task.status === 'done';

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newFavoriteState = task.is_favorite === 1 ? 0 : 1;
    const updatedTask = { ...task, is_favorite: newFavoriteState };
    try {
      await window.electronAPI.updateTask(updatedTask);
      if (onTaskUpdate) {
        onTaskUpdate();
      }
    } catch (error) {
      console.error('Failed to update favorite status:', error);
    }
  };

  return (
    <div className={`task-card${isDone ? ' done' : ''}`}>
      <div className="task-card-header">
        <button
          type="button"
          className="task-checkbox"
          onClick={() => onToggle(task)}
          aria-label={isDone ? 'Mark as todo' : 'Mark as done'}
        >
          {isDone ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle
                cx="8"
                cy="8"
                r="7"
                stroke="#10b981"
                strokeWidth="1.5"
                fill="#10b981"
                fillOpacity="0.2"
              />
              <path
                d="M5 8l2 2 4-4"
                stroke="#10b981"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="#6b7280" strokeWidth="1.5" />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={handleFavoriteClick}
          className="z-10 p-2 hover:scale-110 transition-transform"
          aria-label={task.is_favorite === 1 ? 'Remove from favorites' : 'Add to favorites'}
        >
          {task.is_favorite === 1 ? (
            <svg className="w-6 h-6 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
            </svg>
          ) : (
            <svg className="w-6 h-6 text-gray-400 hover:text-white/80" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.907c.961 0 1.36 1.254.588 1.81l-3.97 2.883a1 1 0 00-.364 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.971-2.883a1 1 0 00-1.175 0l-3.97 2.883c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.364-1.118l-3.97-2.883c-.772-.556-.373-1.81.588-1.81h4.906a1 1 0 00.95-.69l1.519-4.674z"/>
            </svg>
          )}
        </button>

        <span className={`task-title${isDone ? ' done-title' : ''}`}>
          {task.title}
        </span>
      </div>

      {task.description ? (
        <p className="task-description">{task.description}</p>
      ) : null}

      <div className="task-meta">
        <span className={`badge ${PRIORITY_COLORS[task.priority]}`}>
          {PRIORITY_LABELS[task.priority]}
        </span>

        <span className={`badge ${STATUS_COLORS[task.status]}`}>
          {STATUS_LABELS[task.status]}
        </span>

        {task.due_date ? (
          <span className="badge bg-slate-700/60 text-slate-300">
            📅 {new Date(task.due_date).toLocaleDateString()}
          </span>
        ) : null}

        {task.category_name ? (
          <span
            className="badge"
            style={{
              backgroundColor: `${task.category_color ?? '#6366f1'}30`,
              color: task.category_color ?? '#ffffff',
            }}
          >
            {task.category_name}
          </span>
        ) : null}
      </div>

      <div className="task-actions">
        <button
          type="button"
          className="btn-icon"
          onClick={() => onEdit(task)}
          aria-label="Edit task"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>

        <button
          type="button"
          className="btn-icon btn-icon-danger"
          onClick={() => onDelete(task.id)}
          aria-label="Delete task"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
