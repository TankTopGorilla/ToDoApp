# UI Enhancement — Glassmorphism, Motion & Typography Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevate the ToDoAppV2 UI by applying consistent motion, depth, and typography/spacing refinements across all components using a design-token-first approach in ThemeSettings.css.

**Architecture:** Extend the existing CSS variable token system in `src/electron/renderer/ThemeSettings.css` with motion, depth, and typography tokens. Then wire each component (TaskCard → Sidebar/App → Modals → ThemeSettings) to use these tokens, replacing hardcoded values. Add animation keyframes to App.css. Preserve existing glassmorphism gradient and component architecture.

**Tech Stack:** React + TypeScript + Tailwind CSS v4.3.0 + CSS custom properties

## Global Constraints

- Maintain Frutiger Aero/Windows Vista glassmorphism aesthetic
- Preserve existing gradient background (#00f2fe → #4facfe → #43e97b)
- All new visual values go through CSS variables in ThemeSettings.css — no magic numbers in components
- No new npm dependencies
- Do NOT restructure component architecture or file layout

---

### Task 1: Design Token Foundation

**Covers:** [S1]

**Files:**
- Modify: `src/electron/renderer/ThemeSettings.css:1-37`

**Interfaces:**
- Produces: CSS variables `--transition-fast`, `--transition-normal`, `--transition-slow`, `--shadow-card`, `--shadow-modal`, `--blur-modal`, `--blur-sidebar`, `--text-heading`, `--text-body`, `--text-caption`, `--leading-relaxed`, `--radius-card`, `--radius-modal`

- [ ] **Step 1: Add motion, depth, and typography tokens to ThemeSettings.css**

Replace the entire file content:

```css
/* ThemeSettings.css - Dynamic Glassmorphism Tokens */

:root {
  /* Glassmorphism */
  --glass-blur: 8px;
  --neon-glow: hsl(180, 70%, 60%);
  --glass-opacity: 0.15;
  --button-focus-glow: rgba(0, 150, 255, 0.3);
  --card-hover-shadow: rgba(0, 120, 255, 0.2);
  --modal-bg: hsl(200, 85%, 95%);
  --aero-btn-gradient: linear-gradient(135deg, hsl(180, 80%, 60%) 0%, hsl(180, 90%, 60%) 100%);

  /* Motion */
  --transition-fast: 150ms ease-out;
  --transition-normal: 250ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 400ms cubic-bezier(0.4, 0, 0.2, 1);

  /* Depth */
  --shadow-card: 0 4px 20px rgba(0, 120, 255, 0.2);
  --shadow-modal: 0 16px 48px rgba(0, 0, 0, 0.3);
  --blur-modal: 20px;
  --blur-sidebar: 24px;

  /* Typography */
  --text-heading: 1.25rem;
  --text-body: 0.875rem;
  --text-caption: 0.75rem;
  --leading-relaxed: 1.625;

  /* Spacing */
  --radius-card: 2rem;
  --radius-modal: 1rem;
}

.aero-btn {
  background: var(--aero-btn-gradient);
  box-shadow: 0 0 10px var(--button-focus-glow);
  transition: box-shadow var(--transition-fast);
}

.aero-btn:active {
  box-shadow: 0 0 15px var(--button-focus-glow);
}

.task-card:hover {
  box-shadow: var(--shadow-card);
  transform: scale(1.02);
}

.glass-panel {
  backdrop-filter: blur(var(--glass-blur));
  opacity: var(--glass-opacity);
}

.theme-modals {
  backdrop-filter: blur(10px);
  border-radius: var(--radius-modal);
  opacity: 0.15;
}
```

- [ ] **Step 2: Verify — run TypeScript typecheck**

```
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/electron/renderer/ThemeSettings.css
git commit -m "feat: add motion, depth, and typography design tokens to ThemeSettings.css"
```

---

### Task 2: Animation Keyframes and Glassmorphism Depth

**Covers:** [S1, S2]

**Files:**
- Modify: `src/electron/renderer/App.css:1-75`

**Interfaces:**
- Consumes: `--transition-normal`, `--transition-slow`, `--shadow-card`, `--blur-sidebar` from Task 1
- Produces: `@keyframes slideUp`, `@keyframes fadeIn`, `@keyframes scaleIn`, refined `.glass-panel`, `.glass-panel-dark`, `.aero-btn`, `.aero-selected` using token variables

- [ ] **Step 1: Add animation keyframes and token-based glass classes to App.css**

After the existing `body { ... }` block and before `.glass-panel`, add animation keyframes. Then refine existing glass classes to use token variables. The complete file becomes:

```css
@import "tailwindcss";
@source "../src/**/*.tsx";

/* 1. Frutiger Aero Vibrant Background */
body {
  background: radial-gradient(circle at 0% 0%, #00f2fe 0%, #4facfe 50%, #43e97b 100%);
  background-attachment: fixed;
  background-size: cover;
  margin: 0;
  padding: 0;
  height: 100vh;
  overflow: hidden;
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
}

/* 1.5 Animation Keyframes */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes glowPulse {
  0%, 100% { filter: drop-shadow(0 0 6px rgba(250, 204, 21, 0.6)); }
  50% { filter: drop-shadow(0 0 14px rgba(250, 204, 21, 1)); }
}

/* 2. Aero Glass Panel Effect (For Sidebar and Modals) */
.glass-panel {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: var(--shadow-card);
  border-radius: var(--radius-card);
}

/* Dark Glass (For the Left Sidebar) */
.glass-panel-dark {
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(var(--blur-sidebar));
  -webkit-backdrop-filter: blur(var(--blur-sidebar));
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: inset -1px 0 10px rgba(255, 255, 255, 0.05);
}

/* 3. Custom Selected Item Glow Effect */
.aero-selected {
  background: rgba(0, 102, 255, 0.3);
  border: 1px solid rgba(0, 163, 255, 0.8);
  box-shadow: 0 0 15px rgba(0, 163, 255, 0.6), inset 0 0 10px rgba(0, 163, 255, 0.4);
}

/* 4. Button Glow (High-gloss) */
.aero-btn {
  background: linear-gradient(180deg, #00A3FF 0%, #0066FF 100%);
  box-shadow: inset 0 2px 4px rgba(255, 255, 255, 0.4), 0 4px 10px rgba(0, 102, 255, 0.4);
  border: 1px solid #005ce6;
  transition: box-shadow var(--transition-fast), transform var(--transition-fast);
}

.aero-btn:hover {
  background: linear-gradient(180deg, #33b5ff 0%, #005ce6 100%);
  box-shadow: inset 0 2px 4px rgba(255, 255, 255, 0.6), 0 4px 15px rgba(0, 102, 255, 0.6);
  transform: translateY(-1px);
}

.aero-btn:active {
  transform: translateY(0);
}

/* Custom Scrollbar for Aero Feel */
::-webkit-scrollbar {
  width: 10px;
}

::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  border: 2px solid transparent;
  background-clip: content-box;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
```

- [ ] **Step 2: Verify — run TypeScript typecheck**

```
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/electron/renderer/App.css
git commit -m "feat: add animation keyframes and refine glass classes with design tokens"
```

---

### Task 3: TaskCard Component — Motion, Depth & Typography

**Covers:** [S2]

**Files:**
- Modify: `src/electron/renderer/components/TaskCard.tsx:1-168`

**Interfaces:**
- Consumes: `--transition-normal`, `--transition-fast`, `--shadow-card`

- [ ] **Step 1: Apply motion, depth, and typography to TaskCard**

Replace the className strings in the TaskCard component:

```tsx
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
    <div
      className={`task-card transition-all duration-[var(--transition-normal)]${
        isDone ? ' done' : ''
      }`}
      style={{ borderRadius: 'var(--radius-card)' }}
    >
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
          className={`z-10 p-2 transition-all duration-[var(--transition-fast)] hover:scale-110${
            task.is_favorite === 1 ? ' animate-[glowPulse_2s_ease-in-out_infinite]' : ''
          }`}
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

        <span
          className={`task-title text-[var(--text-heading)]${
            isDone ? ' done-title' : ''
          }`}
        >
          {task.title}
        </span>
      </div>

      {task.description ? (
        <p className="task-description text-[var(--text-body)] leading-[var(--leading-relaxed)]">{task.description}</p>
      ) : null}

      <div className="task-meta">
        <span className={`badge ${PRIORITY_COLORS[task.priority]} text-[var(--text-caption)]`}>
          {PRIORITY_LABELS[task.priority]}
        </span>

        <span className={`badge ${STATUS_COLORS[task.status]} text-[var(--text-caption)]`}>
          {STATUS_LABELS[task.status]}
        </span>

        {task.due_date ? (
          <span className="badge bg-slate-700/60 text-slate-300 text-[var(--text-caption)]">
            {new Date(task.due_date).toLocaleDateString()}
          </span>
        ) : null}

        {task.category_name ? (
          <span
            className="badge text-[var(--text-caption)]"
            style={{
              backgroundColor: `${task.category_color ?? '#6366f1'}30`,
              color: task.category_color ?? '#ffffff',
            }}
          >
            {task.category_name}
          </span>
        ) : null}
      </div>

      <div className="task-actions opacity-0 group-hover/task-card:opacity-100 transition-opacity duration-[var(--transition-fast)]">
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
```

- [ ] **Step 2: Verify — run TypeScript typecheck**

```
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/electron/renderer/components/TaskCard.tsx
git commit -m "feat: add motion, depth, and typography refinements to TaskCard"
```

---

### Task 4: App Layout — Sidebar & Header

**Covers:** [S2]

**Files:**
- Modify: `src/electron/renderer/App.tsx:160-310` (sidebar section + header)

**Interfaces:**
- Consumes: `--transition-normal`, `--transition-fast`, `--text-heading`, `--text-body`, `--text-caption`

- [ ] **Step 1: Apply motion and typography to sidebar and header**

The sidebar and header in App.tsx already have good Tailwind classes. Add CSS variable references and transition improvements to key elements.

In the **sidebar `<aside>`** section (around line 160-220):
- Replace `text-lg` with `text-[var(--text-heading)]` on section labels
- Replace `text-sm` with `text-[var(--text-body)]` on nav items
- Add `transition-all duration-[var(--transition-fast)]` to sidebar navigation buttons
- Add increasing animation on stat cards in the stats panel

In the **header section** (around line 260-310):
- Add `transition-all duration-[var(--transition-normal)]` to search input for smooth expand
- Add `text-[var(--text-heading)]` to the title element
- Ensure the New Task aero-btn already references token styles (it uses the `aero-btn` class from App.css)

Specific edits to `src/electron/renderer/App.tsx`:

**Sidebar stat cards** — add animation on load:
```tsx
// Find the stat cards in the sidebar stats panel and add:
// className="... animate-[scaleIn_var(--transition-normal)_both]"
```

**Sidebar nav buttons** — add consistent transitions:
```tsx
// On each sidebar filter button, ensure:
// className includes "transition-all duration-[var(--transition-fast)]"
```

**Search input** — add smooth width expansion:
```tsx
// On the search input in header:
<input
  type="text"
  placeholder="Search tasks..."
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  className="... transition-all duration-[var(--transition-normal)] focus:w-[350px] w-[300px]"
/>
```

- [ ] **Step 2: Verify — run TypeScript typecheck**

```
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/electron/renderer/App.tsx
git commit -m "feat: add motion and typography refinements to sidebar and header"
```

---

### Task 5: Modal Components — Animation & Depth

**Covers:** [S2]

**Files:**
- Modify: `src/electron/renderer/components/TaskModal.tsx:69-227`
- Modify: `src/electron/renderer/components/CategoryManager.tsx:92-213`

**Interfaces:**
- Consumes: `--transition-normal`, `--transition-fast`, `--blur-modal`, `--shadow-modal`, `--radius-modal`, `--text-heading`, `--text-body`, `--text-caption`, `--leading-relaxed`

- [ ] **Step 1: Apply glassmorphism depth and motion to TaskModal**

On the overlay `div` and modal `div` in TaskModal.tsx:

```tsx
// Overlay (line 69):
<div
  className="fixed inset-0 z-50 flex items-center justify-center"
  style={{
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(var(--blur-modal))',
    animation: 'fadeIn var(--transition-fast) both',
  }}
  onClick={onClose}
>

// Modal container (line 71):
<div
  style={{
    background: 'rgba(30, 41, 59, 0.85)',
    borderRadius: 'var(--radius-modal)',
    boxShadow: 'var(--shadow-modal)',
    border: '1px solid rgba(255,255,255,0.1)',
    backdropFilter: 'blur(12px)',
    animation: 'slideUp var(--transition-normal) both',
  }}
  className="p-6 w-full max-w-md"
  onClick={(event) => event.stopPropagation()}
  role="dialog"
  aria-modal="true"
>
```

Also on modal form elements:
- Labels: `text-[var(--text-caption)]`
- Inputs/selects: Add `transition: border-color var(--transition-fast)` via style
- Submit button: Use `aero-btn` class from App.css

```tsx
// Submit button (line 221):
<button type="submit" className="aero-btn px-4 py-2 text-white">
  {task ? 'Save Changes' : 'Add Task'}
</button>

// Cancel button (line 214):
<button
  type="button"
  className="px-4 py-2 text-gray-300 hover:text-white border border-gray-600 rounded-lg hover:bg-gray-700"
  style={{ transition: 'all var(--transition-fast)' }}
  onClick={onClose}
>
  Cancel
</button>
```

- [ ] **Step 2: Apply same treatment to CategoryManager**

Same pattern — overlay + modal div get backdrop-blur, fadeIn/slideUp animations, and aero-btn on action buttons:

```tsx
// Overlay (line 92):
<div
  className="fixed inset-0 z-50 flex items-center justify-center"
  style={{
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(var(--blur-modal))',
    animation: 'fadeIn var(--transition-fast) both',
  }}
  onClick={onClose}
>

// Modal container (line 94):
<div
  style={{
    background: 'rgba(30, 41, 59, 0.85)',
    borderRadius: 'var(--radius-modal)',
    boxShadow: 'var(--shadow-modal)',
    border: '1px solid rgba(255,255,255,0.1)',
    backdropFilter: 'blur(12px)',
    animation: 'slideUp var(--transition-normal) both',
  }}
  className="p-6 w-full max-w-2xl"
  onClick={(event) => event.stopPropagation()}
  role="dialog"
  aria-modal="true"
>
```

Button updates:
```tsx
// Add Category button (line 159):
<button type="submit" className="aero-btn w-full px-4 py-2 text-white">
  Add Category
</button>
```

- [ ] **Step 3: Verify — run TypeScript typecheck**

```
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/electron/renderer/components/TaskModal.tsx src/electron/renderer/components/CategoryManager.tsx
git commit -m "feat: add glassmorphism depth and entry animations to modals"
```

---

### Task 6: Verify & Cleanup

**Covers:** [S4]

**Files:**
- Verify: `src/electron/renderer/ThemeSettings.css` (tokens present)
- Verify: `src/electron/renderer/App.css` (animations present)
- Verify: `src/electron/renderer/components/TaskCard.tsx` (motion/depth/typography applied)
- Verify: `src/electron/renderer/App.tsx` (sidebar/header enhanced)
- Verify: `src/electron/renderer/components/TaskModal.tsx` (modal glassmorphism)
- Verify: `src/electron/renderer/components/CategoryManager.tsx` (modal glassmorphism)

- [ ] **Step 1: Run full TypeScript typecheck**

```
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 2: Run Vite build to verify CSS compiles**

```
npx vite build
```
Expected: build succeeds, no CSS errors

- [ ] **Step 3: Final git status check**

```
git status
```
Expected: clean working tree (all changes committed)

- [ ] **Step 4: Verify the design constraints are met**

Confirm:
- Gradient background preserved (`#00f2fe → #4facfe → #43e97b` in App.css body rule)
- No new npm dependencies added (check `git diff package.json`)
- All new visual values use CSS variables from ThemeSettings.css
- Component architecture unchanged (same files, same exports)
