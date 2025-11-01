import db, { getDbForChat } from "../db/db";
import { Bot } from "grammy";
import { getDueReminders, markReminderSent } from "../db/reminders";
import { getTaskById } from "../db/tasks";
import { getAllUsers } from "../db/master";
import { BotContext } from "../types/context";

const POLL_INTERVAL_MS = Number(process.env.REMINDER_POLL_MS) || 30_000;

export function startRemindersWorker(bot: Bot<BotContext>) {
	// reminders worker started (logs suppressed)

	async function poll() {
		try {
			const users = getAllUsers();
			for (const u of users) {
				try {
					const due = getDueReminders(50, u);
					if (!due || due.length === 0) continue;

					const userDb = getDbForChat(u);

					for (const r of due) {
						try {
							// transactional mark-as-sent + check within user's DB
							const txn = userDb.transaction((reminderId: number, taskId: number) => {
								const tStmt = userDb.prepare("SELECT status FROM tasks WHERE id = ?");
								const t = tStmt.get(taskId);
								if (!t) return false;
								if ((t as any).status !== "pending") return false;

								const mStmt = userDb.prepare("UPDATE reminders SET sent = 1 WHERE id = ? AND sent = 0");
								const info = mStmt.run(reminderId);
								return info.changes > 0;
							});

							const ok = txn(r.id!, r.task_id);
							if (!ok) continue;

							const task = getTaskById(r.task_id, u);
							if (!task) continue;

							// prefer task.chat_id, then registered user id (u)
							const chat = (task as any).chat_id ?? u ?? process.env.ADMIN_CHAT_ID;
							const text = `Напоминание: ${task.text}`;
							if (chat) {
								const { reminderActionKeyboard } = await import("../keyboards");
								try {
									await bot.api.sendMessage(chat, text, {
										reply_markup: reminderActionKeyboard(task.id as number),
									});
								} catch (e) {
									console.error("Failed to send reminder message:", e);
								}
							}
						} catch (err) {
							console.error("Ошибка при обработке напоминания:", err);
						}
					}
				} catch (e) {
					console.error('Ошибка при получении напоминаний для пользователя', u, e);
				}
			}
		} catch (err) {
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

