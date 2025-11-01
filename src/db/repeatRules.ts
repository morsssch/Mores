import db, { getDbForChat } from './db';

export type RepeatRule = {
    id?: number;
    task_id: number;
    type: 'daily' | 'weekly' | 'custom';
    payload?: string | null; // JSON
    timezone?: string | null;
    created_at?: string;
};

export function addRepeatRule(rule: Omit<RepeatRule, 'id' | 'created_at'>, chatId?: number) {
    const dbInstance = getDbForChat(chatId);
    const stmt = dbInstance.prepare(`INSERT INTO repeat_rules (task_id, type, payload, timezone) VALUES (?, ?, ?, ?)`);
    const info = stmt.run(rule.task_id, rule.type, rule.payload ?? null, rule.timezone ?? null);
    return info.lastInsertRowid as number;
}

export function getRepeatRulesForTask(taskId: number, chatId?: number) {
    const dbInstance = getDbForChat(chatId);
    const stmt = dbInstance.prepare(`SELECT * FROM repeat_rules WHERE task_id = ? ORDER BY id`);
    return stmt.all(taskId) as RepeatRule[];
}

export function deleteRepeatRule(id: number, chatId?: number) {
    const dbInstance = getDbForChat(chatId);
    const stmt = dbInstance.prepare(`DELETE FROM repeat_rules WHERE id = ?`);
    stmt.run(id);
}

export function clearRepeatRules(chatId?: number): number {
    const dbInstance = getDbForChat(chatId);
    const stmt = dbInstance.prepare(`DELETE FROM repeat_rules`);
    const info = stmt.run();
    return info.changes;
}
