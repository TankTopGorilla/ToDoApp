# ToDoApp V2 — Refined Product Direction

## Problem Statement

How Might We turn a basic desktop task tracker into a daily productivity companion that combines structured planning (smart lists, recurring tasks) with flow-state tools (kanban, pomodoro) — while keeping it local-first, privacy-respecting, and delightfully styled?

## Recommended Direction: Hybrid — Structured Productivity + Focus & Flow

Build in two phases. **Phase 1** delivers immediate value with minimal schema changes. **Phase 2** adds the visual and experiential hook that makes the app a daily habit.

### Phase 1: Smart Lists & Recurring Tasks (Foundation)

| Feature | What it does | DB change |
|---|---|---|
| **Smart list views** | Today, This Week, Overdue, No Due Date auto-filters | None — new queries only |
| **Quick capture** | Global hotkey (Ctrl+Shift+T) opens a fast-add mini-window | None |
| **Recurring tasks** | "Every Monday", "Daily", "Monthly" — auto-duplicate on completion | Add `recurrence` TEXT column to `tasks` |
| **Data backup** | Export/import all data as JSON | New IPC handler |
| **Overdue highlighting** | Past-due tasks get visual red treatment and badge count | None |

### Phase 2: Kanban + Pomodoro (Visual & Flow)

| Feature | What it does | DB change |
|---|---|---|
| **Toggle view** | Switch between list and kanban (columns: Backlog → To Do → In Progress → Done) | Add `sort_order` INTEGER to `tasks` |
| **Drag-and-drop** | Move cards between kanban columns, reorder within columns | Library: `@dnd-kit/core` |
| **Focus timer** | Click "Focus" on a task → 25-min Pomodoro timer, auto-pause, notification on completion | Add `pomodoro_estimates` columns or a new `sessions` table |
| **Keyboard shortcuts** | `N` new task, `F` toggle focus, `1-4` switch views, `Escape` close modal | None |
| **Task templates** | Save common task setups ("Grocery Run", "Weekly Cleanup") | New `templates` table |

## Key Assumptions to Validate

- [ ] **Phase 1 assumption:** Smart lists + recurring tasks are enough to make the app a daily driver (test by: do I/others open it more than once a day?)
- [ ] **Phase 2 assumption:** Kanban + Pomodoro increase engagement, not clutter (test by: do people switch away from list view?)
- [ ] **Assumption about audience:** Friends/family will actually use a desktop-only task app (vs phone apps they already have)

## MVP Scope (Phase 1)

The minimum version that tests the core assumption:
1. Smart list views (Today, This Week, Overdue, No Due Date)
2. Recurring tasks (simple daily/weekly/monthly cycle)
3. Quick capture global hotkey
4. JSON export/import for backup
5. Overdue task badges

## Not Doing (and Why)

| Not Doing | Why |
|---|---|
| **Cloud sync** | Desktop-only + local-first keeps it simple and private. JSON export serves as manual sync. |
| **Full GTD methodology** | `someday/maybe`, `contexts`, `weekly review mode` add complexity most casual users won't touch. |
| **Habit tracking + streaks** | Out of scope for MVP. Revisit after Phase 2 if the app gains traction. |
| **Tags** | Categories already serve this purpose. Tags would add a junction table for marginal benefit. |
| **Mobile app** | Building a phone app is a whole separate project. The desktop app should be excellent first. |
| **Natural language date input** | "every Monday at 9am" parsing is deceptively hard. Use a simple dropdown selector for recurrence. |
| **Notifications / system tray** | Nice-to-have for Phase 2, but not needed for MVP. |
| **Drag-and-drop in list view** | Only in kanban view (Phase 2). List view uses standard sorting controls. |

## Open Questions

- What exact recurrence patterns are needed? (daily/weekly/monthly/yearly/weekdays?)
- Global quick capture: inject into existing Electron window, or a second mini-window?
- For "sharing with friends/family" — do they need their own separate database, or shared lists?
