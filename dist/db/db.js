"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Allow using a custom DB path in tests via DB_PATH env (use ':memory:' for in-memory)
const dbPath = process.env.DB_PATH ? process.env.DB_PATH : path_1.default.resolve("mores.db");
const db = new better_sqlite3_1.default(dbPath);
const migrationPath = path_1.default.resolve("src/db/migrations.sql");
const migration = fs_1.default.readFileSync(migrationPath, "utf8");
db.exec(migration);
// Ensure migrations for existing DB: add missing columns if necessary
function columnExists(table, column) {
    try {
        const stmt = db.prepare(`PRAGMA table_info(${table})`);
        const rows = stmt.all();
        return rows.some((r) => r.name === column);
    }
    catch (e) {
        return false;
    }
}
try {
    // tasks: status, completed_at
    if (!columnExists("tasks", "status")) {
        db.prepare("ALTER TABLE tasks ADD COLUMN status TEXT DEFAULT 'pending'").run();
    }
    if (!columnExists("tasks", "completed_at")) {
        db.prepare("ALTER TABLE tasks ADD COLUMN completed_at TEXT").run();
    }
    if (!columnExists("tasks", "chat_id")) {
        console.log("Migrating: add column tasks.chat_id");
        db.prepare("ALTER TABLE tasks ADD COLUMN chat_id INTEGER").run();
    }
    // reminders: if table exists, ensure columns exist; if not, it was created by migrations above
    const remTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='reminders'").get();
    if (remTable) {
        if (!columnExists("reminders", "sent")) {
            db.prepare("ALTER TABLE reminders ADD COLUMN sent INTEGER DEFAULT 0").run();
        }
        if (!columnExists("reminders", "remind_at")) {
            db.prepare("ALTER TABLE reminders ADD COLUMN remind_at TEXT").run();
            // try to migrate data from old next_trigger if exists
            try {
                db.prepare("UPDATE reminders SET remind_at = next_trigger WHERE next_trigger IS NOT NULL").run();
            }
            catch (e) {
                // ignore if next_trigger doesn't exist
            }
        }
        if (!columnExists("reminders", "created_at")) {
            db.prepare("ALTER TABLE reminders ADD COLUMN created_at TEXT DEFAULT (datetime('now'))").run();
        }
    }
}
catch (e) {
    console.error("Error while applying runtime migrations:", e);
}
exports.default = db;
