import { describe, it, expect } from 'vitest';
import {
  getTitleForLevel,
  getUnlocksForLevel,
  getXpForLevel,
  getLevelFromXp,
  LEVEL_TITLES,
  LEVEL_UNLOCKS,
} from '../types/task';

describe('getTitleForLevel', () => {
  it('returns Apprentice for levels 1-2', () => {
    expect(getTitleForLevel(1)).toBe('Apprentice');
    expect(getTitleForLevel(2)).toBe('Apprentice');
  });

  it('returns Task Tamer for levels 3-4', () => {
    expect(getTitleForLevel(3)).toBe('Task Tamer');
    expect(getTitleForLevel(4)).toBe('Task Tamer');
  });

  it('returns Productivity Pro for levels 5-6', () => {
    expect(getTitleForLevel(5)).toBe('Productivity Pro');
    expect(getTitleForLevel(6)).toBe('Productivity Pro');
  });

  it('returns Focus Master for levels 7-8', () => {
    expect(getTitleForLevel(7)).toBe('Focus Master');
    expect(getTitleForLevel(8)).toBe('Focus Master');
  });

  it('returns Task Legend for levels 9-10', () => {
    expect(getTitleForLevel(9)).toBe('Task Legend');
    expect(getTitleForLevel(10)).toBe('Task Legend');
  });

  it('clamps out-of-range levels', () => {
    expect(getTitleForLevel(0)).toBe('Apprentice');
    expect(getTitleForLevel(99)).toBe('Task Legend');
    expect(getTitleForLevel(-5)).toBe('Apprentice');
  });

  it('has all expected title keys', () => {
    const keys = Object.keys(LEVEL_TITLES).map(Number);
    expect(keys).toContain(1);
    expect(keys).toContain(10);
    // Every level 1-10 should have a title
    for (let i = 1; i <= 10; i++) {
      expect(getTitleForLevel(i)).toBeTruthy();
    }
  });
});

describe('getUnlocksForLevel', () => {
  it('returns no unlocks for level 1', () => {
    expect(getUnlocksForLevel(1)).toEqual([]);
  });

  it('returns sunset palette at level 2', () => {
    const unlocks = getUnlocksForLevel(2);
    expect(unlocks).toContain('palette-sunset');
  });

  it('returns midnight background at level 3', () => {
    const unlocks = getUnlocksForLevel(3);
    expect(unlocks).toContain('palette-sunset');
    expect(unlocks).toContain('bg-midnight');
  });

  it('returns ocean theme at level 5', () => {
    const unlocks = getUnlocksForLevel(5);
    expect(unlocks).toContain('palette-sunset');
    expect(unlocks).toContain('bg-midnight');
    expect(unlocks).toContain('theme-ocean');
  });

  it('returns forest theme at level 7', () => {
    const unlocks = getUnlocksForLevel(7);
    expect(unlocks).toContain('theme-forest');
  });

  it('returns royal theme at level 9', () => {
    const unlocks = getUnlocksForLevel(9);
    expect(unlocks).toContain('theme-royal');
  });

  it('returns everything at level 10', () => {
    const unlocks = getUnlocksForLevel(10);
    expect(unlocks).toContain('palette-sunset');
    expect(unlocks).toContain('bg-midnight');
    expect(unlocks).toContain('theme-ocean');
    expect(unlocks).toContain('theme-forest');
    expect(unlocks).toContain('theme-royal');
    expect(unlocks).toContain('density-pro');
  });

  it('cumulative unlocks increase with level', () => {
    const l1 = getUnlocksForLevel(1).length;
    const l3 = getUnlocksForLevel(3).length;
    const l5 = getUnlocksForLevel(5).length;
    const l10 = getUnlocksForLevel(10).length;

    expect(l3).toBeGreaterThan(l1);
    expect(l5).toBeGreaterThan(l3);
    expect(l10).toBeGreaterThan(l5);
  });
});

describe('getXpForLevel', () => {
  it('returns 0 for level 1', () => {
    expect(getXpForLevel(1)).toBe(0);
  });

  it('returns correct XP for known levels', () => {
    // Formula: 50 * N^2 + 50
    expect(getXpForLevel(2)).toBe(250);   // 50 * 4 + 50 = 250
    expect(getXpForLevel(3)).toBe(500);   // 50 * 9 + 50 = 500
    expect(getXpForLevel(5)).toBe(1300);  // 50 * 25 + 50 = 1300
    expect(getXpForLevel(10)).toBe(5050); // 50 * 100 + 50 = 5050
  });

  it('XP increases quadratically with level', () => {
    const increments: number[] = [];
    for (let i = 2; i <= 10; i++) {
      increments.push(getXpForLevel(i) - getXpForLevel(i - 1));
    }
    // First two increments are equal (250), then strictly increase
    expect(increments[0]).toBe(250); // L1→L2
    expect(increments[1]).toBe(250); // L2→L3
    for (let i = 2; i < increments.length; i++) {
      expect(increments[i]).toBeGreaterThan(increments[i - 1]);
    }
  });
});

describe('getLevelFromXp', () => {
  it('starts at level 1 with 0 XP', () => {
    expect(getLevelFromXp(0)).toBe(1);
  });

  it('reaches level 2 after threshold', () => {
    expect(getLevelFromXp(249)).toBe(1);
    expect(getLevelFromXp(250)).toBe(2);
    expect(getLevelFromXp(300)).toBe(2);
  });

  it('handles exact boundary values', () => {
    // Level 3 requires 500 XP
    expect(getLevelFromXp(499)).toBe(2);
    expect(getLevelFromXp(500)).toBe(3);

    // Level 5 requires 1300 XP
    expect(getLevelFromXp(1299)).toBe(4);
    expect(getLevelFromXp(1300)).toBe(5);
  });

  it('caps at level 10', () => {
    expect(getLevelFromXp(100000)).toBe(10);
    expect(getLevelFromXp(5050)).toBe(10);
    expect(getLevelFromXp(10000)).toBe(10);
  });

  it('is inverse of getXpForLevel', () => {
    for (let level = 1; level <= 10; level++) {
      const xp = getXpForLevel(level);
      const derived = getLevelFromXp(xp);
      expect(derived).toBe(level);
    }
  });
});

describe('XP consistency', () => {
  it('cumulative XP curve follows expected progression', () => {
    // Total XP to reach each level (incremental cost)
    const costs: number[] = [];
    for (let i = 2; i <= 10; i++) {
      costs.push(getXpForLevel(i) - getXpForLevel(i - 1));
    }
    // Costs increase from index 2 onward (first two are equal at 250)
    expect(costs[0]).toBe(250);
    expect(costs[1]).toBe(250);
    for (let i = 2; i < costs.length; i++) {
      expect(costs[i]).toBeGreaterThan(costs[i - 1]);
    }
  });

  it('all level titles are distinct across tiers', () => {
    const titles = new Set(Object.values(LEVEL_TITLES));
    expect(titles.size).toBe(5); // 5 unique titles across 10 levels
  });

  it('all unlock IDs are unique', () => {
    const allIds = Object.values(LEVEL_UNLOCKS).flat().map(u => u.id);
    expect(new Set(allIds).size).toBe(allIds.length);
  });
});
