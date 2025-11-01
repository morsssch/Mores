"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startRemindersWorker = startRemindersWorker;
const db_1 = __importDefault(require("../db/db"));
const reminders_1 = require("../db/reminders");
const tasks_1 = require("../db/tasks");
const POLL_INTERVAL_MS = Number(process.env.REMINDER_POLL_MS) || 30000;
function startRemindersWorker(bot) {
    // reminders worker started (logs suppressed)
    async function poll() {
        try {
            const due = (0, reminders_1.getDueReminders)(50);
            if (!due || due.length === 0)
                return;
            for (const r of due) {
                try {
                    // transactional mark-as-sent + check
                    const txn = db_1.default.transaction((reminderId, taskId) => {
                        // re-check task status
                        const tStmt = db_1.default.prepare("SELECT status FROM tasks WHERE id = ?");
                        const t = tStmt.get(taskId);
                        if (!t)
                            return false;
                        if (t.status !== "pending")
                            return false;
                        // mark reminder sent
                        const mStmt = db_1.default.prepare("UPDATE reminders SET sent = 1 WHERE id = ? AND sent = 0");
                        const info = mStmt.run(reminderId);
                        return info.changes > 0;
                    });
                    const ok = txn(r.id, r.task_id);
                    if (!ok)
                        continue;
                    const task = (0, tasks_1.getTaskById)(r.task_id);
                    if (!task)
                        continue;
                    // send message to owner — for now we don't track owner in task, so broadcast to last known chat? 
                    // Minimal: if task has no user, skip sending. If you have chat id in task, prefer it. 
                    // For now send to bot owner if ADMIN_CHAT_ID provided.
                    const chat = task.chat_id ?? process.env.ADMIN_CHAT_ID;
                    const text = `Напоминание: ${task.text}`;
                    if (chat) {
                        // send single message with keyboard (postpone/complete/delete)
                        const { reminderActionKeyboard } = await Promise.resolve().then(() => __importStar(require("../keyboards")));
                        try {
                            await bot.api.sendMessage(chat, text, {
                                reply_markup: reminderActionKeyboard(task.id),
                            });
                        }
                        catch (e) {
                            console.error("Failed to send reminder message:", e);
                        }
                    }
                    else {
                        // no chat available for reminder; suppressed verbose log
                    }
                }
                catch (err) {
                    console.error("Ошибка при обработке напоминания:", err);
                }
            }
        }
        catch (err) {
            console.error("Ошибка polling reminders:", err);
        }
    }
    // initial run
    poll().catch((e) => console.error(e));
    // periodic
    setInterval(() => {
        poll().catch((e) => console.error(e));
    }, POLL_INTERVAL_MS);
}
