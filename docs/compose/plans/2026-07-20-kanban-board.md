# Kanban Board Implementation Plan

**Goal:** Add a kanban board view with drag-and-drop task management alongside the existing list view.

**Architecture:** Single `KanbanBoard.tsx` component using `@dnd-kit/core` + `@dnd-kit/sortable` for drag-and-drop. Three columns (To Do, In Progress, Done) map to existing statuses. Toggle between list and kanban via a button in the header. A `sort_order` column in the DB preserves manual ordering within columns.

**Tech Stack:** React, @dnd-kit/core, @dnd-kit/sortable, better-sqlite3

## Files

| File | Action | Purpose |
|---|---|---|
| `electron/db.ts` | Modify | Add `sort_order` INTEGER column to tasks |
| `electron/ipcHandlers.ts` | Modify | New `tasks:update-order` handler for bulk reorder |
| `electron/preload.ts` | Modify | Expose `updateTaskOrder` API |
| `src/types/task.ts` | Modify | Add `sort_order` to Task type |
| `src/electron/renderer/vite-env.d.ts` | Modify | Add `updateTaskOrder` type |
| `src/electron/renderer/components/KanbanBoard.tsx` | Create | Main kanban board with drag-and-drop |
| `src/electron/renderer/App.tsx` | Modify | View toggle, render KanbanBoard conditionally |
| `package.json` | Modify | Add @dnd-kit dependencies |

---

### T2: Install @dnd-kit and add sort_order to DB

- [ ] Install @dnd-kit packages
- [ ] Add `sort_order` column to tasks table in db.ts
- [ ] Add `sort_order` to Task type in task.ts
- [ ] Add `tasks:update-order` IPC handler
- [ ] Add `updateTaskOrder` to preload.ts and vite-env.d.ts
- [ ] TypeScript check

### T3: Create KanbanBoard component

- [ ] Build KanbanBoard with @dnd-kit DndContext + SortableContext
- [ ] Three columns: To Do, In Progress, Done
- [ ] Drag-and-drop between columns (updates status + sort_order)
- [ ] Auto-save on drop via IPC

### T4: Wire up App.tsx

- [ ] Add `viewMode` state ('list' | 'kanban')
- [ ] Add toggle button in header
- [ ] Render KanbanBoard or TaskList based on viewMode
- [ ] Pass categories data for category-colored dots on cards
