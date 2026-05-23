import { app, ipcMain } from 'electron';
import os from 'os';
import { getDb } from './db';

type Priority = 'low' | 'medium' | 'high';
type Status = 'todo' | 'in-progress' | 'done';

interface CreateTaskInput {
  title: string;
  description?: string;
  due_date?: string | null;
  priority?: Priority;
  status?: Status;
  category_id?: number | null;
  is_favorite?: number;
}

interface UpdateTaskInput {
  id: number;
  title?: string;
  description?: string;
  due_date?: string | null;
  priority?: Priority;
  status?: Status;
  category_id?: number | null;
  is_favorite?: number;
}

interface CreateCategoryInput {
  name: string;
  color: string;
}

interface UpdateCategoryInput {
  id: number;
  name: string;
  color: string;
}

interface UpdateThemePrefsInput {
  mode: 'light' | 'dark';
  accent_color: string;
  density: 'compact' | 'comfortable' | 'spacious';
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function isValidHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function fetchTaskById(id: number) {
  const db = getDb();

  return db
    .prepare(
      `
        SELECT
          t.id,
          t.title,
          t.description,
          t.due_date,
          t.priority,
          t.status,
          t.category_id,
          t.is_favorite,
          c.name AS category_name,
          c.color AS category_color,
          t.created_at,
          t.updated_at
        FROM tasks t
        LEFT JOIN categories c ON c.id = t.category_id
        WHERE t.id = ?
      `
    )
    .get(id);
}

function fetchCategoryById(id: number) {
  const db = getDb();

  return db
    .prepare(
      `
        SELECT
          c.id,
          c.name,
          c.color,
          COUNT(t.id) AS task_count
        FROM categories c
        LEFT JOIN tasks t ON t.category_id = c.id
        WHERE c.id = ?
        GROUP BY c.id, c.name, c.color
      `
    )
    .get(id);
}

function ensureThemePrefsExists(): void {
  const db = getDb();

  const exists = db
    .prepare('SELECT id FROM theme_prefs LIMIT 1')
    .get();

  if (!exists) {
    db.prepare('INSERT INTO theme_prefs (mode, accent_color, density) VALUES (?, ?, ?)').run(
      'dark',
      '#6366f1',
      'comfortable',
    );
  }
}

export function registerIpcHandlers(): void {
  ensureThemePrefsExists();

  ipcMain.handle('system-info', async () => {
    return {
      platform: process.platform,
      version: process.versions.electron,
      uptime: os.uptime(),
      cwd: app.getPath('userData'),
    };
  });

  ipcMain.handle('tasks:get-all', async () => {
    try {
      const db = getDb();

      const rows = db
        .prepare(
          `
            SELECT
              t.id,
              t.title,
              t.description,
              t.due_date,
              t.priority,
              t.status,
              t.category_id,
              t.is_favorite,
              c.name AS category_name,
              c.color AS category_color,
              t.created_at,
              t.updated_at
            FROM tasks t
            LEFT JOIN categories c ON c.id = t.category_id
            ORDER BY
              CASE t.status
                WHEN 'todo' THEN 0
                WHEN 'in-progress' THEN 1
                WHEN 'done' THEN 2
                ELSE 3
              END,
              CASE t.priority
                WHEN 'high' THEN 0
                WHEN 'medium' THEN 1
                WHEN 'low' THEN 2
                ELSE 3
              END,
              t.created_at DESC
          `
        )
        .all();

      return rows;
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  });

  ipcMain.handle('tasks:create', async (_event, task: CreateTaskInput) => {
    try {
      const db = getDb();

      const insert = db.prepare(
        `
          INSERT INTO tasks (
            title,
            description,
            due_date,
            priority,
            status,
            category_id,
            is_favorite
          ) VALUES (
            @title,
            @description,
            @due_date,
            @priority,
            @status,
            @category_id,
            @is_favorite
          )
        `
      );

      const result = insert.run({
        title: task.title,
        description: task.description ?? '',
        due_date: task.due_date ?? null,
        priority: task.priority ?? 'medium',
        status: task.status ?? 'todo',
        category_id: task.category_id ?? null,
        is_favorite: task.is_favorite ?? 0,
      });

      return fetchTaskById(Number(result.lastInsertRowid));
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  });

  ipcMain.handle('tasks:update', async (_event, task: UpdateTaskInput) => {
    try {
      const db = getDb();

      const existing = db
        .prepare(
          `
            SELECT id, title, description, due_date, priority, status, category_id, is_favorite
            FROM tasks
            WHERE id = ?
          `
        )
        .get(task.id) as
        | {
            id: number;
            title: string;
            description: string;
            due_date: string | null;
            priority: Priority;
            status: Status;
            category_id: number | null;
            is_favorite: number;
          }
        | undefined;

      if (!existing) {
        return { error: 'Task not found' };
      }

      db.prepare(
        `
          UPDATE tasks
          SET
            title = @title,
            description = @description,
            due_date = @due_date,
            priority = @priority,
            status = @status,
            category_id = @category_id,
            is_favorite = @is_favorite,
            updated_at = datetime('now')
          WHERE id = @id
        `
      ).run({
        id: task.id,
        title: task.title ?? existing.title,
        description: task.description ?? existing.description,
        due_date: task.due_date !== undefined ? task.due_date : existing.due_date,
        priority: task.priority ?? existing.priority,
        status: task.status ?? existing.status,
        category_id:
          task.category_id !== undefined ? task.category_id : existing.category_id,
        is_favorite:
          task.is_favorite !== undefined ? task.is_favorite : existing.is_favorite,
      });

      return fetchTaskById(task.id);
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  });

  ipcMain.handle('tasks:delete', async (_event, id: number) => {
    try {
      const db = getDb();
      const result = db.prepare(`DELETE FROM tasks WHERE id = ?`).run(id);

      return {
        success: result.changes > 0,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  });

  ipcMain.handle('categories:get-all', async () => {
    try {
      const db = getDb();

      const rows = db
        .prepare(
          `
            SELECT
              c.id,
              c.name,
              c.color,
              COUNT(t.id) AS task_count
            FROM categories c
            LEFT JOIN tasks t ON t.category_id = c.id
            GROUP BY c.id, c.name, c.color
            ORDER BY LOWER(c.name) ASC
          `
        )
        .all();

      return rows;
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  });

  ipcMain.handle(
    'categories:create',
    async (_event, category: CreateCategoryInput) => {
      try {
        const db = getDb();
        const name = normalizeName(category.name);
        const color = category.color?.trim() || '#6366f1';

        if (!name) {
          return { error: 'Category name is required' };
        }

        const result = db
          .prepare(
            `
              INSERT INTO categories (name, color)
              VALUES (?, ?)
            `
          )
          .run(name, color);

        return fetchCategoryById(Number(result.lastInsertRowid));
      } catch (error) {
        return {
          error:
            error instanceof Error
              ? error.message
              : 'Unknown database error',
        };
      }
    }
  );

  ipcMain.handle(
    'categories:update',
    async (_event, category: UpdateCategoryInput) => {
      try {
        const db = getDb();
        const existing = db
          .prepare(`SELECT id FROM categories WHERE id = ?`)
          .get(category.id);

        if (!existing) {
          return { error: 'Category not found' };
        }

        const name = normalizeName(category.name);
        const color = category.color?.trim() || '#6366f1';

        if (!name) {
          return { error: 'Category name is required' };
        }

        db.prepare(
          `
            UPDATE categories
            SET name = ?, color = ?
            WHERE id = ?
          `
        ).run(name, color, category.id);

        return fetchCategoryById(category.id);
      } catch (error) {
        return {
          error:
            error instanceof Error
              ? error.message
              : 'Unknown database error',
        };
      }
    }
  );

  ipcMain.handle('categories:delete', async (_event, id: number) => {
    try {
      const db = getDb();
      const existing = db
        .prepare(`SELECT id FROM categories WHERE id = ?`)
        .get(id);

      if (!existing) {
        return { error: 'Category not found' };
      }

      const transaction = db.transaction((categoryId: number) => {
        db.prepare(`UPDATE tasks SET category_id = NULL WHERE category_id = ?`).run(
          categoryId
        );
        return db.prepare(`DELETE FROM categories WHERE id = ?`).run(categoryId);
      });

      const result = transaction(id);

      return {
        success: result.changes > 0,
      };
    } catch (error) {
      return {
        error:
          error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  });

  ipcMain.handle('theme:get-prefs', async () => {
    try {
      const db = getDb();
      const row = db.prepare('SELECT mode, accent_color, density FROM theme_prefs').get() as
        | {
            mode: 'light' | 'dark';
            accent_color: string;
            density: 'compact' | 'comfortable' | 'spacious';
          }
        | undefined;

      if (!row) {
        return {
          error: 'Theme preferences not found',
        };
      }

      return {
        mode: row.mode,
        accent_color: row.accent_color,
        density: row.density,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  });

  ipcMain.handle('theme:update-prefs', async (_event, prefs: UpdateThemePrefsInput) => {
    try {
      if (prefs.mode !== 'light' && prefs.mode !== 'dark') {
        return {
          error: 'Invalid mode. Must be "light" or "dark"',
        };
      }

      if (!isValidHexColor(prefs.accent_color)) {
        return {
          error: 'Invalid accent color. Must be a 6-digit hex color (e.g., #6366f1)',
        };
      }

      if (
        prefs.density !== 'compact' &&
        prefs.density !== 'comfortable' &&
        prefs.density !== 'spacious'
      ) {
        return {
          error: 'Invalid density. Must be "compact", "comfortable", or "spacious"',
        };
      }

      const db = getDb();
      db
        .prepare('UPDATE theme_prefs SET mode = ?, accent_color = ?, density = ?')
        .run(prefs.mode, prefs.accent_color, prefs.density);

      return {
        mode: prefs.mode,
        accent_color: prefs.accent_color,
        density: prefs.density,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  });
}
