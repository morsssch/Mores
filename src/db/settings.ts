import db, { getDbForChat } from './db';

export type UserSettings = {
    id?: number;
    chat_id: number;
    daily_summary: 'off' | 'morning' | 'evening' | 'both';
    weekly_summary: 0 | 1;
    debug?: 0 | 1;
    created_at?: string;
};

export function getUserSettings(chatId: number): UserSettings {
    const dbInstance = getDbForChat(chatId);
    const stmt = dbInstance.prepare('SELECT * FROM user_settings WHERE chat_id = ?');
    const row = stmt.get(chatId);
    if (!row) {
        return { chat_id: chatId, daily_summary: 'off', weekly_summary: 0, debug: 0 };
    }
    // ensure debug present
    if (typeof row.debug === 'undefined') row.debug = 0;
    return row as UserSettings;
}

export function upsertUserSettings(chatId: number, daily: UserSettings['daily_summary'], weekly: UserSettings['weekly_summary'], debug: UserSettings['debug'] = 0): void {
    const dbInstance = getDbForChat(chatId);
    // try update first (include debug)
    const upd = dbInstance.prepare('UPDATE user_settings SET daily_summary = ?, weekly_summary = ?, debug = ? WHERE chat_id = ?');
    const info = upd.run(daily, weekly, debug, chatId);
    if (info.changes === 0) {
        const ins = dbInstance.prepare('INSERT INTO user_settings (chat_id, daily_summary, weekly_summary, debug) VALUES (?, ?, ?, ?)');
        ins.run(chatId, daily, weekly, debug);
    }
}

export function deleteUserSettings(chatId: number): void {
    const dbInstance = getDbForChat(chatId);
    const stmt = dbInstance.prepare('DELETE FROM user_settings WHERE chat_id = ?');
    stmt.run(chatId);
}
