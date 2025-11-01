import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

// Master DB (registry). Per-user DBs are created on demand.
const useDbPath = process.env.DB_PATH;
const masterPath = useDbPath ? useDbPath : (process.env.MASTER_DB_PATH ? process.env.MASTER_DB_PATH : path.resolve("mores_master.db"));
const masterDb = new Database(masterPath);

const migrationPath = path.resolve("src/db/migrations.sql");
const migration = fs.readFileSync(migrationPath, "utf8");
// apply migrations to master DB as well
masterDb.exec(migration);

// cache for per-user DBs
const userDbCache: Map<number, any> = new Map();

export function getDbForChat(chatId?: number): any {
	// In test mode (DB_PATH provided), use the single DB for all users
	if (useDbPath) return masterDb;
	if (!chatId) return masterDb;
	const id = Number(chatId);
	if (userDbCache.has(id)) return userDbCache.get(id)!;
	const userDir = path.resolve("data");
	if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
	const userPath = path.resolve(userDir, `mores_${id}.db`);
	const userDb = new Database(userPath);
	// apply migrations to ensure schema
	userDb.exec(migration);
	// ensure runtime migrations for this user DB (add chat_id, parent_id, reminders cols if missing)
	function columnExistsLocal(dbInst: any, table: string, column: string) {
		try {
			const stmt = dbInst.prepare(`PRAGMA table_info(${table})`);
			const rows = stmt.all() as any[];
			return rows.some((r) => r.name === column);
		} catch (e) {
			return false;
		}
	}

	try {
		if (!columnExistsLocal(userDb, 'tasks', 'chat_id')) {
			userDb.prepare("ALTER TABLE tasks ADD COLUMN chat_id INTEGER").run();
		}
		if (!columnExistsLocal(userDb, 'tasks', 'parent_id')) {
			userDb.prepare("ALTER TABLE tasks ADD COLUMN parent_id INTEGER").run();
		}
		if (columnExistsLocal(userDb, 'reminders', 'remind_at') === false) {
			try { userDb.prepare("ALTER TABLE reminders ADD COLUMN remind_at TEXT").run(); } catch(_) {}
		}

		// ensure user_settings.debug exists for per-user DBs
		if (columnExistsLocal(userDb, 'user_settings', 'debug') === false) {
			try { userDb.prepare("ALTER TABLE user_settings ADD COLUMN debug INTEGER DEFAULT 0").run(); } catch(_) {}
		}
	} catch (e) {
		console.error('Error applying runtime migrations for user DB', userPath, e);
	}
	userDbCache.set(id, userDb);
	return userDb;
}

// Ensure migrations for existing DB: add missing columns if necessary
// Ensure migrations for existing master DB: add missing columns if necessary
function columnExists(table: string, column: string) {
	try {
		const stmt = masterDb.prepare(`PRAGMA table_info(${table})`);
		const rows = stmt.all() as any[];
		return rows.some((r) => r.name === column);
	} catch (e) {
		return false;
	}
}

try {
	// tasks: status, completed_at
	if (!columnExists("tasks", "status")) {
		masterDb.prepare("ALTER TABLE tasks ADD COLUMN status TEXT DEFAULT 'pending'").run();
	}
	if (!columnExists("tasks", "completed_at")) {
		masterDb.prepare("ALTER TABLE tasks ADD COLUMN completed_at TEXT").run();
	}
	if (!columnExists("tasks", "chat_id")) {
		console.log("Migrating: add column tasks.chat_id");
		masterDb.prepare("ALTER TABLE tasks ADD COLUMN chat_id INTEGER").run();
	}

	// parent_id to link one-off occurrences to a repeating master task
	if (!columnExists("tasks", "parent_id")) {
		console.log("Migrating: add column tasks.parent_id");
		masterDb.prepare("ALTER TABLE tasks ADD COLUMN parent_id INTEGER").run();
	}

	// reminders: if table exists, ensure columns exist; if not, it was created by migrations above
	const remTable = masterDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='reminders'").get();
	if (remTable) {
		if (!columnExists("reminders", "sent")) {
			masterDb.prepare("ALTER TABLE reminders ADD COLUMN sent INTEGER DEFAULT 0").run();
		}
		if (!columnExists("reminders", "remind_at")) {
			masterDb.prepare("ALTER TABLE reminders ADD COLUMN remind_at TEXT").run();
			// try to migrate data from old next_trigger if exists
			try {
				masterDb.prepare("UPDATE reminders SET remind_at = next_trigger WHERE next_trigger IS NOT NULL").run();
			} catch (e) {
				// ignore if next_trigger doesn't exist
			}
		}
		if (!columnExists("reminders", "created_at")) {
			masterDb.prepare("ALTER TABLE reminders ADD COLUMN created_at TEXT DEFAULT (datetime('now'))").run();
		}
	}

	// ensure user_settings.debug column exists in master DB as well
	try {
		if (!columnExists('user_settings', 'debug')) {
			masterDb.prepare("ALTER TABLE user_settings ADD COLUMN debug INTEGER DEFAULT 0").run();
		}
	} catch (e) {
		// ignore
	}
} catch (e) {
	console.error("Error while applying runtime migrations:", e);
}

export default masterDb;
