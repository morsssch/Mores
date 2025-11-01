import { Bot } from "grammy";
import { BotContext } from "../types/context";
import { addTask } from "../db/tasks";
import { cleanTaskText, formatTaskPreview } from "../utils/taskHelpers";
import { taskInlineKeyboard } from "../keyboards";
import { InlineKeyboard } from "grammy";
import { parseDateFromText } from "../utils/parseDate";
import { parseTimeFromText } from "../utils/parseTime";
import { verifyPayloadCompact } from "../utils/hmac";
import { setTaskStatus, getTaskById, deleteTask, deleteTasksByParent, getTasks, addTask as addTaskDb } from "../db/tasks";
import { addReminder, deleteRemindersForTask } from "../db/reminders";
import { addRepeatRule, getRepeatRulesForTask, deleteRepeatRule } from "../db/repeatRules";
import { addToWhitelist, removeFromWhitelist } from "../db/master";

// Deadline handling moved to deadlineHandlers.ts

export async function handleSaveTaskCallback(ctx: BotContext) {
    if (!ctx.session.tempTaskText) {
        await ctx.reply("Сначала создай задачу!");
        return;
    }

    try {
        const today = new Date().toISOString().split("T")[0];

        const id = addTaskDb({
            text: ctx.session.tempTaskText,
            due_date: ctx.session.tempDue ?? null,
            due_time: ctx.session.tempDueTime ?? null,
            repeat_pattern: null,
            remind_interval: null,
            chat_id: ctx.chat?.id ?? ctx.from?.id ?? null,
        });

        // if a temp reminder was set during creation, persist it
        let reminderInfo = "";
        if (ctx.session.tempReminder) {
            try {
                addReminder(id as number, ctx.session.tempReminder, ctx.chat?.id ?? ctx.from?.id ?? undefined);
                const rd = new Date(ctx.session.tempReminder);
                reminderInfo = `\n\n🔔 Напомню: ${rd.toLocaleString()}`;
            } catch (e) {
                console.error("Ошибка при сохранении напоминания:", e);
            }
        }

        // if temp repeat entries exist, persist them as repeat_rules
        let repeatInfo = "";
        if (ctx.session.tempRepeatEntries && Array.isArray(ctx.session.tempRepeatEntries)) {
            try {
                for (const entry of ctx.session.tempRepeatEntries) {
                    if (entry.type === 'daily') {
                        addRepeatRule({ task_id: id as number, type: 'daily', payload: JSON.stringify({ time: entry.time }), timezone: null }, ctx.chat?.id ?? ctx.from?.id ?? undefined);
                        repeatInfo += `\nКаждый день в ${entry.time}`;
                    } else if (entry.type === 'weekly') {
                        addRepeatRule({ task_id: id as number, type: 'weekly', payload: JSON.stringify({ weekday: entry.weekday, time: entry.time }), timezone: null }, ctx.chat?.id ?? ctx.from?.id ?? undefined);
                        repeatInfo += `\nКаждую неделю в ${entry.time}`;
                    } else if (entry.type === 'custom') {
                        // store single custom entry
                        addRepeatRule({ task_id: id as number, type: 'custom', payload: JSON.stringify(entry), timezone: null }, ctx.chat?.id ?? ctx.from?.id ?? undefined);
                        // format human-friendly summary
                        try {
                            const { formatRepeatEntry } = await import('../utils/repeatHelpers');
                            repeatInfo += `\n${formatRepeatEntry(entry)}`;
                        } catch (_) {
                            repeatInfo += `\nПовторение: ${JSON.stringify(entry)}`;
                        }
                    }
                }
            } catch (e) {
                console.error('Ошибка при сохранении повторений:', e);
            }
        }

        await ctx.reply(`✅ Задача "${ctx.session.tempTaskText}" сохранена!${reminderInfo}${repeatInfo}`);

    ctx.session.tempTaskText = undefined;
    ctx.session.tempDue = undefined;
    ctx.session.tempDueTime = undefined;
    // clear repeat temp state so next creation doesn't inherit it
    ctx.session.tempRepeatEntries = undefined;
    ctx.session.tempRepeatPattern = undefined;
        ctx.session.awaitingNewTask = false;
        ctx.session.tempReminder = undefined;
        ctx.session.awaitingReminderDate = false;
    } catch (error) {
        console.error("Ошибка при сохранении задачи:", error);
        await ctx.reply("❌ Произошла ошибка при сохранении задачи");
    }
}

export async function handleNewTaskMessage(ctx: BotContext, text: string) {
    const parsedDate = parseDateFromText(text);
    const parsedTime = parseTimeFromText(text);

    // removed debug logs

    ctx.session.tempTaskText = cleanTaskText(
        text,
        parsedDate?.textMatch,
        parsedTime?.textMatch
    );
    ctx.session.tempDue = parsedDate?.date; 
    ctx.session.tempDueTime = parsedTime?.time;
    ctx.session.awaitingNewTask = false;

    // removed debug logs

    await ctx.reply(
        formatTaskPreview(
            ctx.session.tempTaskText,
            ctx.session.tempDue,
            ctx.session.tempDueTime
        ) + `\n\nВыбери действие:`,
        { reply_markup: taskInlineKeyboard }
    );
}

export function registerTaskHandlers(bot: Bot<BotContext>) {
    // Quick commands to mark done or delete by id
    bot.command('done', async (ctx) => {
        try {
            const text = ctx.message?.text || '';
            const parts = text.trim().split(/\s+/);
            if (parts.length < 2) {
                await ctx.reply('Использование: /done <id> [YYYY-MM-DD]');
                return;
            }
            const id = Number(parts[1]);
            if (isNaN(id)) {
                await ctx.reply('Неверный id.');
                return;
            }
            const chatId = ctx.chat?.id ?? ctx.from?.id ?? undefined;
            const task = getTaskById(id, chatId);
            if (!task) {
                await ctx.reply(`Задача с id ${id} не найдена.`);
                return;
            }
            // optional date parameter
            let targetDate: string | null = null;
            if (parts.length >= 3) {
                // try parse as ISO YYYY-MM-DD or free text via parser
                const maybe = parts.slice(2).join(' ');
                const parsed = parseDateFromText(maybe);
                if (parsed && parsed.date) {
                    targetDate = parsed.date;
                } else if (/^\d{4}-\d{2}-\d{2}$/.test(maybe)) {
                    targetDate = maybe;
                } else {
                    await ctx.reply('Не удалось распознать дату. Используйте формат YYYY-MM-DD или понятную дату.');
                    return;
                }
            }

            const rules = getRepeatRulesForTask(id, chatId);
            if (rules && rules.length > 0) {
                // For repeating tasks, mark only this occurrence as completed by creating a one-off completed task for the given date (or today).
                const { addTask: _addTask } = await import('../db/tasks');
                const day = targetDate ?? new Date().toISOString().split('T')[0];
                const newId = _addTask({
                    text: task.text,
                    due_date: day,
                    due_time: task.due_time ?? null,
                    repeat_pattern: null,
                    remind_interval: null,
                    chat_id: task.chat_id ?? ctx.chat?.id ?? ctx.from?.id ?? null,
                    parent_id: id,
                });
                // mark new occurrence as completed
                setTaskStatus(newId as number, 'completed', new Date().toISOString(), chatId);
                await ctx.reply(`Задача ${String(id).padStart(4,'0')} отмечена как выполненная для ${day} (серия сохранена).`);
            } else {
                // Non-repeating: if date provided and differs from task due_date, inform user that date param applies to repeating tasks only.
                if (targetDate && task.due_date && targetDate !== task.due_date) {
                    await ctx.reply('Параметр даты применяется только к повторяющимся задачам. Для этой задачи дата не совпадает с её дедлайном. Используйте /done <id> без даты.');
                    return;
                }
                // mark master as completed
                setTaskStatus(id, 'completed', new Date().toISOString(), chatId);
                await ctx.reply(`Задача ${String(id).padStart(4,'0')} помечена как выполненная.`);
            }
        } catch (e) {
            console.error('Error in /done command', e);
            await ctx.reply('Ошибка выполнения /done');
        }
    });

    bot.command('del', async (ctx) => {
        try {
            const text = ctx.message?.text || '';
            const parts = text.trim().split(/\s+/);
            if (parts.length < 2) {
                await ctx.reply('Использование: /del <id>');
                return;
            }
            const id = Number(parts[1]);
            if (isNaN(id)) {
                await ctx.reply('Неверный id.');
                return;
            }
            const chatId = ctx.chat?.id ?? ctx.from?.id ?? undefined;
            const task = getTaskById(id, chatId);
            if (!task) {
                await ctx.reply(`Задача с id ${id} не найдена.`);
                return;
            }

            // if task has repeat rules, delete them as well (delete whole series)
            try {
                const rules = getRepeatRulesForTask(id, chatId);
                if (rules && rules.length > 0) {
                    for (const r of rules) {
                        if (r.id) deleteRepeatRule(r.id, chatId);
                    }
                }
            } catch (e) {
                console.error('Ошибка при удалении правил повторения:', e);
            }

            // delete reminders associated with this task and occurrences
            try { deleteRemindersForTask(id, chatId); } catch (_) {}
            try {
                // for occurrences created from parent, delete their reminders too
                const { getTasks } = await import('../db/tasks');
                const all = getTasks(chatId);
                for (const t of all) {
                    if (t.parent_id === id) {
                        try { deleteRemindersForTask(t.id as number, chatId); } catch (_) {}
                    }
                }
            } catch (e) { /* ignore */ }

            // Soft-delete occurrences and the master task
            try { deleteTasksByParent(id, chatId); } catch (e) { console.error('Ошибка при удалении дочерних задач:', e); }
            try { deleteTask(id, chatId); } catch (e) { console.error('Ошибка при удалении задачи:', e); }

            await ctx.reply(`Задача ${String(id).padStart(4,'0')} и все её повторяющиеся вхождения удалены.`);
        } catch (e) {
            console.error('Error in /del command', e);
            await ctx.reply('Ошибка выполнения /del');
        }
    });

    // Owner/utility: normalize default times (convert 23:59 -> NULL for likely-defaulted tasks)
    bot.command('normalize_times', async (ctx) => {
        try {
            const chatId = ctx.chat?.id ?? ctx.from?.id!;
            // allow only owner or same user (for per-user run). If ADMIN_CHAT_ID is set, require it.
            const admin = process.env.ADMIN_CHAT_ID ? Number(process.env.ADMIN_CHAT_ID) : null;
            if (admin && admin !== chatId) {
                await ctx.reply('Команда доступна только администратору.');
                return;
            }
            const { normalizeDefaultTimes } = await import('../db/tasks');
            const changed = normalizeDefaultTimes(chatId);
            await ctx.reply(`Нормализовано ${changed} задач.`);
        } catch (e) {
            console.error('Ошибка normalize_times:', e);
            await ctx.reply('Ошибка при нормализации времени');
        }
    });

    bot.callbackQuery("save_task", handleSaveTaskCallback);
    // Reminder setup during task creation (preset + custom)
    bot.callbackQuery("set_reminder", async (ctx) => {
        try {
            if (!ctx.session.tempTaskText) {
                await ctx.reply("Сначала создай задачу!");
                await ctx.answerCallbackQuery();
                return;
            }

            const kb = new InlineKeyboard()
                .text("Через час", "set_reminder_1h")
                .text("Через день", "set_reminder_1d")
                .row()
                .text("Другая дата", "set_reminder_custom")
                .text("Отмена", "cancel_temp_reminder");

            await ctx.answerCallbackQuery();
            await ctx.reply("Выбери когда напомнить:", { reply_markup: kb });
        } catch (e) {
            console.error("Ошибка при выборе напоминания:", e);
            try { await ctx.answerCallbackQuery(); } catch (_) {}
        }
    });

    bot.callbackQuery("set_reminder_1h", async (ctx) => {
        try {
            if (!ctx.session.tempTaskText) {
                await ctx.reply("Сначала создай задачу!");
                await ctx.answerCallbackQuery();
                return;
            }
            const remindAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
            ctx.session.tempReminder = remindAt;
            ctx.session.awaitingReminderDate = false;
            await ctx.answerCallbackQuery({ text: "⏰ Напоминание: через час" });
            await ctx.reply(
                formatTaskPreview(
                    ctx.session.tempTaskText!,
                    ctx.session.tempDue as string | undefined,
                    ctx.session.tempDueTime,
                    ctx.session.tempReminder
                ) + `\n\nСохранится при сохранении задачи.`,
                { reply_markup: taskInlineKeyboard }
            );
        } catch (e) {
            console.error("Ошибка set_reminder_1h:", e);
            try { await ctx.answerCallbackQuery(); } catch (_) {}
        }
    });

    bot.callbackQuery("set_reminder_1d", async (ctx) => {
        try {
            if (!ctx.session.tempTaskText) {
                await ctx.reply("Сначала создай задачу!");
                await ctx.answerCallbackQuery();
                return;
            }
            const remindAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
            ctx.session.tempReminder = remindAt;
            ctx.session.awaitingReminderDate = false;
            await ctx.answerCallbackQuery({ text: "⏰ Напоминание: через день" });
            await ctx.reply(
                formatTaskPreview(
                    ctx.session.tempTaskText!,
                    ctx.session.tempDue as string | undefined,
                    ctx.session.tempDueTime,
                    ctx.session.tempReminder
                ) + `\n\nСохранится при сохранении задачи.`,
                { reply_markup: taskInlineKeyboard }
            );
        } catch (e) {
            console.error("Ошибка set_reminder_1d:", e);
            try { await ctx.answerCallbackQuery(); } catch (_) {}
        }
    });

    bot.callbackQuery("set_reminder_custom", async (ctx) => {
        try {
            if (!ctx.session.tempTaskText) {
                await ctx.reply("Сначала создай задачу!");
                await ctx.answerCallbackQuery();
                return;
            }
            ctx.session.awaitingReminderDate = true;
            await ctx.answerCallbackQuery();
            await ctx.reply(
                "Отправь дату и время напоминания в свободной форме (например: завтра в 9:00 или 31.10.2025 18:00)."
            );
        } catch (e) {
            console.error("Ошибка set_reminder_custom:", e);
            try { await ctx.answerCallbackQuery(); } catch (_) {}
        }
    });

    bot.callbackQuery("cancel_temp_reminder", async (ctx) => {
        try {
            ctx.session.tempReminder = undefined;
            ctx.session.awaitingReminderDate = false;
            await ctx.answerCallbackQuery({ text: "❌ Напоминание отменено" });
        } catch (e) {
            console.error("Ошибка cancel_temp_reminder:", e);
            try { await ctx.answerCallbackQuery(); } catch (_) {}
        }
    });
    // allow cancelling creation from the inline keyboard
    bot.callbackQuery("cancel_task", async (ctx) => {
        try {
            ctx.session.tempTaskText = undefined;
            ctx.session.tempDue = undefined;
            ctx.session.tempDueTime = undefined;
            ctx.session.tempRepeatEntries = undefined;
            ctx.session.tempRepeatPattern = undefined;
            ctx.session.awaitingNewTask = false;
            await ctx.answerCallbackQuery({ text: "❌ Создание задачи отменено" });
            await ctx.reply("Создание задачи отменено.", { reply_markup: (await import("../keyboards")).getPersistentKeyboard() });
        } catch (e) {
            console.error("Ошибка при отмене создания:", e);
            try { await ctx.answerCallbackQuery(); } catch (_) {}
        }
    });

    // debug mode toggle + diagnostic snapshot
    bot.command('debug', async (ctx) => {
        try {
            const chatId = ctx.chat?.id ?? ctx.from?.id!;
            const { getUserSettings, upsertUserSettings } = await import('../db/settings');
            const s = getUserSettings(chatId);
            const newDebug = s.debug ? 0 : 1;
            upsertUserSettings(chatId, s.daily_summary as any, s.weekly_summary as any, newDebug as 0 | 1);
            await ctx.reply(`Debug mode ${newDebug ? 'ON' : 'OFF'}`);

            // send diagnostic snapshot
            if (newDebug) {
                const { getTasks, getInboxTasks, getTaskById } = await import('../db/tasks');
                const { getDueReminders, getRemindersForTask } = await import('../db/reminders');
                const { getRepeatRulesForTask } = await import('../db/repeatRules');

                const pending = getTasks(chatId as number);
                const inbox = getInboxTasks(chatId as number);
                const dueRem = getDueReminders(50, chatId as number);

                let msg = `🛠 *Debug snapshot*\n`;
                msg += `• Всего активных задач: ${pending.length}\n`;
                msg += `• Входящие (без даты/времени): ${inbox.length}\n`;
                msg += `• Напоминаний, готовых к отправке: ${dueRem.length}\n\n`;

                if (pending.length > 0) {
                    msg += `*Задачи (5)*\n`;
                    pending.slice(0,5).forEach((t:any)=> { msg += `${String(t.id).padStart(4,'0')} // ${t.text} ${t.due_date || ''} ${t.due_time || ''}\n`; });
                    msg += `\n`;
                }

                if (dueRem.length > 0) {
                    msg += `*Напоминания (5)*\n`;
                    dueRem.slice(0,5).forEach((r:any)=> { msg += `rem#${r.id} -> task ${String(r.task_id).padStart(4,'0')} at ${r.remind_at}\n`; });
                    msg += `\n`;
                }

                await ctx.reply(msg, { parse_mode: 'Markdown' });
            }
        } catch (e) {
            console.error('Ошибка /debug:', e);
            await ctx.reply('Ошибка при переключении debug');
        }
    });

    // Generic callback data handler for signed actions
    bot.on("callback_query:data", async (ctx, next) => {
        try {
            const data = ctx.callbackQuery?.data;
            if (!data) return await next();
            const payload = verifyPayloadCompact(data);
            if (!payload) {
                // Not our signed callback_data — allow other handlers (like set_deadline) to process it.
                return await next();
            }
            const action = (payload as any).action;
            const taskId = (payload as any).taskId;
            const minutes = (payload as any).minutes;

            if (!action || !taskId) {
                await ctx.answerCallbackQuery({ text: "⚠️ Неверные данные" });
                return;
            }

            const chatIdForAction = ctx.chat?.id ?? ctx.from?.id ?? undefined;
            if (action === "complete") {
                setTaskStatus(taskId, "completed", new Date().toISOString(), chatIdForAction);
                await ctx.answerCallbackQuery({ text: "✅ Отмечено как выполненное" });
                return;
            }

            if (action === "delete") {
                setTaskStatus(taskId, "deleted", undefined, chatIdForAction);
                await ctx.answerCallbackQuery({ text: "🗑 Задача удалена" });
                return;
            }

            if (action === "snooze") {
                const mins = minutes || 10;
                const remindAt = new Date(Date.now() + mins * 60 * 1000).toISOString();
                addReminder(taskId, remindAt, chatIdForAction);
                await ctx.answerCallbackQuery({ text: `⏰ Отложено на ${mins} минут` });
                return;
            }

            await ctx.answerCallbackQuery({ text: "⚠️ Неизвестное действие" });
            return;
        } catch (error) {
            console.error("Ошибка обработки callback_query:", error);
            try {
                await ctx.answerCallbackQuery({ text: "❌ Ошибка при обработке действия" });
            } catch (_) {}
        }
    });

    // Admin: unlock (add to whitelist) and ban (remove from whitelist)
    bot.command('unlock', async (ctx) => {
        const owner = process.env.ADMIN_USERNAME ?? 'morssssss';
        const sender = ctx.from?.username;
        if (sender !== owner && String(ctx.from?.id) !== process.env.ADMIN_CHAT_ID) {
            await ctx.reply('Только владелец может использовать эту команду');
            return;
        }
        const text = ctx.message?.text || '';
        const parts = text.trim().split(/\s+/);
        let targetId: number | undefined;
        if (ctx.message && ctx.message.reply_to_message) {
            targetId = ctx.message.reply_to_message.from?.id;
        } else if (parts.length >= 2 && /^\d+$/.test(parts[1])) {
            targetId = Number(parts[1]);
        } else {
            await ctx.reply('Использование: /unlock <userId> или ответьте на сообщение пользователя командой /unlock');
            return;
        }
        addToWhitelist(targetId!);
        await ctx.reply(`Пользователь ${targetId} добавлен в белый список`);
    });

    bot.command('ban', async (ctx) => {
        const owner = process.env.ADMIN_USERNAME ?? 'morssssss';
        const sender = ctx.from?.username;
        if (sender !== owner && String(ctx.from?.id) !== process.env.ADMIN_CHAT_ID) {
            await ctx.reply('Только владелец может использовать эту команду');
            return;
        }
        const text = ctx.message?.text || '';
        const parts = text.trim().split(/\s+/);
        let targetId: number | undefined;
        if (ctx.message && ctx.message.reply_to_message) {
            targetId = ctx.message.reply_to_message.from?.id;
        } else if (parts.length >= 2 && /^\d+$/.test(parts[1])) {
            targetId = Number(parts[1]);
        } else {
            await ctx.reply('Использование: /ban <userId> или ответьте на сообщение пользователя командой /ban');
            return;
        }
        removeFromWhitelist(targetId!);
        await ctx.reply(`Пользователь ${targetId} удалён из белого списка`);
    });
}
