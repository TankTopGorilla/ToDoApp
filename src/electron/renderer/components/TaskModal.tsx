import React, { useEffect, useState } from 'react';
import {
  Category,
  NewTask,
  Priority,
  Status,
  Task,
} from '../../../types/task';

interface Props {
  task?: Task | null;
  categories: Category[];
  onSave: (data: NewTask) => void | Promise<void>;
  onClose: () => void;
}

const blank = (): NewTask => ({
  title: '',
  description: '',
  due_date: null,
  priority: 'medium',
  status: 'todo',
  category_id: null,
  is_favorite: 0,
});

export default function TaskModal({
  task,
  categories,
  onSave,
  onClose,
}: Props) {
  const [form, setForm] = useState<NewTask>(blank());
  const [error, setError] = useState('');

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description,
        due_date: task.due_date,
        priority: task.priority,
        status: task.status,
        category_id: task.category_id,
        is_favorite: task.is_favorite ?? 0,
      });
    } else {
      setForm(blank());
    }

    setError('');
  }, [task]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }

    await onSave({
      ...form,
      title: form.title.trim(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md border border-gray-700"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">{task ? 'Edit Task' : 'New Task'}</h2>
          <button
            type="button"
            className="text-gray-400 hover:text-white"
            onClick={onClose}
            aria-label="Close"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {error ? <p className="text-red-400 text-sm font-medium">{error}</p> : null}

          <div>
            <label htmlFor="task-title" className="block text-sm font-medium text-gray-300 mb-1">Title *</label>
            <input
              id="task-title"
              type="text"
              placeholder="What needs to be done?"
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              autoFocus
              required
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="task-description" className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <textarea
              id="task-description"
              placeholder="Add details..."
              rows={3}
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="task-priority" className="block text-sm font-medium text-gray-300 mb-1">Priority</label>
              <select
                id="task-priority"
                value={form.priority}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    priority: event.target.value as Priority,
                  }))
                }
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label htmlFor="task-status" className="block text-sm font-medium text-gray-300 mb-1">Status</label>
              <select
                id="task-status"
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as Status,
                  }))
                }
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="task-due-date" className="block text-sm font-medium text-gray-300 mb-1">Due Date</label>
            <input
              id="task-due-date"
              type="date"
              value={form.due_date ?? ''}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  due_date: event.target.value || null,
                }))
              }
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="task-category" className="block text-sm font-medium text-gray-300 mb-1">Category</label>
            <select
              id="task-category"
              value={form.category_id ?? ''}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  category_id: event.target.value ? Number(event.target.value) : null,
                }))
              }
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">No category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              className="px-4 py-2 text-gray-300 hover:text-white border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>

            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              {task ? 'Save Changes' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
