import db, { getDbForChat } from "./db";

export interface Reminder {
    id?: number;
    task_id: number;
    remind_at: string; // ISO UTC
    sent?: number; // 0/1
    created_at?: string;
}

export function addReminder(taskId: number, remindAt: string, chatId?: number) {
    const dbInstance = getDbForChat(chatId);
    const stmt = dbInstance.prepare(
        `INSERT INTO reminders (task_id, remind_at, sent) VALUES (?, ?, 0)`
    );
    const info = stmt.run(taskId, remindAt);
    return info.lastInsertRowid as number;
}

export function getDueReminders(limit = 50, chatId?: number) {
    const dbInstance = getDbForChat(chatId);
    const stmt = dbInstance.prepare(
        `SELECT r.* FROM reminders r JOIN tasks t ON t.id = r.task_id WHERE r.sent = 0 AND r.remind_at <= ? AND t.status = 'pending' ORDER BY r.remind_at LIMIT ?`
    );
    const now = new Date().toISOString();
    return stmt.all(now, limit) as Reminder[];
}

export function markReminderSent(reminderId: number, chatId?: number) {
    const dbInstance = getDbForChat(chatId);
    const stmt = dbInstance.prepare(`UPDATE reminders SET sent = 1 WHERE id = ?`);
    stmt.run(reminderId);
}

export function deleteRemindersForTask(taskId: number, chatId?: number) {
    const dbInstance = getDbForChat(chatId);
    const stmt = dbInstance.prepare(`DELETE FROM reminders WHERE task_id = ?`);
    stmt.run(taskId);
}

export function getRemindersForTask(taskId: number, chatId?: number) {
    const dbInstance = getDbForChat(chatId);
    const stmt = dbInstance.prepare(`SELECT * FROM reminders WHERE task_id = ? ORDER BY remind_at`);
    return stmt.all(taskId) as Reminder[];
}

export function deleteReminderById(id: number, chatId?: number) {
    const dbInstance = getDbForChat(chatId);
    const stmt = dbInstance.prepare(`DELETE FROM reminders WHERE id = ?`);
    stmt.run(id);
}

export function clearReminders(chatId?: number): number {
    const dbInstance = getDbForChat(chatId);
    const stmt = dbInstance.prepare(`DELETE FROM reminders`);
    const info = stmt.run();
    return info.changes;
}
