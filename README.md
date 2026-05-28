# ToDoApp

A visually stunning, desktop task management application built with **Electron**, **React**, **TypeScript**, and **SQLite**. Featuring a **Frutiger Aero / Windows Vista–era glassmorphism** design language, ToDoApp delivers a modern task management experience wrapped in a nostalgic yet polished aesthetic.

> Built with ❤️ by Berke

---

## 📸 App Screenshots

![Home Screen](screenshots/1.png)

![Adding New Tasks](screenshots/2.png)

![Manage Categories](screenshots/3.png)


## Features

### Core Task Management

- **Full CRUD Operations** — Create, read, update, and delete tasks with a clean, responsive interface.
- **Priority Levels** — Assign Low, Medium, or High priority to tasks. Tasks are automatically sorted by priority within their status group.
- **Status Tracking** — Track tasks through three states: To Do, In Progress, and Done. Click the circular checkbox to toggle instantly between To Do and Done.
- **Due Dates** — Attach optional due dates via a native date picker.
- **Rich Descriptions** — Add detailed descriptions to each task for context and notes.

### Organization & Filtering

- **Categories** — Create custom categories with unique color labels. Assign tasks to categories for structured organization. Manage categories (rename, recolor, delete) through a dedicated modal.
- **Status Filters** — Sidebar navigation filters: All, To Do, In Progress, Completed — each with live task counts.
- **Category Filters** — Filter tasks by any category from the sidebar, showing only tasks belonging to that group.
- **Smart Filters** — A header dropdown providing quick-access filters:
  - **All Tasks** — Default view
  - **High Priority** — Focus on urgent items
  - **Favorites** — Show only starred tasks
- **Search** — Real-time text search across task titles with instant filtering as you type.

### Favorites System

- **Star Any Task** — Click the star icon on any task card to mark it as a favorite.
- **Filled/Empty States** — Visual toggle: glowing gold star (⭐) when favorited, outline star (☆) when not.
- **Favorites Filter** — The smart filter menu lets you instantly isolate all favorited tasks.
- **Persistent Storage** — Favorite state is saved to SQLite via IPC and survives app restarts.

### Theme System

- **Light / Dark Mode** — Switch between themes with persisted preference.
- **Density Options** — Choose between Compact, Comfortable, or Spacious UI density.
- **Accent Color** — Customize the accent color with a hex picker or color wheel. A live preview card shows the effect before applying.
- **Persistent Preferences** — All theme settings are stored in SQLite and preserved across sessions.

### Statistics Dashboard

Located in the sidebar, the stats panel displays:
- **Completed** — Total number of done tasks
- **High Priority** — Count of high-priority items still active
- **Categorized** — Number of tasks assigned to a category

---

## UI / UX Design

### Aero Glass (Frutiger Aero) Aesthetic

The interface is deliberately styled after the **Windows Vista / 7 Aero Glass** era — a design trend sometimes called **Frutiger Aero** characterized by glossy, translucent surfaces and vibrant gradients:

| Element | Technique |
|---------|-----------|
| **Background** | Radial gradient spanning cyan, blue, and green (`#00f2fe` → `#4facfe` → `#43e97b`) |
| **Panels** | `backdrop-filter: blur(16px)` glass effect with semi-transparent backgrounds |
| **Sidebar** | Dark translucent glass panel with subtle inset shadow and border glow |
| **Selected Items** | Neon cyan glow (`box-shadow` + `border`) with `rgba(0, 163, 255, 0.6)` aura |
| **Buttons** | Linear gradient with inset highlight, mimicking glossy plastic |
| **Stars** | SVG star icons with CSS `drop-shadow` glow for the filled state |
| **Scrollbar** | Custom thin scrollbar with translucent thumb matching the glass theme |

The result is a UI that feels simultaneously retro and premium — translucent panels layered over a vibrant gradient backdrop, with glossy controls and glowing selection states.

### Animations & Transitions

- Task cards scale subtly on hover (`scale(1.01)`) with shadow elevation
- Edit/delete action buttons fade in on card hover (`opacity-0 group-hover:opacity-100`)
- Modals animate with `slideUp` (translateY + fadeIn) cubic-bezier easing
- Category and status badges have smooth color transitions
- Star icon scales up on hover (`hover:scale-110`)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Desktop Shell** | Electron 34 |
| **UI Framework** | React 18.3 |
| **Language** | TypeScript 5.5 (strict mode, throughout both processes) |
| **Bundler** | Vite 5.4 (React plugin, dev server with HMR) |
| **Styling** | Tailwind CSS 4.3 + PostCSS + Autoprefixer |
| **Database** | better-sqlite3 12.10 (synchronous, zero-config SQLite) |
| **Font** | Inter (via Google Fonts) |
| **Build / Packaging** | electron-builder (Windows portable target) |
| **Concurrency** | concurrently + wait-on (dev workflow orchestration) |

### Why better-sqlite3?

Unlike its asynchronous counterparts, `better-sqlite3` runs synchronously on the main thread, which simplifies the IPC handler code — no callback chaining or async orchestration needed for database operations. The `journal_mode = DELETE` pragma ensures maximum filesystem compatibility (avoids WAL-mode issues on network drives and certain Windows configurations).

---

## Architecture

### Process Model

```
┌─────────────────────────────────────────────────────┐
│                 Electron Application                 │
│                                                      │
│  ┌─────────────────┐         ┌───────────────────┐  │
│  │   Main Process   │◄──IPC──►│  Renderer Process  │  │
│  │  (main.ts)       │         │  (Vite + React)    │  │
│  │                   │         │                     │  │
│  │  • db.ts          │         │  • App.tsx          │  │
│  │  • ipcHandlers.ts │         │  • TaskCard.tsx     │  │
│  │  • preload.ts     │         │  • TaskModal.tsx    │  │
│  └─────────────────┘         └───────────────────┘  │
└─────────────────────────────────────────────────────┘
```

The application follows Electron's standard **two-process architecture**:

**Main Process** (`electron/`) — Node.js environment responsible for:
- Window creation and lifecycle management
- SQLite database initialization and operations
- IPC handler registration (13 handlers across tasks, categories, and themes)
- File system access

**Renderer Process** (`src/electron/renderer/`) — Chromium environment running:
- React component tree (SPA rendered by Vite)
- All UI logic and state management
- Access to Electron APIs only through the preload bridge

### IPC Bridge (Security)

Communication between processes goes through a **contextBridge** (`preload.ts`), which exposes a secure `window.electronAPI` object. This follows Electron security best practices:

- `contextIsolation: true` — Renderer cannot access Node.js or Electron APIs directly
- `nodeIntegration: false` — No `require()` in the renderer
- `sandbox: false` — Allows better-sqlite3 native module (required)
- `webSecurity: true` — Standard web security enforced

The exposed API surface is explicit and minimal — exactly 10 methods covering system info, tasks CRUD, categories CRUD, and theme prefs CRUD.

### Component Tree

```
<App>
  ├── <aside> — Left Sidebar (glass-panel-dark)
  │   ├── Logo / Branding
  │   ├── Status Filters (All, To Do, In Progress, Done)
  │   ├── Category Filters (All + dynamic list)
  │   └── Stats Panel
  ├── <main> — Main Content Area (light glass)
  │   ├── Header
  │   │   ├── Title + Count
  │   │   ├── Search Input
  │   │   ├── Smart Filter Dropdown (All / High Priority / Favorites)
  │   │   └── New Task Button (aero-btn)
  │   └── Task List (displayedTasks.map)
  │       └── Task Cards (inline, with status toggle, favorite star, details, actions)
  ├── <TaskModal> — Create/Edit task overlay
  └── <CategoryManager> — Category CRUD overlay
```

Note: `TaskCard.tsx` and `TaskList.tsx` components exist as reusable abstractions within the component library but the primary App renders tasks inline for maximum layout control. Both are available for alternative rendering strategies.

### Data Flow

```
User clicks ★
  → handleToggleFavorite(task)
    → window.electronAPI.updateTask({ id, is_favorite })
      → IPC: renderer → main (tasks:update)
        → SQL: UPDATE tasks SET is_favorite = ?, updated_at = datetime('now') WHERE id = ?
        → SQL: SELECT t.*, c.* FROM tasks ... (fetchTaskById)
      ← IPC: main → renderer (updated task row)
    → loadTasks()
      → window.electronAPI.getTasks()
        → IPC: renderer → main (tasks:get-all)
          → SQL: SELECT ... FROM tasks t LEFT JOIN categories c ...
        ← IPC: main → renderer (full task list)
    → setTasks(result)
      → React re-render ♻
```

All state mutations follow this **update → reload → re-render** cycle. After any write operation (create, update, delete, favorite toggle, status toggle), the app re-fetches the full task list from SQLite, ensuring UI and database are always in sync.

---

## Database Schema

### `tasks` Table

```sql
CREATE TABLE IF NOT EXISTS tasks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  due_date    TEXT,
  priority    TEXT NOT NULL DEFAULT 'medium'
              CHECK(priority IN ('low', 'medium', 'high')),
  status      TEXT NOT NULL DEFAULT 'todo'
              CHECK(status IN ('todo', 'in-progress', 'done')),
  category_id INTEGER,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### `categories` Table

```sql
CREATE TABLE IF NOT EXISTS categories (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#6366f1'
);
```

### `theme_prefs` Table

```sql
CREATE TABLE IF NOT EXISTS theme_prefs (
  id           INTEGER PRIMARY KEY CHECK (id = 1),
  mode         TEXT NOT NULL DEFAULT 'dark'
               CHECK(mode IN ('light', 'dark')),
  accent_color TEXT NOT NULL DEFAULT '#6366f1',
  density      TEXT NOT NULL DEFAULT 'comfortable'
               CHECK(density IN ('compact', 'comfortable', 'spacious'))
);
```

The database is stored at `%APPDATA%/ToDoApp/tasks.db` (Windows) or equivalent userData directory. The `DELETE` journal mode is used instead of WAL for maximum cross-filesystem compatibility.

---

## Project Structure

```
ToDoApp/
├── electron/                          # Main process (Node.js)
│   ├── main.ts                        # App entry, window creation, lifecycle
│   ├── db.ts                          # SQLite init, schema, connection singleton
│   ├── ipcHandlers.ts                 # All 13 IPC handlers (tasks, categories, themes)
│   ├── preload.ts                     # contextBridge security layer
│   └── tsconfig.json                  # TypeScript config for main process
│
├── src/                               # Renderer process (React + Vite)
│   ├── electron/renderer/
│   │   ├── index.html                 # HTML template (Inter font)
│   │   ├── main.tsx                   # React DOM entry
│   │   ├── App.tsx                    # Main application component
│   │   ├── App.css                    # Tailwind import + Aero glass styles
│   │   ├── vite-env.d.ts             # Vite + window.electronAPI types
│   │   └── components/
│   │       ├── TaskCard.tsx           # Task card component
│   │       ├── TaskList.tsx           # Task list component
│   │       ├── TaskModal.tsx          # Create/Edit task modal
│   │       ├── CategoryManager.tsx    # Category CRUD modal
│   │       ├── ThemeSettings.tsx      # Theme settings modal
│   │       └── ThemeSettings.css      # Theme settings styles + animations
│   └── types/
│       └── task.ts                    # Shared TypeScript types & constants
│
├── ui-tui/                            # (Reserved for future TUI interface)
├── release/                           # electron-builder output
├── dist/                              # Vite build output
├── dist-electron/                     # TypeScript compiled main process
│
├── package.json                       # Dependencies, scripts, electron-builder config
├── tsconfig.json                      # Renderer TypeScript config
├── vite.config.ts                     # Vite configuration (base: './', port 5173)
├── postcss.config.js                  # PostCSS: Tailwind + Autoprefixer
├── tailwind.config.js                 # Tailwind content paths
├── electron.d.ts                      # Global type declarations for Window.electronAPI
├── PROJECT_GOAL.txt                   # Project objectives
└── README.md                          # This file
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 9+

### Installation

```bash
# Clone the repository
git clone https://github.com/TankTopGorilla/ToDoApp.git
cd ToDoApp

# Install dependencies
npm install

# Rebuild native modules (better-sqlite3 for your Electron version)
npm run rebuild
```

### Development

```bash
# Run in development mode (Vite HMR + Electron)
npm run electron:dev
```

This runs two processes concurrently:
1. **Vite dev server** on `http://localhost:5173` with hot module replacement
2. **Electron** window loading from the dev server, with DevTools auto-open

Changes to React components hot-reload instantly. Changes to Electron main process files require a restart.

### Building for Production

```bash
# Build the full Windows portable executable
npm run electron:build
```

Output: `release/ToDoApp Setup.exe` (Windows portable — no installer needed, runs standalone).

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev:renderer` | Start Vite dev server only |
| `npm run build:renderer` | Type-check + Vite production build |
| `npm run build:electron` | Compile main process TypeScript (to `dist-electron/`) |
| `npm run electron:dev` | Full dev mode (Vite + Electron, concurrent) |
| `npm run electron:build` | Full production build + Windows packaging |
| `npm run rebuild` | Rebuild native modules (better-sqlite3) |
| `npm run postinstall` | Auto-rebuild native modules after install |

---

## Development Notes

### Type Safety

TypeScript strict mode is enabled throughout. Shared types live in `src/types/task.ts` and are referenced by both processes. The `electron.d.ts` file augments the global `Window` interface with fully typed `electronAPI` method signatures, providing IntelliSense and compile-time checking for IPC calls in the renderer.

### IPC Handler Pattern

All handlers follow a consistent pattern:

```typescript
ipcMain.handle('resource:action', async (_event, payload) => {
  try {
    const db = getDb();
    // ... database operation ...
    return result;
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
});
```

Error results are discriminated by the `error` key, allowing the renderer to distinguish success from failure with a type guard:

```typescript
function isErrorResult(value: unknown): value is { error: string } {
  return typeof value === 'object' && value !== null && 'error' in value;
}
```

### Event Propagation

Interactive elements inside task cards (favorite star, status checkbox, edit/delete buttons) use `e.stopPropagation()` and `e.preventDefault()` within their onClick handlers to prevent accidental bubbling. When a card or parent element has additional click behavior (e.g., opening a detail modal), this isolation is critical.

### Defensive Data Handling

The `is_favorite` field uses `task.is_favorite || 0` before comparison to guard against `undefined` values that can arise from schema migrations, cached builds, or partial data. This prevents the star from getting stuck in an off state because `undefined === 1` is always `false`.

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Ensure TypeScript compiles clean (`npx tsc --noEmit`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Style

- TypeScript strict mode enforced
- Prefer `async/await` over raw promises
- Use discriminated union error handling (`{ error: string }`)
- IPC handler names follow the `resource:action` convention
- SQL queries use named parameters (`@param`) over positional (`?`) for clarity in complex statements
- Component props should be explicitly typed via `interface`

---

## License

This project is open source. Feel free to use, modify, and distribute.

---

## Acknowledgments

- **Frutiger Aero aesthetic** — Inspired by the late-2000s Windows Vista / 7 design language with its glossy glass surfaces and vibrant gradients
- **Tailwind CSS** — Utility-first CSS framework enabling rapid UI development
- **Vite** — Blazing-fast dev server and build tooling
- **Electron** — Cross-platform desktop application framework
- **better-sqlite3** — Synchronous SQLite3 binding for Node.js
