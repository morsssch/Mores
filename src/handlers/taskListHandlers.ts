import { Bot } from "grammy";
import { BotContext } from "../types/context";
import {
    getTasksForToday,
    getTasksForTomorrow,
    getTasksForWeek,
    getAllTasksForWeek,
    getTasks,
    getInboxTasks,
    deleteCompletedTasks,
    clearAllTasks,
    getAllTasks,
} from "../db/tasks";
import { getUserSettings, upsertUserSettings } from "../db/settings";
import { getRepeatRulesForTask } from "../db/repeatRules";
import { clearRepeatRules } from "../db/repeatRules";
import { clearReminders } from "../db/reminders";
import { registerUser } from "../db/master";
import { InlineKeyboard } from "grammy";
import { getPersistentKeyboard } from "../keyboards";
import { formatDate } from "../utils/formatDate";

function formatTime(timeStr: string | null): string {
    if (!timeStr) return "";
    return `⏰ ${timeStr}`;
}

function padId(id: any): string {
    try {
        const n = Number(id) || 0;
        return String(n).padStart(4, "0");
    } catch (_) {
        return "0000";
    }
}

function formatTaskLine(task: any): string {
    const repeatIcon = task.repeat_pattern ? " 🔄" : "";
    const idPart = task.id ? padId(task.id) : "0000";
    const timeSegment = task.due_time ? ` — ${formatTime(task.due_time)}` : "";
    const line = `${idPart} // ${task.text || ""}${timeSegment}`;
    return `${line}${repeatIcon}`.trim();
}

function groupTasksByDate(tasks: any[]): { [key: string]: any[] } {
    return tasks.reduce((groups, task) => {
        const date = task.due_date || "Без даты";
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(task);
        return groups;
    }, {} as { [key: string]: any[] });
}

function isOverdue(task: any, referenceDate: string, compareTime: boolean = false): boolean {
    if (!task) return false;
    if (!task.due_date) return false;
    const dd = task.due_date;
    if (dd < referenceDate) return true;
    if (compareTime && dd === referenceDate) {
        if (!task.due_time) return false;
        // compare using Moscow time (UTC+3)
        const moscowNow = new Date(Date.now() + 3 * 60 * 60 * 1000);
        const nowH = String(moscowNow.getUTCHours()).padStart(2, '0');
        const nowM = String(moscowNow.getUTCMinutes()).padStart(2, '0');
        const nowStr = `${nowH}:${nowM}`;
        return task.due_time < nowStr;
    }
    return false;
}

function createWeekTasksMessage(tasks: any[]): string {
    if (tasks.length === 0) {
        return `📭 На неделю задач нет!\n\nМожно отдохнуть или добавить новые задачи 😊`;
    }

    // collect overdue tasks (due_date < today) using Moscow date
    const today = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().split('T')[0];
    const overdue = tasks.filter((t) => t.status !== 'completed' && t.due_date && t.due_date < today);
    // remove overdue from main list
    const remaining = tasks.filter((t) => !overdue.includes(t));

    const groupedTasks = groupTasksByDate(remaining);
    const dates = Object.keys(groupedTasks).sort();

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "completed").length;
    const pendingTasks = totalTasks - completedTasks;
    const repeatingTasks = tasks.filter((t) => t.repeat_pattern).length;

    let message = `🗓️ *Задачи на неделю* — всего ${totalTasks} (активных ${pendingTasks}, выполнено ${completedTasks})\n\n`;

    if (overdue.length > 0) {
        message += `*⚠️ Просроченные задачи (${overdue.length}):*\n`;
        overdue.forEach((t) => {
            message += `${formatTaskLine(t)}\n`;
        });
        message += `\n`;
    }

    dates.forEach((date) => {
        const dayTasks = groupedTasks[date];
        const completedCount = dayTasks.filter((t: any) => t.status === "completed").length;

        message += `*${formatDate(date)}*`;
        if (completedCount > 0) {
            message += ` — ${completedCount}/${dayTasks.length} выполнено`;
        }
        message += `\n`;

        dayTasks.forEach((task: any) => {
            message += `${formatTaskLine(task)}\n`;
        });

        message += `\n`;
    });

    message += `*📊 Статистика недели:*\n`;
    message += `• Всего задач: ${totalTasks}\n`;
    message += `• Активных: ${pendingTasks}\n`;
    message += `• Выполнено: ${completedTasks}\n`;
    if (repeatingTasks > 0) {
        message += `• Повторяющихся: ${repeatingTasks} 🔄\n`;
    }

    return message;
}

function createSimpleTasksMessage(tasks: any[], period: string, referenceDate?: string, compareTime: boolean = false): string {
    if (!referenceDate) referenceDate = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (tasks.length === 0) {
        return `📭 На ${period} задач нет!\n\nМожно отдохнуть или добавить новые задачи 😊`;
    }

    // determine overdue tasks based on referenceDate
    const overdue = tasks.filter((t) => t.status !== 'completed' && isOverdue(t, referenceDate!, compareTime));
    const rest = tasks.filter((t) => !overdue.includes(t));

    const completedTasks = rest.filter((t) => t.status === "completed");
    const pendingTasks = rest.filter((t) => t.status !== "completed");

    let message = `📋 *Задачи на ${period}* — всего ${tasks.length} (активных ${pendingTasks.length + overdue.length}, выполнено ${completedTasks.length})\n\n`;

    if (overdue.length > 0) {
        message += `*⚠️ Просроченные задачи (${overdue.length}):*\n`;
        overdue.forEach((task) => {
            message += `${formatTaskLine(task)}\n`;
        });
        message += `\n`;
    }

    if (pendingTasks.length > 0) {
        message += `*🔴 Активные задачи (${pendingTasks.length}):*\n`;
        pendingTasks.forEach((task) => {
            message += `${formatTaskLine(task)}\n`;
        });
        message += "\n";
    }

    if (completedTasks.length > 0) {
        message += `*✅ Выполненные задачи (${completedTasks.length}):*\n`;
        completedTasks.forEach((task, idx) => {
            message += `${idx + 1}. ✅ ${task.text}\n`;
        });
    }

    message += `\n*📊 Итого:* ${pendingTasks.length + overdue.length} активных, ${completedTasks.length} выполнено`;

    return message;
}

// === ХЕНДЛЕРЫ ===

export async function handleTodayTasks(ctx: BotContext) {
    try {
        const userId = ctx.from!.id;
        registerUser(userId);
        const today = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().split('T')[0];
        const tasks = await getTasksForToday(userId, today);

        const message = createSimpleTasksMessage(tasks, "сегодня", today, true);
        await ctx.reply(message, {
            parse_mode: "Markdown",
            reply_markup: getPersistentKeyboard(),
        });
    } catch (error) {
        console.error("Ошибка при получении задач на сегодня:", error);
        await ctx.reply("❌ Произошла ошибка при загрузке задач");
    }
}

export async function handleTomorrowTasks(ctx: BotContext) {
    try {
        const userId = ctx.from!.id;
        registerUser(userId);
        const moscowNow = new Date(Date.now() + 3 * 60 * 60 * 1000);
        const tomorrowDate = new Date(moscowNow);
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const tomorrowIso = tomorrowDate.toISOString().split('T')[0];

        const tasks = await getTasksForTomorrow(userId, tomorrowIso);
        const message = createSimpleTasksMessage(tasks, "завтра", tomorrowIso, false);

        await ctx.reply(message, {
            parse_mode: "Markdown",
            reply_markup: getPersistentKeyboard(),
        });
    } catch (error) {
        console.error("Ошибка при получении задач на завтра:", error);
        await ctx.reply("❌ Произошла ошибка при загрузке задач");
    }
}

export async function handleWeekTasks(ctx: BotContext) {
    try {
        const userId = ctx.from!.id;
        registerUser(userId);
    const moscowNow = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const startOfWeek = moscowNow.toISOString().split('T')[0];
    const endOfWeekDate = new Date(moscowNow);
    endOfWeekDate.setDate(endOfWeekDate.getDate() + 7);
    const endOfWeek = endOfWeekDate.toISOString().split('T')[0];

    // fetch concrete tasks that have due_date in the week — include completed for stats
    const tasks = await getAllTasksForWeek(userId, startOfWeek, endOfWeek);

        // also expand repeating tasks into occurrences within the week
        try {
            const allPending = getTasks(userId); // all pending tasks for this user
            const repeatsToAdd: any[] = [];
            const sDate = new Date(startOfWeek + 'T00:00:00');
            const eDate = new Date(endOfWeek + 'T00:00:00');

            // iterate tasks that have repeat rules
            for (const t of allPending) {
                const rules = getRepeatRulesForTask(t.id as number, userId);
                if (!rules || rules.length === 0) continue;

                for (const r of rules) {
                    if (!r.payload) continue;
                    let payload: any = {};
                    try { payload = JSON.parse(r.payload); } catch (_) { payload = {}; }

                    if (r.type === 'daily') {
                        // for each day in range
                        for (let d = new Date(sDate); d <= eDate; d.setDate(d.getDate() + 1)) {
                            const due = d.toISOString().split('T')[0];
                            repeatsToAdd.push({
                                ...t,
                                due_date: due,
                                due_time: payload.time ?? t.due_time,
                                _is_repeat: true,
                            });
                        }
                    } else if (r.type === 'weekly') {
                        const weekday = payload.weekday; // 0-6
                        if (weekday === undefined || weekday === null) continue;
                        for (let d = new Date(sDate); d <= eDate; d.setDate(d.getDate() + 1)) {
                            if (d.getDay() === Number(weekday)) {
                                const due = d.toISOString().split('T')[0];
                                repeatsToAdd.push({
                                    ...t,
                                    due_date: due,
                                    due_time: payload.time ?? t.due_time,
                                    _is_repeat: true,
                                });
                            }
                        }
                    } else if (r.type === 'custom') {
                        // payload expected { type:'custom', weekday, time }
                        const weekday = payload.weekday;
                        if (weekday === undefined || weekday === null) continue;
                        for (let d = new Date(sDate); d <= eDate; d.setDate(d.getDate() + 1)) {
                            if (d.getDay() === Number(weekday)) {
                                const due = d.toISOString().split('T')[0];
                                repeatsToAdd.push({
                                    ...t,
                                    due_date: due,
                                    due_time: payload.time ?? t.due_time,
                                    _is_repeat: true,
                                });
                            }
                        }
                    }
                }
            }

                // get all tasks in week (including completed) to avoid duplicates with exceptions / one-off occurrences
                const allTasksInWeek = getAllTasksForWeek(userId, startOfWeek, endOfWeek);
                for (const rpt of repeatsToAdd) {
                    const exists = allTasksInWeek.find((x: any) =>
                        ((x.id === rpt.id || x.parent_id === rpt.id) && x.due_date === rpt.due_date) ||
                        (x.text === rpt.text && x.due_date === rpt.due_date && (x.due_time || '') === (rpt.due_time || ''))
                    );
                    if (!exists) tasks.push(rpt);
                }
        } catch (e) {
            console.error('Ошибка при расширении повторений для недели:', e);
        }

        // sort by date/time
        tasks.sort((a: any,b: any) => {
            if (a.due_date === b.due_date) {
                const ta = a.due_time || '99:99';
                const tb = b.due_time || '99:99';
                return ta.localeCompare(tb);
            }
            return (a.due_date || '').localeCompare(b.due_date || '');
        });

        // Deduplicate tasks that may represent the same occurrence (keep child occurrence if exists)
        const uniqMap: Map<string, any> = new Map();
        for (const t of tasks) {
            const key = `${t.due_date || ''}|${t.due_time || ''}|${(t.text || '').trim().toLowerCase()}`;
            const existing = uniqMap.get(key);
            if (!existing) {
                uniqMap.set(key, t);
                continue;
            }
            // prefer child occurrence (has parent_id) over master, prefer pending over deleted/completed
            const preferNew = (t.parent_id ? 1 : 0) - (existing.parent_id ? 1 : 0);
            if (preferNew > 0) {
                uniqMap.set(key, t);
            } else if (preferNew === 0) {
                // if new is pending and existing not, replace
                const exStatus = (existing.status || 'pending');
                const newStatus = (t.status || 'pending');
                if (exStatus !== 'pending' && newStatus === 'pending') {
                    uniqMap.set(key, t);
                }
            }
        }
        const dedupedTasks = Array.from(uniqMap.values());

    const message = createWeekTasksMessage(dedupedTasks);

        await ctx.reply(message, {
            parse_mode: "Markdown",
            reply_markup: getPersistentKeyboard(),
        });
    } catch (error) {
        console.error("Ошибка при получении задач на неделю:", error);
        await ctx.reply("❌ Произошла ошибка при загрузке задач");
    }
}

export async function handleInboxTasks(ctx: BotContext) {
    try {
        const userId = ctx.from!.id;
        registerUser(userId);
        const allPending = getTasks(userId);
        const today = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().split('T')[0];
        // overdue = due_date < today
        const overdue = allPending.filter((t) => t.due_date && t.due_date < today && t.status !== 'completed');
        const inboxNoDate = getInboxTasks(userId);

        // combine overdue + no-date tasks (avoid duplicates)
        const combined: any[] = [];
        const seen = new Set<number>();
        overdue.forEach((t) => { const tid = t.id as number | undefined; if (tid != null && !seen.has(tid)) { combined.push(t); seen.add(tid); } });
        inboxNoDate.forEach((t) => { const tid = t.id as number | undefined; if (tid != null && !seen.has(tid)) { combined.push(t); seen.add(tid); } });

        const message = createSimpleTasksMessage(combined, 'входящие', today, true);
        await ctx.reply(message, { parse_mode: 'Markdown', reply_markup: getPersistentKeyboard() });
    } catch (e) {
        console.error('Ошибка при получении входящих:', e);
        await ctx.reply('❌ Ошибка при загрузке входящих');
    }
}

export async function handleAllTasks(ctx: BotContext) {
    try {
        const userId = ctx.from!.id;
        registerUser(userId);
        // fetch everything
        const all = getAllTasks(userId);

        // Expand repeating tasks into occurrences only for next 7 days to avoid infinite lists
        const now = new Date();
        const sDate = new Date(now);
        const eDate = new Date(now);
        eDate.setDate(eDate.getDate() + 7);
        const repeatsToAdd: any[] = [];
        for (const t of all) {
            if (!t.repeat_pattern) continue;
            const rules = getRepeatRulesForTask(t.id as number, userId);
            for (const r of rules) {
                let payload: any = {};
                try { payload = JSON.parse(r.payload ?? '{}'); } catch (_) { payload = {}; }
                if (r.type === 'daily') {
                    for (let d = new Date(sDate); d <= eDate; d.setDate(d.getDate() + 1)) {
                        const due = d.toISOString().split('T')[0];
                        repeatsToAdd.push({ ...t, due_date: due, due_time: payload.time ?? t.due_time, _is_repeat: true });
                    }
                } else if (r.type === 'weekly') {
                    const weekday = payload.weekday;
                    for (let d = new Date(sDate); d <= eDate; d.setDate(d.getDate() + 1)) {
                        if (d.getDay() === Number(weekday)) {
                            const due = d.toISOString().split('T')[0];
                            repeatsToAdd.push({ ...t, due_date: due, due_time: payload.time ?? t.due_time, _is_repeat: true });
                        }
                    }
                } else if (r.type === 'custom') {
                    const weekday = payload.weekday;
                    for (let d = new Date(sDate); d <= eDate; d.setDate(d.getDate() + 1)) {
                        if (d.getDay() === Number(weekday)) {
                            const due = d.toISOString().split('T')[0];
                            repeatsToAdd.push({ ...t, due_date: due, due_time: payload.time ?? t.due_time, _is_repeat: true });
                        }
                    }
                }
            }
        }

        let merged = all.concat(repeatsToAdd);

        // sort and group
        merged.sort((a: any,b: any) => {
            const da = a.due_date || '~~~~';
            const db = b.due_date || '~~~~';
            if (da === db) {
                const ta = a.due_time || '99:99';
                const tb = b.due_time || '99:99';
                return ta.localeCompare(tb);
            }
            return da.localeCompare(db);
        });

        // group
        const groups = groupTasksByDate(merged);
        const dates = Object.keys(groups).sort((x,y)=>{ if (x==='Без даты') return 1; if (y==='Без даты') return -1; return x.localeCompare(y); });

        // Build message similar to week view: stats + overdue + grouped
        const totalTasks = merged.length;
        const completedTasks = merged.filter((t: any) => t.status === 'completed').length;
        const pendingTasks = totalTasks - completedTasks;

        let message = `📚 *Все задачи* — всего ${totalTasks} (активных ${pendingTasks}, выполнено ${completedTasks})\n\n`;

        const overdue = merged.filter((t: any) => t.status !== 'completed' && t.due_date && t.due_date < (new Date(Date.now() + 3*60*60*1000).toISOString().split('T')[0]));
        if (overdue.length > 0) {
            message += `*⚠️ Просроченные задачи (${overdue.length}):*\n`;
            overdue.forEach((t:any)=> { message += `${formatTaskLine(t)}\n`; });
            message += `\n`;
        }

        for (const date of dates) {
            const list = groups[date];
            const completedCount = list.filter((t:any)=> t.status === 'completed').length;
            const prettyDate = date === 'Без даты' ? date : formatDate(date);
            message += `*${prettyDate}*`;
            if (completedCount > 0) message += ` — ${completedCount}/${list.length} выполнено`;
            message += `\n`;
            for (const t of list) message += `${formatTaskLine(t)}\n`;
            message += `\n`;
        }

        await ctx.reply(message, { parse_mode: 'Markdown', reply_markup: getPersistentKeyboard() });
    } catch (e) {
        console.error('Ошибка в handleAllTasks:', e);
        await ctx.reply('Ошибка при получении всех задач');
    }
}

export async function handleClearCompleted(ctx: BotContext) {
    try {
        const chatId = ctx.from!.id;
        registerUser(chatId);
        const removed = deleteCompletedTasks(chatId);
        await ctx.reply(`✅ Удалены (${removed}) выполненные задачи.`, { reply_markup: getPersistentKeyboard() });
    } catch (e) {
        console.error('Ошибка при очистке выполненных:', e);
        await ctx.reply('❌ Ошибка при удалении выполненных задач');
    }
}

export async function handleSettings(ctx: BotContext) {
    try {
        const chatId = ctx.chat?.id ?? ctx.from?.id!;
        registerUser(chatId);
        const settings = getUserSettings(chatId);
        const kb = new InlineKeyboard()
            .text('Сводка утром ☀️', `settings_daily_morning`)
            .text('Сводка вечером 🌑', `settings_daily_evening`)
            .row()
            .text('Сводка утром + вечером', `settings_daily_both`)
            .text('Выключить сводку', `settings_daily_off`)
            .row()
            .text('✨ Недельная сводка', `settings_weekly_toggle`)
            .row()
            .text('Полная очистка', `settings_clear_all`);

        // compute per-parameter status
        const morningOn = settings.daily_summary === 'morning' || settings.daily_summary === 'both';
        const eveningOn = settings.daily_summary === 'evening' || settings.daily_summary === 'both';
        const weeklyOn = !!settings.weekly_summary;
        const summaryText = `Утренняя: ${morningOn ? 'включена' : 'выключена'}, Вечерняя: ${eveningOn ? 'включена' : 'выключена'}`;
        await ctx.reply(`⚙️ *Настройки сводок*\n\n${summaryText}\nНедельная: ${weeklyOn ? 'включена' : 'выключена'}`, { parse_mode: 'Markdown', reply_markup: kb });
    } catch (e) {
        console.error('Ошибка при открытии настроек:', e);
        await ctx.reply('❌ Не удалось открыть настройки');
    }
}

export function registerTaskListHandlers(bot: Bot<BotContext>) {
    bot.hears("📅 Сегодня", handleTodayTasks);
    bot.hears("⏩ Завтра", handleTomorrowTasks);
    bot.hears("📆 Неделя", handleWeekTasks);
    bot.hears("📥 Входящие", handleInboxTasks);
    bot.hears("📋 Все задачи", handleAllTasks);
    bot.hears("♻️ Очистить выполненные", handleClearCompleted);
    bot.hears("⚙️ Настройки", handleSettings);

    // Settings callbacks
    bot.callbackQuery("settings_daily_morning", async (ctx) => {
        const chatId = ctx.chat?.id ?? ctx.from?.id!;
        const s = getUserSettings(chatId);
        upsertUserSettings(chatId, 'morning', s.weekly_summary as 0 | 1);
        await ctx.answerCallbackQuery({ text: 'Сводка: утром (07:00) включена' });
    });

    bot.callbackQuery("settings_daily_evening", async (ctx) => {
        const chatId = ctx.chat?.id ?? ctx.from?.id!;
        const s = getUserSettings(chatId);
        upsertUserSettings(chatId, 'evening', s.weekly_summary as 0 | 1);
        await ctx.answerCallbackQuery({ text: 'Сводка: вечером (20:00) включена' });
    });

    bot.callbackQuery("settings_daily_both", async (ctx) => {
        const chatId = ctx.chat?.id ?? ctx.from?.id!;
        const s = getUserSettings(chatId);
        upsertUserSettings(chatId, 'both', s.weekly_summary as 0 | 1);
        await ctx.answerCallbackQuery({ text: 'Сводка: утром и вечером включена' });
    });

    bot.callbackQuery("settings_daily_off", async (ctx) => {
        const chatId = ctx.chat?.id ?? ctx.from?.id!;
        const s = getUserSettings(chatId);
        upsertUserSettings(chatId, 'off', s.weekly_summary as 0 | 1);
        await ctx.answerCallbackQuery({ text: 'Ежедневная сводка отключена' });
    });

    bot.callbackQuery("settings_weekly_toggle", async (ctx) => {
        const chatId = ctx.chat?.id ?? ctx.from?.id!;
        const s = getUserSettings(chatId);
        const newVal = s.weekly_summary ? 0 : 1;
        upsertUserSettings(chatId, s.daily_summary as any, newVal as 0 | 1);
        await ctx.answerCallbackQuery({ text: newVal ? 'Недельная сводка включена' : 'Недельная сводка отключена' });
    });

    bot.callbackQuery("settings_clear_all", async (ctx) => {
        const kb = new InlineKeyboard()
            .text('Да, очистить', 'settings_confirm_clear_all')
            .text('Отмена', 'settings_cancel_clear_all');
        await ctx.answerCallbackQuery();
        await ctx.reply('⚠️ Вы уверены? Это действие окончательно удалит все данные пользователя (включая задачи, правила и напоминания).', { reply_markup: kb });
    });

    bot.callbackQuery('settings_confirm_clear_all', async (ctx) => {
        try {
            const chatId = ctx.chat?.id ?? ctx.from?.id!;
            const { hardClearAll } = await import('../db/tasks');
            const res = hardClearAll(chatId);
            await ctx.answerCallbackQuery({ text: `Данные удалены: задачи (${res.tasks}), правила (${res.repeat_rules}), напоминания (${res.reminders}), настройки (${res.settings}), статистика (${res.stats})` });
        } catch (e) {
            console.error('Ошибка при полной очистке:', e);
            try { await ctx.answerCallbackQuery({ text: 'Ошибка при очистке' }); } catch (_) {}
        }
    });

    bot.callbackQuery('settings_cancel_clear_all', async (ctx) => {
        await ctx.answerCallbackQuery({ text: 'Отмена' });
    });
}
