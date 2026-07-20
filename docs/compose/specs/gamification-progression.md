# ToDoApp Gamification — Progression System

## Problem Statement

How Might We add a lightweight progression system (XP, levels, streaks, unlocks) that makes task completion feel rewarding and reinforces daily productive habits — without feeling like a game that can be exploited or ignored?

## Recommended Direction: Progression System

A three-layer system: **XP** from task actions (add/complete/streaks), **levels** with an RPG-style curve, and **unlockable cosmetics** that tie into the existing theme system. The whole thing lives in the sidebar — visible but unobtrusive — with occasional surprise XP bonuses for delight.

---

## XP Mechanics

| Action | Base XP | Notes |
|---|---|---|
| Add a task | +10 | One-time per task |
| Complete a task | +25 | +40 if high priority |
| Complete a task from an overdue state | +50 | Bonus for catching up |
| Daily streak | ×1.0 → ×1.5 → ×2.0 → ×2.5 → ×3.0 (cap) | All XP multiplied by streak factor |
| Variable reward (~10% chance) | ×2.0 | Random "Productivity Burst!" on task completion |

**Formula:** `XP earned = base × streak_multiplier × (2 if variable_bonus triggered)`

Streak resets if a full day passes with zero completions.

---

## Leveling Curve

RPG-style: fast early, scaling difficulty.

**Formula:** `XP_for_level(N) = 50 × N² + 50`

| Level | XP Required | Cumulative XP |
|---|---|---|
| 1 | 0 | 0 |
| 2 | 200 | 200 |
| 3 | 450 | 650 |
| 4 | 800 | 1,450 |
| 5 | 1,250 | 2,700 |
| 6 | 1,800 | 4,500 |
| 7 | 2,450 | 6,950 |
| 8 | 3,200 | 10,150 |
| 9 | 4,050 | 14,200 |
| 10 | 5,000 | 19,200 |

---

## Title System

Auto-assigned based on current level:

| Levels | Title |
|---|---|
| 1–2 | Apprentice |
| 3–4 | Task Tamer |
| 5–6 | Productivity Pro |
| 7–8 | Focus Master |
| 9–10 | Task Legend |

---

## Level-Up Unlocks (10 tiers)

| Level | Unlock |
|---|---|
| **1** | Default theme options (existing) |
| **2** | "Sunset" accent palette (warm oranges, pinks, coral) |
| **3** | "Midnight" background variant (darker sidebar + main area) |
| **4** | Badge system — small badge icon next to your level in the sidebar |
| **5** | "Ocean" theme set (teal/cyan accents, sea-foam backgrounds) |
| **6** | Sidebar gradient customization (choose your own gradient colors) |
| **7** | "Forest" theme set (green/emerald accents, natural tones) |
| **8** | Custom status emoji — pick an emoji to show next to your title |
| **9** | "Royal" theme set (purple/gold accents, regal backgrounds) |
| **10** | "Pro" density option + all previous unlocks automatically |

Unlocks appear in the existing Theme Settings dialog as new options, gated by level.

---

## Database Changes

**New table: `user_stats`**

```sql
CREATE TABLE IF NOT EXISTS user_stats (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  total_tasks_added INTEGER NOT NULL DEFAULT 0,
  total_tasks_completed INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_active_date TEXT
);
```

Singleton pattern (id = 1) same as `theme_prefs`.

**Modified table: `theme_prefs`**

Add columns for unlocked content:
- `unlocked_themes` TEXT — JSON array of unlocked theme IDs
- `player_title` TEXT — current title override (or NULL for auto)
- `status_emoji` TEXT — emoji shown with player name

---

## IPC Handlers

| Handler | Purpose |
|---|---|
| `stats:get` | Fetch current user_stats row |
| `stats:add-xp` | Add XP, check level-up, update streak, return { new_xp, new_level, leveled_up, unlocked } |
| `stats:get-unlocks` | Return list of unlocked items for the current level |

---

## UI Components

### XP Bar (Sidebar)
- Below the existing stats panel
- Shows: level number + title, XP progress bar, current streak with fire icon
- Compact, glass-styled, matches the sidebar aesthetic

### Level-Up Toast
- When a level-up happens: small celebration overlay (animated confetti or glow) that auto-dismisses after 3 seconds
- Shows: "Level Up! You're now a [Title]!" + new unlock description

### XP Toast
- Small floating "+25 XP" text that appears briefly when XP is earned
- Green for base XP, gold for variable bonus, fire emoji for streak

### Unlocked Themes
- Theme Settings dialog shows locked themes with a lock icon + "Reach Level X" tooltip
- Unlocked themes are selectable normally

---

## Not Doing (and Why)

| Feature | Why |
|---|---|
| **Sound effects** | Would require audio files + could be annoying; visual feedback is enough |
| **Animations beyond subtle toasts** | Too intrusive for a productivity app |
| **Leaderboards / social features** | Requires a backend + user accounts — out of scope |
| **Achievement badges (separate from levels)** | Adds complexity; levels already serve as the progression signal |
| **Negative XP / level loss** | Would feel punishing and discourage app use |
| **Real-money rewards** | Out of scope for a free personal tool |
| **Data sync for cross-device stats** | Local-first, same as the rest of the app |

---

## Open Questions

- Should XP for completed tasks be awarded when the checkbox is toggled, or should there be a daily "claim" mechanic?
- Should the streak consider "any task completion" or "at least one task per day"?
- What happens to unlocked themes if the database is cleared — should they be re-granted based on current level?
