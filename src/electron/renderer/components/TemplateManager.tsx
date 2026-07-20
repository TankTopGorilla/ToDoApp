import React, { useCallback, useEffect, useState } from 'react';
import { Template } from '../../../types/task';

interface Props {
  onClose: () => void;
  onApplied: () => void;
}

export default function TemplateManager({ onClose, onApplied }: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selected, setSelected] = useState<Template | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadTemplates = useCallback(async () => {
    const result = await window.electronAPI.getTemplates();
    if (Array.isArray(result)) {
      setTemplates(result as Template[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setError('Name is required'); return; }
    const result = await window.electronAPI.createTemplate({
      name: trimmed,
      tasks: [
        { title: 'Task 1', priority: 'medium' },
      ],
    });
    if (result && typeof result === 'object' && 'error' in result) {
      setError((result as { error: string }).error);
      return;
    }
    setName('');
    setError('');
    await loadTemplates();
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this template?')) return;
    await window.electronAPI.deleteTemplate(id);
    if (selected?.id === id) setSelected(null);
    await loadTemplates();
  };

  const handleApply = async (id: number) => {
    const due = window.prompt('Due date for all tasks? (YYYY-MM-DD, or leave blank for no date)');
    const result = await window.electronAPI.applyTemplate({
      id,
      due_date: due || null,
    });
    if (result && typeof result === 'object' && 'error' in result) {
      alert('Failed: ' + (result as { error: string }).error);
      return;
    }
    onApplied();
  };

  const handleSelect = async (tpl: Template) => {
    const result = await window.electronAPI.getTemplate(tpl.id);
    if (result && typeof result === 'object' && Array.isArray((result as Record<string, unknown>).tasks)) {
      setSelected(result as Template);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(var(--blur-modal))' }}
      onClick={onClose}
    >
      <div
        className="p-6 w-full max-w-3xl"
        style={{
          background: 'rgba(30, 41, 59, 0.85)',
          borderRadius: 'var(--radius-modal)',
          boxShadow: 'var(--shadow-modal)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(12px)',
          animation: 'slideUp var(--transition-normal) both',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Task Templates</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Left: Template list + create */}
          <div>
            <form onSubmit={handleCreate} className="space-y-3 mb-6">
              {error && <p className="text-red-400 text-sm font-medium">{error}</p>}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={name}
                  placeholder="New template name..."
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <button type="submit" className="aero-btn px-4 py-2 text-white rounded-lg text-sm font-bold whitespace-nowrap">
                  + Create
                </button>
              </div>
            </form>

            {loading ? (
              <div className="animate-pulse space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-700/50 rounded-lg" />)}
              </div>
            ) : templates.length === 0 ? (
              <div className="text-gray-400 text-sm italic p-4 bg-gray-700/30 rounded-lg text-center">
                No templates yet. Create one above.
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                {templates.map(tpl => (
                  <div
                    key={tpl.id}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                      selected?.id === tpl.id
                        ? 'bg-blue-600/20 border-blue-500/40'
                        : 'bg-gray-700/30 border-gray-600 hover:bg-gray-700/50'
                    }`}
                    onClick={() => handleSelect(tpl)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-white text-sm truncate">{tpl.name}</div>
                      <div className="text-xs text-gray-400">{tpl.task_count ?? 0} task{(tpl.task_count ?? 0) !== 1 ? 's' : ''}</div>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleApply(tpl.id); }}
                        className="px-3 py-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 border border-emerald-600/30 rounded hover:bg-emerald-600/10 transition-colors"
                      >
                        Apply
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(tpl.id); }}
                        className="px-3 py-1 text-xs font-bold text-red-400 hover:text-red-300 border border-red-600/30 rounded hover:bg-red-600/10 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Template detail */}
          <div>
            {selected ? (
              <div className="bg-gray-700/30 rounded-lg border border-gray-600 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">{selected.name}</h3>
                  <button
                    onClick={() => handleApply(selected.id)}
                    className="aero-btn px-4 py-2 text-white rounded-lg text-sm font-bold"
                  >
                    Apply Template
                  </button>
                </div>
                {selected.description && (
                  <p className="text-sm text-gray-400 mb-4">{selected.description}</p>
                )}
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-widest text-gray-500">Tasks</h4>
                  {selected.tasks && selected.tasks.length > 0 ? (
                    selected.tasks.map((task, i) => (
                      <div key={task.id || i} className="flex items-center gap-3 p-3 bg-gray-700/40 rounded-lg">
                        <span className="w-5 h-5 rounded-full border-2 border-gray-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-white truncate block">{task.title}</span>
                          {task.description && (
                            <span className="text-xs text-gray-400 truncate block">{task.description}</span>
                          )}
                        </div>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded flex-shrink-0 ${
                          task.priority === 'high' ? 'bg-red-100 text-red-600' :
                          task.priority === 'medium' ? 'bg-amber-100 text-amber-600' :
                          'bg-green-100 text-green-600'
                        }`}>
                          {task.priority}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm italic">No tasks in this template</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[200px] text-gray-500 text-sm italic">
                Select a template to view its tasks
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
