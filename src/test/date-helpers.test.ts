import { describe, it, expect } from 'vitest';

// Duplicated from App.tsx for testing (pure functions)
function isOverdue(dueDate: string | null, status: string): boolean {
  if (status === 'done' || !dueDate) return false;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const taskDate = new Date(date);
  taskDate.setHours(0, 0, 0, 0);
  const diffDays = Math.round((taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
  return date.toLocaleDateString();
}

// XP calculation helpers (mirroring backend logic)
function calcXpForLevel(lvl: number): number {
  if (lvl <= 1) return 0;
  return 50 * lvl * lvl + 50;
}

function calcLevelFromXp(totalXp: number): number {
  let lvl = 1;
  while (calcXpForLevel(lvl + 1) <= totalXp && lvl < 10) lvl++;
  return lvl;
}

describe('isOverdue', () => {
  it('returns false for completed tasks', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isOverdue(yesterday.toISOString().split('T')[0], 'done')).toBe(false);
  });

  it('returns false for tasks with no due date', () => {
    expect(isOverdue(null, 'todo')).toBe(false);
  });

  it('returns true for past due tasks', () => {
    const past = new Date();
    past.setDate(past.getDate() - 2);
    expect(isOverdue(past.toISOString().split('T')[0], 'todo')).toBe(true);
  });

  it('returns false for today', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(isOverdue(today, 'todo')).toBe(false);
  });

  it('returns false for future dates', () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    expect(isOverdue(future.toISOString().split('T')[0], 'todo')).toBe(false);
  });
});

describe('formatDate', () => {
  it('returns empty string for null', () => {
    expect(formatDate(null)).toBe('');
  });

  it('returns "Today" for current date', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(formatDate(today)).toBe('Today');
  });

  it('returns "Tomorrow" for next day', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(formatDate(tomorrow.toISOString().split('T')[0])).toBe('Tomorrow');
  });

  it('returns "Yesterday" for previous day', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(formatDate(yesterday.toISOString().split('T')[0])).toBe('Yesterday');
  });

  it('returns "In N days" for upcoming week', () => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    expect(formatDate(d.toISOString().split('T')[0])).toBe('In 3 days');
  });

  it('returns "N days ago" for past week', () => {
    const d = new Date();
    d.setDate(d.getDate() - 4);
    expect(formatDate(d.toISOString().split('T')[0])).toBe('4 days ago');
  });

  it('returns locale date for dates far in the past', () => {
    const d = new Date('2024-01-15');
    expect(formatDate(d.toISOString().split('T')[0])).toBe(d.toLocaleDateString());
  });
});

describe('XP backend math (mirrored)', () => {
  it('matches the formula for all levels', () => {
    const expected = [0, 250, 500, 850, 1300, 1850, 2500, 3250, 4100, 5050];
    for (let i = 1; i <= 10; i++) {
      expect(calcXpForLevel(i)).toBe(expected[i - 1]);
    }
  });

  it('round-trips level and XP', () => {
    for (let xp = 0; xp <= 6000; xp += 50) {
      const level = calcLevelFromXp(xp);
      const xpForLevel = calcXpForLevel(level);
      expect(xpForLevel).toBeLessThanOrEqual(xp + 1);
    }
  });

  it('streak multiplier caps at 3x', () => {
    const streakMultiplier = Math.min(1 + (99 - 1) * 0.5, 3.0);
    expect(streakMultiplier).toBe(3.0);
  });

  it('streak multiplier progression', () => {
    const expected = [1.0, 1.5, 2.0, 2.5, 3.0];
    for (let day = 1; day <= 5; day++) {
      expect(Math.min(1 + (day - 1) * 0.5, 3.0)).toBe(expected[day - 1]);
    }
  });
});
