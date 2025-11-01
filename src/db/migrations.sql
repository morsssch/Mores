CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  due_date TEXT,
  due_time TEXT,
  repeat_pattern TEXT,
  remind_interval TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  status TEXT DEFAULT 'pending', -- pending / completed / deleted
  completed_at TEXT NULL
);

CREATE TABLE IF NOT EXISTS reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  remind_at TEXT NOT NULL, -- ISO UTC
  sent INTEGER DEFAULT 0, -- boolean 0/1
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

CREATE TABLE IF NOT EXISTS repeat_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  type TEXT NOT NULL, -- daily | weekly | custom
  payload TEXT, -- JSON payload depending on type
  timezone TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

CREATE TABLE IF NOT EXISTS stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT,
  done_count INTEGER DEFAULT 0,
  total_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL UNIQUE,
  daily_summary TEXT DEFAULT 'off', -- 'off' | 'morning' | 'evening' | 'both'
  weekly_summary INTEGER DEFAULT 0, -- 0/1
  created_at TEXT DEFAULT (datetime('now'))
);
