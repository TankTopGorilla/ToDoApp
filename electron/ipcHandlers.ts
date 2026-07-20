import { app, ipcMain } from 'electron';
import os from 'os';
import { getDb } from './db';

type Priority = 'low' | 'medium' | 'high';
type Status = 'todo' | 'in-progress' | 'done';
type Recurrence = 'daily' | 'weekdays' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
type SmartView = 'all' | 'today' | 'this-week' | 'overdue' | 'no-date';

interface CreateTaskInput {
  title: string;
  description?: string;
  due_date?: string | null;
  recurrence?: Recurrence | null;
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
  recurrence?: Recurrence | null;
  priority?: Priority;
  status?: Status;
  category_id?: number | null;
  is_favorite?: number;
  sort_order?: number;
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
  background?: string;
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
              t.sort_order ASC,
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
            recurrence,
            priority,
            status,
            category_id,
            is_favorite,
            sort_order
          ) VALUES (
            @title,
            @description,
            @due_date,
            @recurrence,
            @priority,
            @status,
            @category_id,
            @is_favorite,
            @sort_order
          )
        `
      );

      const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM tasks WHERE status = ?').get(task.status ?? 'todo') as { next: number };

      const result = insert.run({
        title: task.title,
        description: task.description ?? '',
        due_date: task.due_date ?? null,
        recurrence: task.recurrence ?? null,
        priority: task.priority ?? 'medium',
        status: task.status ?? 'todo',
        category_id: task.category_id ?? null,
        is_favorite: task.is_favorite ?? 0,
        sort_order: maxOrder.next,
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
            SELECT id, title, description, due_date, recurrence, priority, status, category_id, is_favorite, sort_order
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
            recurrence: Recurrence | null;
            priority: Priority;
            status: Status;
            category_id: number | null;
            is_favorite: number;
            sort_order: number;
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
            recurrence = @recurrence,
            priority = @priority,
            status = @status,
            category_id = @category_id,
            is_favorite = @is_favorite,
            sort_order = @sort_order,
            updated_at = datetime('now')
          WHERE id = @id
        `
      ).run({
        id: task.id,
        title: task.title ?? existing.title,
        description: task.description ?? existing.description,
        due_date: task.due_date !== undefined ? task.due_date : existing.due_date,
        recurrence: task.recurrence !== undefined ? task.recurrence : existing.recurrence,
        priority: task.priority ?? existing.priority,
        status: task.status ?? existing.status,
        category_id:
          task.category_id !== undefined ? task.category_id : existing.category_id,
        is_favorite:
          task.is_favorite !== undefined ? task.is_favorite : existing.is_favorite,
        sort_order:
          task.sort_order !== undefined ? task.sort_order : existing.sort_order,
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

  ipcMain.handle('tasks:update-order', async (_event, updates: { id: number; status: Status; sort_order: number }[]) => {
    try {
      const db = getDb();
      const stmt = db.prepare('UPDATE tasks SET status = ?, sort_order = ?, updated_at = datetime(\'now\') WHERE id = ?');
      const transaction = db.transaction((items: { id: number; status: Status; sort_order: number }[]) => {
        for (const item of items) {
          stmt.run(item.status, item.sort_order, item.id);
        }
      });
      transaction(updates);
      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown database error' };
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
      const row = db.prepare('SELECT mode, accent_color, density, background FROM theme_prefs').get() as
        | {
            mode: 'light' | 'dark';
            accent_color: string;
            density: 'compact' | 'comfortable' | 'spacious';
            background: string;
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
        background: row.background || 'default',
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
        .prepare('UPDATE theme_prefs SET mode = ?, accent_color = ?, density = ?, background = ?')
        .run(prefs.mode, prefs.accent_color, prefs.density, prefs.background || 'default');

      return {
        mode: prefs.mode,
        accent_color: prefs.accent_color,
        density: prefs.density,
        background: prefs.background || 'default',
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  });

  ipcMain.handle('tasks:get-smart', async (_event, view: SmartView) => {
    try {
      const db = getDb();

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7).toISOString();

      const baseQuery = `
        SELECT
          t.id, t.title, t.description, t.due_date, t.recurrence,
          t.priority, t.status, t.category_id, t.is_favorite, t.sort_order,
          c.name AS category_name, c.color AS category_color,
          t.created_at, t.updated_at
        FROM tasks t
        LEFT JOIN categories c ON c.id = t.category_id
      `;

      let whereClause = '';
      const params: unknown[] = [];

      switch (view) {
        case 'today':
          whereClause = `WHERE t.status != 'done' AND t.due_date IS NOT NULL AND t.due_date <= ?`;
          params.push(todayStart);
          break;
        case 'this-week':
          whereClause = `WHERE t.status != 'done' AND t.due_date IS NOT NULL AND t.due_date >= ? AND t.due_date <= ?`;
          params.push(todayStart, weekEnd);
          break;
        case 'overdue':
          whereClause = `WHERE t.status != 'done' AND t.due_date IS NOT NULL AND t.due_date < ?`;
          params.push(todayStart);
          break;
        case 'no-date':
          whereClause = `WHERE t.status != 'done' AND t.due_date IS NULL`;
          break;
        default:
          whereClause = '';
          break;
      }

      const orderClause = `
        ORDER BY
          CASE t.status WHEN 'todo' THEN 0 WHEN 'in-progress' THEN 1 WHEN 'done' THEN 2 ELSE 3 END,
          CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 WHEN 'low' THEN 2 ELSE 3 END,
          t.created_at DESC
      `;

      return db.prepare(baseQuery + whereClause + orderClause).all(...params);
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown database error' };
    }
  });

  ipcMain.handle('tasks:auto-recur', async (_event, taskId: number) => {
    try {
      const db = getDb();
      const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as
        | { title: string; description: string; due_date: string | null; recurrence: Recurrence | null; priority: string; category_id: number | null; is_favorite: number }
        | undefined;

      if (!task || !task.recurrence) {
        return { success: false };
      }

      const currentDue = task.due_date ? new Date(task.due_date) : new Date();
      let nextDue: Date;

      switch (task.recurrence) {
        case 'daily': nextDue = new Date(currentDue); nextDue.setDate(nextDue.getDate() + 1); break;
        case 'weekdays':
          nextDue = new Date(currentDue);
          do { nextDue.setDate(nextDue.getDate() + 1); } while (nextDue.getDay() === 0 || nextDue.getDay() === 6);
          break;
        case 'weekly': nextDue = new Date(currentDue); nextDue.setDate(nextDue.getDate() + 7); break;
        case 'biweekly': nextDue = new Date(currentDue); nextDue.setDate(nextDue.getDate() + 14); break;
        case 'monthly': nextDue = new Date(currentDue); nextDue.setMonth(nextDue.getMonth() + 1); break;
        case 'yearly': nextDue = new Date(currentDue); nextDue.setFullYear(nextDue.getFullYear() + 1); break;
        default: return { success: false };
      }

      const insert = db.prepare(`
        INSERT INTO tasks (title, description, due_date, recurrence, priority, status, category_id, is_favorite)
        VALUES (?, ?, ?, ?, ?, 'todo', ?, ?)
      `);
      const result = insert.run(
        task.title,
        task.description,
        nextDue.toISOString().split('T')[0],
        task.recurrence,
        task.priority,
        task.category_id,
        task.is_favorite,
      );

      return { success: true, new_id: Number(result.lastInsertRowid) };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown database error' };
    }
  });

  ipcMain.handle('tasks:export', async () => {
    try {
      const db = getDb();
      const tasks = db.prepare('SELECT * FROM tasks').all();
      const categories = db.prepare('SELECT * FROM categories').all();
      const themePrefs = db.prepare('SELECT mode, accent_color, density FROM theme_prefs').get() || null;

      return {
        version: 1,
        exported_at: new Date().toISOString(),
        tasks,
        categories,
        theme_prefs: themePrefs,
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown database error' };
    }
  });

  ipcMain.handle('tasks:import', async (_event, data: {
    version: number;
    tasks: Record<string, unknown>[];
    categories: Record<string, unknown>[];
    theme_prefs: Record<string, unknown> | null;
  }) => {
    try {
      const db = getDb();

      const transaction = db.transaction(() => {
        // Clear existing data
        db.prepare('DELETE FROM tasks').run();
        db.prepare('DELETE FROM categories').run();

        // Import categories
        const insertCat = db.prepare('INSERT INTO categories (id, name, color) VALUES (?, ?, ?)');
        for (const cat of data.categories) {
          insertCat.run(cat.id, cat.name, cat.color);
        }

        // Import tasks
        const insertTask = db.prepare(`
          INSERT INTO tasks (id, title, description, due_date, recurrence, priority, status, category_id, is_favorite, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const t of data.tasks) {
          insertTask.run(
            t.id, t.title, t.description ?? '', t.due_date ?? null,
            t.recurrence ?? null, t.priority ?? 'medium', t.status ?? 'todo',
            t.category_id ?? null, t.is_favorite ?? 0,
            t.created_at ?? new Date().toISOString(), t.updated_at ?? new Date().toISOString(),
          );
        }

        // Import theme prefs
        if (data.theme_prefs) {
          const tp = data.theme_prefs;
          db.prepare('DELETE FROM theme_prefs').run();
          db.prepare('INSERT INTO theme_prefs (mode, accent_color, density) VALUES (?, ?, ?)').run(
            tp.mode ?? 'dark', tp.accent_color ?? '#6366f1', tp.density ?? 'comfortable',
          );
        }
      });

      transaction();
      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown database error' };
    }
  });

  ipcMain.handle('tasks:get-by-month', async (_event, year: number, month: number) => {
    try {
      const db = getDb();
      // month is 0-indexed (0=Jan, 11=Dec)
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0); // last day of month

      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      const rows = db
        .prepare(`
          SELECT
            t.id, t.title, t.description, t.due_date, t.recurrence,
            t.priority, t.status, t.category_id, t.is_favorite, t.sort_order,
            c.name AS category_name, c.color AS category_color,
            t.created_at, t.updated_at
          FROM tasks t
          LEFT JOIN categories c ON c.id = t.category_id
          WHERE t.due_date IS NOT NULL AND t.due_date >= ? AND t.due_date <= ?
          ORDER BY t.due_date ASC, t.sort_order ASC
        `)
        .all(startStr, endStr);

      return rows;
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown database error' };
    }
  });

  // --- Template handlers ---

  ipcMain.handle('templates:get-all', async () => {
    try {
      const db = getDb();
      return db.prepare(`
        SELECT t.id, t.name, t.description, COUNT(tt.id) AS task_count, t.created_at, t.updated_at
        FROM templates t
        LEFT JOIN template_tasks tt ON tt.template_id = t.id
        GROUP BY t.id
        ORDER BY LOWER(t.name) ASC
      `).all();
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown database error' };
    }
  });

  ipcMain.handle('templates:get', async (_event, id: number) => {
    try {
      const db = getDb();
      const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(id) as Record<string, unknown> | undefined;
      if (!template) return { error: 'Template not found' };
      const tasks = db.prepare('SELECT * FROM template_tasks WHERE template_id = ? ORDER BY sort_order ASC').all(id);
      return { ...template, tasks };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown database error' };
    }
  });

  ipcMain.handle('templates:create', async (_event, input: { name: string; description?: string; tasks: { title: string; description?: string; priority?: string; category_id?: number | null }[] }) => {
    try {
      const db = getDb();
      const name = input.name.trim().replace(/\s+/g, ' ');
      if (!name) return { error: 'Template name is required' };

      const transaction = db.transaction(() => {
        const result = db.prepare('INSERT INTO templates (name, description) VALUES (?, ?)').run(name, input.description?.trim() ?? '');
        const templateId = Number(result.lastInsertRowid);

        const stmt = db.prepare('INSERT INTO template_tasks (template_id, title, description, priority, category_id, sort_order) VALUES (?, ?, ?, ?, ?, ?)');
        (input.tasks || []).forEach((task, i) => {
          stmt.run(templateId, task.title, task.description ?? '', task.priority ?? 'medium', task.category_id ?? null, i);
        });

        return templateId;
      });

      const templateId = transaction();
      return { success: true, id: templateId };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown database error' };
    }
  });

  ipcMain.handle('templates:update', async (_event, input: { id: number; name?: string; description?: string }) => {
    try {
      const db = getDb();
      const existing = db.prepare('SELECT id FROM templates WHERE id = ?').get(input.id) as Record<string, unknown> | undefined;
      if (!existing) return { error: 'Template not found' };

      if (input.name !== undefined) {
        const name = input.name.trim().replace(/\s+/g, ' ');
        if (!name) return { error: 'Template name is required' };
        db.prepare('UPDATE templates SET name = ?, updated_at = datetime(\'now\') WHERE id = ?').run(name, input.id);
      }
      if (input.description !== undefined) {
        db.prepare('UPDATE templates SET description = ?, updated_at = datetime(\'now\') WHERE id = ?').run(input.description.trim(), input.id);
      }

      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown database error' };
    }
  });

  ipcMain.handle('templates:delete', async (_event, id: number) => {
    try {
      const db = getDb();
      const result = db.prepare('DELETE FROM templates WHERE id = ?').run(id);
      return { success: result.changes > 0 };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown database error' };
    }
  });

  ipcMain.handle('templates:apply', async (_event, input: { id: number; due_date?: string | null }) => {
    try {
      const db = getDb();
      const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(input.id) as Record<string, unknown> | undefined;
      if (!template) return { error: 'Template not found' };

      const tasks = db.prepare('SELECT * FROM template_tasks WHERE template_id = ? ORDER BY sort_order ASC').all(input.id) as { title: string; description: string; priority: string; category_id: number | null }[];

      const transaction = db.transaction(() => {
        const created: number[] = [];
        const insert = db.prepare(`
          INSERT INTO tasks (title, description, due_date, priority, status, category_id, is_favorite, sort_order)
          VALUES (?, ?, ?, ?, 'todo', ?, 0, ?)
        `);

        for (const [i, task] of tasks.entries()) {
          const result = insert.run(task.title, task.description, input.due_date ?? null, task.priority, task.category_id, i);
          created.push(Number(result.lastInsertRowid));
        }

        return created;
      });

      return { success: true, task_ids: transaction() };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown database error' };
    }
  });

  // --- Gamification stats ---

  function ensureStatsExists(): void {
    const db = getDb();
    const exists = db.prepare('SELECT id FROM user_stats LIMIT 1').get();
    if (!exists) {
      db.prepare('INSERT INTO user_stats (level, xp) VALUES (1, 0)').run();
    }
  }

  ipcMain.handle('stats:get', async () => {
    try {
      ensureStatsExists();
      const db = getDb();
      const row = db.prepare('SELECT level, xp, total_tasks_added, total_tasks_completed, current_streak, longest_streak, last_active_date FROM user_stats').get();

      // Also get theme prefs for unlock state
      const prefs = db.prepare('SELECT unlocked_themes, player_title, status_emoji FROM theme_prefs').get() as { unlocked_themes: string; player_title: string | null; status_emoji: string } | undefined;

      return { stats: row, unlocks: prefs ? JSON.parse(prefs.unlocked_themes || '[]') : [], player_title: prefs?.player_title ?? null, status_emoji: prefs?.status_emoji ?? '' };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown database error' };
    }
  });

  ipcMain.handle('stats:add-xp', async (_event, action: 'add_task' | 'complete_task' | 'catch_up') => {
    try {
      ensureStatsExists();
      const db = getDb();

      // Fetch current stats
      const stats = db.prepare('SELECT * FROM user_stats').get() as { level: number; xp: number; total_tasks_added: number; total_tasks_completed: number; current_streak: number; longest_streak: number; last_active_date: string | null };

      // Calculate base XP
      let baseXp = 0;
      if (action === 'add_task') baseXp = 10;
      else if (action === 'complete_task') baseXp = 25;
      else if (action === 'catch_up') baseXp = 50;

      // Streak calculation
      const today = new Date().toISOString().split('T')[0];
      let streak = stats.current_streak;
      const lastDate = stats.last_active_date;

      if (lastDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastDate === yesterdayStr) {
          streak += 1;
        } else if (lastDate !== today) {
          streak = 1;
        }
      }

      const streakMultiplier = Math.min(1 + (streak - 1) * 0.5, 3.0);

      // Variable reward (10% chance, only on completions)
      const variableBonus = (action === 'complete_task' || action === 'catch_up') && Math.random() < 0.1;
      const variableMultiplier = variableBonus ? 2 : 1;

      const xpGained = Math.round(baseXp * streakMultiplier * variableMultiplier);
      const newXp = stats.xp + xpGained;

      // Level calculation
      function getXpForLevel(lvl: number): number {
        if (lvl <= 1) return 0;
        return 50 * lvl * lvl + 50;
      }
      function getLevelFromXp(totalXp: number): number {
        let lvl = 1;
        while (getXpForLevel(lvl + 1) <= totalXp && lvl < 10) lvl++;
        return lvl;
      }
      function getUnlocksForLevel(lvl: number): string[] {
        const map: Record<number, string[]> = { 2: ['palette-sunset'], 3: ['bg-midnight'], 5: ['theme-ocean'], 7: ['theme-forest'], 9: ['theme-royal'], 10: ['density-pro'] };
        const ids: string[] = [];
        for (const [level, items] of Object.entries(map)) {
          if (Number(level) <= lvl) ids.push(...items);
        }
        return ids;
      }

      const newLevel = getLevelFromXp(newXp);
      const leveledUp = newLevel > stats.level;

      // Update DB
      const newTotalAdded = action === 'add_task' ? stats.total_tasks_added + 1 : stats.total_tasks_added;
      const newTotalCompleted = (action === 'complete_task' || action === 'catch_up') ? stats.total_tasks_completed + 1 : stats.total_tasks_completed;

      db.prepare(`
        UPDATE user_stats SET level = ?, xp = ?, total_tasks_added = ?, total_tasks_completed = ?, current_streak = ?, longest_streak = MAX(?, ?), last_active_date = ?
      `).run(newLevel, newXp, newTotalAdded, newTotalCompleted, streak, streak, stats.longest_streak, today);

      // On level-up: save unlocked items to theme_prefs
      let unlocks: string[] = [];
      if (leveledUp) {
        const prefs = db.prepare('SELECT unlocked_themes FROM theme_prefs').get() as { unlocked_themes: string } | undefined;
        const currentUnlocks: string[] = prefs ? JSON.parse(prefs.unlocked_themes || '[]') : [];

        const newUnlocks = getUnlocksForLevel(newLevel);
        unlocks = newUnlocks.filter((id: string) => !currentUnlocks.includes(id));

        if (unlocks.length > 0) {
          const merged = [...currentUnlocks, ...unlocks];
          db.prepare('UPDATE theme_prefs SET unlocked_themes = ?').run(JSON.stringify(merged));
        }
      }

      return {
        xp_gained: xpGained,
        new_xp: newXp,
        new_level: newLevel,
        leveled_up: leveledUp,
        unlocks,
        streak,
        variable_bonus: variableBonus,
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown database error' };
    }
  });
}
