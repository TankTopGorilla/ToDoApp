import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) {
    return db;
  }

  const dbPath = path.join(app.getPath('userData'), 'tasks.db');
  db = new Database(dbPath);

  // Use DELETE instead of WAL to avoid issues with shared memory on some filesystems
  db.pragma('journal_mode = DELETE');
  db.pragma('foreign_keys = ON');

  db.exec(`
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

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT '#6366f1'
    );

    CREATE TABLE IF NOT EXISTS theme_prefs (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      mode TEXT NOT NULL DEFAULT 'dark' CHECK(mode IN ('light', 'dark')),
      accent_color TEXT NOT NULL DEFAULT '#6366f1',
      density TEXT NOT NULL DEFAULT 'comfortable' CHECK(density IN ('compact', 'comfortable', 'spacious')),
      unlocked_themes TEXT DEFAULT '[]',
      player_title TEXT,
      status_emoji TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS template_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
      category_id INTEGER,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

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
  `);

  // Migrations: add columns that may not exist in databases created before schema changes
  const existingColumns = db!.prepare(`PRAGMA table_info(tasks)`).all() as { name: string }[];
  if (!existingColumns.some(c => c.name === 'sort_order')) {
    db!.exec(`ALTER TABLE tasks ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0`);
  }
  if (!existingColumns.some(c => c.name === 'recurrence')) {
    db!.exec(`ALTER TABLE tasks ADD COLUMN recurrence TEXT CHECK(recurrence IN ('daily', 'weekdays', 'weekly', 'biweekly', 'monthly', 'yearly'))`);
  }

  const themeColumns = db!.prepare(`PRAGMA table_info(theme_prefs)`).all() as { name: string }[];
  if (!themeColumns.some(c => c.name === 'unlocked_themes')) {
    db!.exec(`ALTER TABLE theme_prefs ADD COLUMN unlocked_themes TEXT DEFAULT '[]'`);
  }
  if (!themeColumns.some(c => c.name === 'player_title')) {
    db!.exec(`ALTER TABLE theme_prefs ADD COLUMN player_title TEXT`);
  }
  if (!themeColumns.some(c => c.name === 'status_emoji')) {
    db!.exec(`ALTER TABLE theme_prefs ADD COLUMN status_emoji TEXT DEFAULT ''`);
  }
  if (!themeColumns.some(c => c.name === 'background')) {
    db!.exec(`ALTER TABLE theme_prefs ADD COLUMN background TEXT NOT NULL DEFAULT 'default'`);
  }

  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
