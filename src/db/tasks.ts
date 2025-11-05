import db, { getDbForChat } from "./db";
import { Task } from "../types/task";

export function addTask(task: Omit<Task, "id" | "created_at" | "status" | "completed_at"> & { chat_id?: number | null, parent_id?: number | null }) {
    const dbInstance = getDbForChat(task.chat_id ?? undefined);
    const stmt = dbInstance.prepare(`
        INSERT INTO tasks (text, due_date, due_time, repeat_pattern, remind_interval, status, chat_id, parent_id)
        VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
    `);
    const info = stmt.run(
        task.text,
        task.due_date,
        task.due_time,
        task.repeat_pattern,
        task.remind_interval,
        task.chat_id ?? null,
        task.parent_id ?? null
    );
    return info.lastInsertRowid as number;
}

export function getTasks(chatId?: number): Task[] {
    const dbInstance = getDbForChat(chatId);
    const stmt = dbInstance.prepare(
        "SELECT * FROM tasks WHERE status = 'pending' ORDER BY due_date, due_time"
    );
    return stmt.all() as Task[];
}

export function getAllTasks(chatId?: number): Task[] {
    const dbInstance = getDbForChat(chatId);
    const stmt = dbInstance.prepare(
        "SELECT * FROM tasks WHERE status != 'deleted' ORDER BY COALESCE(due_date, ''), due_time IS NULL, due_time"
    );
    return stmt.all() as Task[];
}

export function completeTask(id: number, chatId?: number) {
    const dbInstance = getDbForChat(chatId);
    const stmt = dbInstance.prepare(
        "UPDATE tasks SET status = 'completed', completed_at = ? WHERE id = ?"
    );
    stmt.run(new Date().toISOString(), id);
}

export function getTasksForDate(userId: number, date: string): Task[] {
    const dbInstance = getDbForChat(userId);
    const stmt = dbInstance.prepare(`
        SELECT * FROM tasks
        WHERE due_date = ? AND status != 'deleted'
        ORDER BY due_time IS NULL, due_time
    `);
    return stmt.all(date) as Task[];
}

export function getTasksForToday(userId: number, today: string): Task[] {
    const dbInstance = getDbForChat(userId);
    const stmt = dbInstance.prepare(`
        SELECT * FROM tasks
        WHERE due_date = ? AND status != 'deleted'
        ORDER BY due_time IS NULL, due_time
    `);
    return stmt.all(today) as Task[];
}

export function getTasksForTomorrow(userId: number, tomorrow: string): Task[] {
    const dbInstance = getDbForChat(userId);
    const stmt = dbInstance.prepare(`
        SELECT * FROM tasks
        WHERE due_date = ? AND status != 'deleted'
        ORDER BY due_time IS NULL, due_time
    `);
    return stmt.all(tomorrow) as Task[];
}

export function getTasksForWeek(
    userId: number,
    startDate: string,
    endDate: string
): Task[] {
    const dbInstance = getDbForChat(userId);
    const stmt = dbInstance.prepare(`
        SELECT * FROM tasks
        WHERE due_date BETWEEN ? AND ?
        AND status != 'deleted'
        ORDER BY due_date, due_time IS NULL, due_time
    `);
    return stmt.all(startDate, endDate) as Task[];
}

export function getAllTasksForWeek(
    userId: number,
    startDate: string,
    endDate: string
): Task[] {
    const dbInstance = getDbForChat(userId);
    const stmt = dbInstance.prepare(`
        SELECT * FROM tasks
        WHERE due_date BETWEEN ? AND ? AND status != 'deleted'
        ORDER BY due_date, due_time IS NULL, due_time
    `);
    return stmt.all(startDate, endDate) as Task[];
}

export function getTaskById(id: number, chatId?: number): Task | undefined {
    const dbInstance = getDbForChat(chatId);
    const stmt = dbInstance.prepare("SELECT * FROM tasks WHERE id = ?");
    return stmt.get(id) as Task | undefined;
}

export function updateTask(task: Task) {
    const dbInstance = getDbForChat(task.chat_id ?? undefined);
    const stmt = dbInstance.prepare(`
        UPDATE tasks 
        SET text = ?, due_date = ?, due_time = ?, repeat_pattern = ?, remind_interval = ?, status = ?, completed_at = ?
        WHERE id = ?
    `);
    stmt.run(
        task.text,
        task.due_date,
        task.due_time,
        task.repeat_pattern,
        task.remind_interval,
        // @ts-ignore allow string status on Task
        (task as any).status ?? 'pending',
        task.completed_at ?? null,
        task.id
    );
}

export function deleteTask(id: number, chatId?: number) {
    // Soft delete
    const dbInstance = getDbForChat(chatId);
    const stmt = dbInstance.prepare("UPDATE tasks SET status = 'deleted' WHERE id = ?");
    stmt.run(id);
}

export function deleteTasksByParent(parentId: number, chatId?: number) {
    const dbInstance = getDbForChat(chatId);
    const stmt = dbInstance.prepare("UPDATE tasks SET status = 'deleted' WHERE parent_id = ?");
    stmt.run(parentId);
}

export function deleteTaskHard(id: number, chatId?: number) {
    const dbInstance = getDbForChat(chatId);
    try {
        const delRem = dbInstance.prepare("DELETE FROM reminders WHERE task_id = ?");
        delRem.run(id);
    } catch (e) { console.error('deleteTaskHard reminders error', e); }
    try {
        const delRules = dbInstance.prepare("DELETE FROM repeat_rules WHERE task_id = ?");
        delRules.run(id);
    } catch (e) { /* ignore */ }
    try {
        const delChildren = dbInstance.prepare("DELETE FROM tasks WHERE parent_id = ?");
        delChildren.run(id);
    } catch (e) { /* ignore */ }
    try {
        const delTask = dbInstance.prepare("DELETE FROM tasks WHERE id = ?");
        delTask.run(id);
    } catch (e) { console.error('deleteTaskHard task error', e); }
}

export function deleteTasksByParentHard(parentId: number, chatId?: number) {
    const dbInstance = getDbForChat(chatId);
    try {
        const childIds = dbInstance.prepare("SELECT id FROM tasks WHERE parent_id = ?").all(parentId).map((r:any)=>r.id);
        for (const cid of childIds) {
            try { dbInstance.prepare("DELETE FROM reminders WHERE task_id = ?").run(cid); } catch(_) {}
            try { dbInstance.prepare("DELETE FROM tasks WHERE id = ?").run(cid); } catch(_) {}
        }
    } catch (e) { console.error('deleteTasksByParentHard error', e); }
}

export function setTaskStatus(id: number, status: 'pending' | 'completed' | 'deleted', completedAt?: string, chatId?: number) {
    const dbInstance = getDbForChat(chatId);
    const stmt = dbInstance.prepare("UPDATE tasks SET status = ?, completed_at = ? WHERE id = ?");
    stmt.run(status, completedAt ?? null, id);
}

export function getInboxTasks(userId: number): Task[] {
    const dbInstance = getDbForChat(userId);
    const stmt = dbInstance.prepare(`
        SELECT * FROM tasks
        WHERE status = 'pending' AND due_date IS NULL AND due_time IS NULL
        ORDER BY id
    `);
    return stmt.all() as Task[];
}

export function deleteCompletedTasks(chatId?: number): number {
    const dbInstance = getDbForChat(chatId);
    const stmt = dbInstance.prepare("UPDATE tasks SET status = 'deleted' WHERE status = 'completed'");
    const info = stmt.run();
    return info.changes;
}

export function clearAllTasks(chatId?: number): number {
    const dbInstance = getDbForChat(chatId);
    const stmt = dbInstance.prepare("UPDATE tasks SET status = 'deleted'");
    const info = stmt.run();
    return info.changes;
}

export function hardClearAll(chatId?: number): { tasks: number; repeat_rules: number; reminders: number; settings: number; stats: number } {
    const dbInstance = getDbForChat(chatId);
    const res: any = { tasks: 0, repeat_rules: 0, reminders: 0, settings: 0, stats: 0 };
    try {
        const t1 = dbInstance.prepare("DELETE FROM tasks");
        res.tasks = t1.run().changes;
    } catch (e) { console.error('hardClearAll tasks error', e); }
    try {
        const t2 = dbInstance.prepare("DELETE FROM repeat_rules");
        res.repeat_rules = t2.run().changes;
    } catch (e) { /* ignore */ }
    try {
        const t3 = dbInstance.prepare("DELETE FROM reminders");
        res.reminders = t3.run().changes;
    } catch (e) { /* ignore */ }
    try {
        const t4 = dbInstance.prepare("DELETE FROM user_settings");
        res.settings = t4.run().changes;
    } catch (e) { /* ignore */ }
    try {
        const t5 = dbInstance.prepare("DELETE FROM stats");
        res.stats = t5.run().changes;
    } catch (e) { /* ignore */ }

    return res;
}

// Normalize tasks that received default time '23:59' to have NULL time when likely not intended.
// Heuristic: only convert when task has no repeat_pattern and no reminders set.
export function normalizeDefaultTimes(chatId?: number): number {
    const dbInstance = getDbForChat(chatId);
    try {
        const stmt = dbInstance.prepare("UPDATE tasks SET due_time = NULL WHERE due_time = '23:59' AND (repeat_pattern IS NULL OR repeat_pattern = '') AND id NOT IN (SELECT task_id FROM reminders)");
        const info = stmt.run();
        return info.changes;
    } catch (e) {
        console.error('Error normalizing default times:', e);
        return 0;
    }
}

