import React, { useState } from 'react';
import {
  Category,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '../../../types/task';

interface Props {
  categories: Category[];
  onCreate: (input: CreateCategoryInput) => Promise<void>;
  onUpdate: (input: UpdateCategoryInput) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onClose: () => void;
}

const DEFAULT_COLOR = '#6366f1';

export default function CategoryManager({
  categories,
  onCreate,
  onUpdate,
  onDelete,
  onClose,
}: Props) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [error, setError] = useState('');

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();

    const trimmed = name.trim();

    if (!trimmed) {
      setError('Category name is required.');
      return;
    }

    await onCreate({
      name: trimmed,
      color,
    });

    setName('');
    setColor(DEFAULT_COLOR);
    setError('');
  }

  async function handleRename(category: Category) {
    const nextName = window.prompt('Rename category', category.name);

    if (nextName === null) {
      return;
    }

    const trimmedName = nextName.trim();

    if (!trimmedName) {
      window.alert('Category name is required.');
      return;
    }

    const nextColor = window.prompt(
      'Category color hex',
      category.color || DEFAULT_COLOR
    );

    if (nextColor === null) {
      return;
    }

    await onUpdate({
      id: category.id,
      name: trimmedName,
      color: nextColor.trim() || DEFAULT_COLOR,
    });
  }

  async function handleDelete(category: Category) {
    const confirmed = window.confirm(
      `Delete "${category.name}"? Tasks in this category will become uncategorized.`
    );

    if (!confirmed) {
      return;
    }

    await onDelete(category.id);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-2xl border border-gray-700"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Manage Categories</h2>
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

        <div className="grid grid-cols-2 gap-8">
          <form className="space-y-4" onSubmit={handleCreate}>
            <h3 className="text-lg font-bold text-white mb-4">Create Category</h3>

            {error ? <p className="text-red-400 text-sm font-medium">{error}</p> : null}

            <div>
              <label htmlFor="category-name" className="block text-sm font-medium text-gray-300 mb-1">Name</label>
              <input
                id="category-name"
                type="text"
                value={name}
                placeholder="Design, Work, Personal..."
                onChange={(event) => setName(event.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="category-color" className="block text-sm font-medium text-gray-300 mb-1">Color</label>
              <div className="flex gap-3">
                <input
                  id="category-color"
                  type="color"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                  className="w-12 h-12 cursor-pointer rounded-lg border border-gray-600"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                  aria-label="Category color hex"
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <button type="submit" className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Add Category
            </button>
          </form>

          <div>
            <h3 className="text-lg font-bold text-white mb-4">Existing Categories</h3>

            {categories.length === 0 ? (
              <div className="text-gray-400 text-sm italic p-4 bg-gray-700/30 rounded-lg">
                No categories yet. Create one to start organizing tasks.
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg border border-gray-600">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: category.color }}
                        aria-hidden="true"
                      />
                      <div>
                        <div className="font-medium text-white">{category.name}</div>
                        <div className="text-xs text-gray-400">
                          {category.task_count ?? 0} task{category.task_count === 1 ? '' : 's'}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="px-3 py-1 text-sm text-gray-300 hover:text-white border border-gray-600 rounded hover:bg-gray-700 transition-colors"
                        onClick={() => void handleRename(category)}
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        className="px-3 py-1 text-sm text-red-400 hover:text-red-300 border border-red-600/30 rounded hover:bg-red-600/10 transition-colors"
                        onClick={() => void handleDelete(category)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
