import db from './db';

// Ensure master tables exist on import
try {
    db.prepare('CREATE TABLE IF NOT EXISTS users (chat_id INTEGER PRIMARY KEY)').run();
    db.prepare('CREATE TABLE IF NOT EXISTS whitelist (chat_id INTEGER PRIMARY KEY)').run();
} catch (e) {
    console.error('Error ensuring master tables exist:', e);
}

export function registerUser(chatId: number) {
    try {
        const ins = db.prepare('INSERT OR IGNORE INTO users (chat_id) VALUES (?)');
        ins.run(chatId);
    } catch (e) {
        console.error('Error registering user in master DB:', e);
    }
}

export function getAllUsers(): number[] {
    try {
        // ensure table exists (be defensive in case DB was just created)
        db.prepare('CREATE TABLE IF NOT EXISTS users (chat_id INTEGER PRIMARY KEY)').run();
        const stmt = db.prepare('SELECT chat_id FROM users');
        const rows = stmt.all();
        return rows.map((r: any) => r.chat_id as number);
    } catch (e) {
        console.error('Error fetching users from master DB:', e);
        return [];
    }
}

export function addToWhitelist(chatId: number) {
    try {
        const ins = db.prepare('INSERT OR IGNORE INTO whitelist (chat_id) VALUES (?)');
        ins.run(chatId);
    } catch (e) {
        console.error('Error adding to whitelist:', e);
    }
}

export function removeFromWhitelist(chatId: number) {
    try {
        const stmt = db.prepare('DELETE FROM whitelist WHERE chat_id = ?');
        stmt.run(chatId);
    } catch (e) {
        console.error('Error removing from whitelist:', e);
    }
}

export function isWhitelisted(chatId: number): boolean {
    try {
        const stmt = db.prepare('SELECT chat_id FROM whitelist WHERE chat_id = ?');
        const row = stmt.get(chatId);
        return !!row;
    } catch (e) {
        console.error('Error checking whitelist:', e);
        return false;
    }
}
