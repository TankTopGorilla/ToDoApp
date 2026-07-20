import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';

describe('Database schema', () => {
  let db: SqlJsDatabase;

  beforeAll(async () => {
    const SQL = await initSqlJs();
    db = new SQL.Database();
  });

  afterAll(() => {
    db.close();
  });

  it('creates tasks table with all columns', () => {
    db.run(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        due_date TEXT,
        priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
        status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo', 'in-progress', 'done')),
        category_id INTEGER,
        is_favorite INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        recurrence TEXT CHECK(recurrence IN ('daily', 'weekdays', 'weekly', 'biweekly', 'monthly', 'yearly')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    const result = db.exec(`PRAGMA table_info(tasks)`);
    const columns = result[0].values.map((row: unknown[]) => row[1] as string);

    expect(columns).toContain('id');
    expect(columns).toContain('title');
    expect(columns).toContain('description');
    expect(columns).toContain('due_date');
    expect(columns).toContain('priority');
    expect(columns).toContain('status');
    expect(columns).toContain('category_id');
    expect(columns).toContain('is_favorite');
    expect(columns).toContain('sort_order');
    expect(columns).toContain('recurrence');
    expect(columns).toContain('created_at');
    expect(columns).toContain('updated_at');

    // Check NOT NULL constraint
    const titleCol = result[0].values.find((row: unknown[]) => row[1] === 'title') as unknown[];
    expect(titleCol[3]).toBe(1);
    const sortCol = result[0].values.find((row: unknown[]) => row[1] === 'sort_order') as unknown[];
    expect(sortCol[3]).toBe(1);
  });

  it('creates categories table', () => {
    db.run(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        color TEXT NOT NULL DEFAULT '#6366f1'
      );
    `);

    const result = db.exec(`PRAGMA table_info(categories)`);
    const columns = result[0].values.map((row: unknown[]) => row[1] as string);
    expect(columns).toEqual(['id', 'name', 'color']);
  });

  it('creates theme_prefs table with new columns', () => {
    db.run(`
      CREATE TABLE IF NOT EXISTS theme_prefs (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        mode TEXT NOT NULL DEFAULT 'dark' CHECK(mode IN ('light', 'dark')),
        accent_color TEXT NOT NULL DEFAULT '#6366f1',
        density TEXT NOT NULL DEFAULT 'comfortable' CHECK(density IN ('compact', 'comfortable', 'spacious')),
        unlocked_themes TEXT DEFAULT '[]',
        player_title TEXT,
        status_emoji TEXT DEFAULT ''
      );
    `);

    const result = db.exec(`PRAGMA table_info(theme_prefs)`);
    const columns = result[0].values.map((row: unknown[]) => row[1] as string);
    expect(columns).toContain('unlocked_themes');
    expect(columns).toContain('player_title');
    expect(columns).toContain('status_emoji');
  });

  it('creates templates and template_tasks tables', () => {
    db.run(`CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS template_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
      title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
      priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
      category_id INTEGER, sort_order INTEGER NOT NULL DEFAULT 0
    )`);

    const tpl = db.exec(`PRAGMA table_info(templates)`);
    expect(tpl[0].values.map((r: unknown[]) => r[1])).toContain('name');

    const tt = db.exec(`PRAGMA table_info(template_tasks)`);
    expect(tt[0].values.map((r: unknown[]) => r[1])).toContain('template_id');
  });

  it('creates user_stats table', () => {
    db.run(`CREATE TABLE IF NOT EXISTS user_stats (
      id INTEGER PRIMARY KEY CHECK (id = 1), level INTEGER NOT NULL DEFAULT 1,
      xp INTEGER NOT NULL DEFAULT 0, total_tasks_added INTEGER NOT NULL DEFAULT 0,
      total_tasks_completed INTEGER NOT NULL DEFAULT 0, current_streak INTEGER NOT NULL DEFAULT 0,
      longest_streak INTEGER NOT NULL DEFAULT 0, last_active_date TEXT
    )`);

    const result = db.exec(`PRAGMA table_info(user_stats)`);
    const columns = result[0].values.map((r: unknown[]) => r[1] as string);
    expect(columns).toContain('level');
    expect(columns).toContain('xp');
    expect(columns).toContain('current_streak');
  });
});

describe('Database migrations', () => {
  let db: SqlJsDatabase;

  beforeAll(async () => {
    const SQL = await initSqlJs();
    db = new SQL.Database();
    // Create initial schema (without later-added columns)
    db.run(`CREATE TABLE tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '', due_date TEXT,
      priority TEXT NOT NULL DEFAULT 'medium', status TEXT NOT NULL DEFAULT 'todo',
      category_id INTEGER, is_favorite INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
    db.run(`CREATE TABLE theme_prefs (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      mode TEXT NOT NULL DEFAULT 'dark', accent_color TEXT NOT NULL DEFAULT '#6366f1',
      density TEXT NOT NULL DEFAULT 'comfortable'
    )`);
  });

  afterAll(() => { db.close(); });

  it('adds missing sort_order column to tasks', () => {
    const colInfo = db.exec(`PRAGMA table_info(tasks)`);
    const before = colInfo[0].values.map((r: unknown[]) => r[1]);
    expect(before).not.toContain('sort_order');

    db.run(`ALTER TABLE tasks ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0`);

    const after = db.exec(`PRAGMA table_info(tasks)`);
    expect(after[0].values.map((r: unknown[]) => r[1])).toContain('sort_order');
  });

  it('adds missing recurrence column', () => {
    db.run(`ALTER TABLE tasks ADD COLUMN recurrence TEXT`);
    const result = db.exec(`PRAGMA table_info(tasks)`);
    expect(result[0].values.map((r: unknown[]) => r[1])).toContain('recurrence');
  });

  it('adds missing columns to theme_prefs', () => {
    db.run(`ALTER TABLE theme_prefs ADD COLUMN unlocked_themes TEXT DEFAULT '[]'`);
    db.run(`ALTER TABLE theme_prefs ADD COLUMN player_title TEXT`);
    db.run(`ALTER TABLE theme_prefs ADD COLUMN status_emoji TEXT DEFAULT ''`);

    const result = db.exec(`PRAGMA table_info(theme_prefs)`);
    const cols = result[0].values.map((r: unknown[]) => r[1] as string);
    expect(cols).toContain('unlocked_themes');
    expect(cols).toContain('player_title');
    expect(cols).toContain('status_emoji');
  });
});

describe('Database CRUD operations', () => {
  let db: SqlJsDatabase;

  beforeAll(async () => {
    const SQL = await initSqlJs();
    db = new SQL.Database();
    db.run(`PRAGMA foreign_keys = ON`);
    db.run(`CREATE TABLE tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '', due_date TEXT, recurrence TEXT,
      priority TEXT NOT NULL DEFAULT 'medium', status TEXT NOT NULL DEFAULT 'todo',
      category_id INTEGER, is_favorite INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
    db.run(`CREATE TABLE categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, color TEXT NOT NULL DEFAULT '#6366f1'
    )`);
    db.run(`CREATE TABLE user_stats (
      id INTEGER PRIMARY KEY CHECK (id = 1), level INTEGER NOT NULL DEFAULT 1,
      xp INTEGER NOT NULL DEFAULT 0, total_tasks_added INTEGER NOT NULL DEFAULT 0,
      total_tasks_completed INTEGER NOT NULL DEFAULT 0, current_streak INTEGER NOT NULL DEFAULT 0,
      longest_streak INTEGER NOT NULL DEFAULT 0, last_active_date TEXT
    )`);
    db.run(`CREATE TABLE templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
    db.run(`CREATE TABLE template_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
      title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
      priority TEXT NOT NULL DEFAULT 'medium', category_id INTEGER,
      sort_order INTEGER NOT NULL DEFAULT 0
    )`);
  });

  afterAll(() => { db.close(); });

  it('inserts and selects a task', () => {
    db.run(`INSERT INTO tasks (title, description, priority, status, sort_order) VALUES (?, ?, ?, ?, ?)`,
      ['Test Task', 'A test', 'high', 'todo', 0]);

    const result = db.exec(`SELECT title, priority, status, sort_order FROM tasks WHERE title = ?`, ['Test Task']);
    expect(result[0].values).toHaveLength(1);
    const task = result[0].values[0];
    expect(task[0]).toBe('Test Task');
    expect(task[1]).toBe('high');
    expect(task[2]).toBe('todo');
    expect(task[3]).toBe(0);
  });

  it('updates a task status', () => {
    const before = db.exec(`SELECT id, status FROM tasks LIMIT 1`);
    const id = before[0].values[0][0];

    db.run(`UPDATE tasks SET status = ? WHERE id = ?`, ['done', id]);

    const after = db.exec(`SELECT status FROM tasks WHERE id = ?`, [id]);
    expect(after[0].values[0][0]).toBe('done');
  });

  it('deletes a task', () => {
    db.run(`INSERT INTO tasks (title) VALUES (?)`, ['delete-me']);
    const inserted = db.exec(`SELECT id FROM tasks WHERE title = ?`, ['delete-me']);
    const id = inserted[0].values[0][0];

    db.run(`DELETE FROM tasks WHERE id = ?`, [id]);

    const gone = db.exec(`SELECT * FROM tasks WHERE id = ?`, [id]);
    expect(gone).toHaveLength(0);
  });

  it('handles categories with task counts', () => {
    db.run(`INSERT INTO categories (id, name, color) VALUES (?, ?, ?)`, [99, 'TestCat', '#ff0000']);
    db.run(`INSERT INTO tasks (title, category_id) VALUES (?, ?)`, ['categorized', 99]);

    const result = db.exec(`
      SELECT c.id, c.name, c.color, COUNT(t.id) AS task_count
      FROM categories c LEFT JOIN tasks t ON t.category_id = c.id
      WHERE c.id = ? GROUP BY c.id
    `, [99]);
    const count = result[0].values[0][3];
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it('creates and applies a template', () => {
    db.run(`INSERT INTO templates (name, description) VALUES (?, ?)`, ['Test Tpl', 'desc']);

    const tplResult = db.exec(`SELECT id FROM templates WHERE name = ?`, ['Test Tpl']);
    const tplId = tplResult[0].values[0][0];

    db.run(`INSERT INTO template_tasks (template_id, title, priority, sort_order) VALUES (?, ?, ?, ?)`, [tplId, 'Step 1', 'high', 0]);
    db.run(`INSERT INTO template_tasks (template_id, title, priority, sort_order) VALUES (?, ?, ?, ?)`, [tplId, 'Step 2', 'medium', 1]);

    const tasks = db.exec(`SELECT title, priority FROM template_tasks WHERE template_id = ? ORDER BY sort_order`, [tplId]);
    expect(tasks[0].values).toHaveLength(2);
    expect(tasks[0].values[0][0]).toBe('Step 1');
    expect(tasks[0].values[1][0]).toBe('Step 2');

    // Apply: create real tasks
    for (const row of tasks[0].values) {
      db.run(`INSERT INTO tasks (title, priority, status, sort_order) VALUES (?, ?, 'todo', ?)`, [row[0], row[1], 0]);
    }

    const allTasks = db.exec(`SELECT title FROM tasks WHERE status = 'todo'`);
    const step1 = allTasks[0].values.find((r: unknown[]) => r[0] === 'Step 1');
    expect(step1).toBeDefined();
  });

  it('manages user_stats with level and XP', () => {
    db.run(`INSERT INTO user_stats (id, level, xp) VALUES (?, ?, ?)`, [1, 1, 0]);

    const stats = db.exec(`SELECT level, xp FROM user_stats`);
    expect(stats[0].values[0][0]).toBe(1);
    expect(stats[0].values[0][1]).toBe(0);

    db.run(`UPDATE user_stats SET xp = xp + ? WHERE id = 1`, [50]);
    const updated = db.exec(`SELECT xp FROM user_stats`);
    expect(updated[0].values[0][0]).toBe(50);
  });
});
