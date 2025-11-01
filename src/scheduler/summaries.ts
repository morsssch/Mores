import { Bot } from 'grammy';
import { BotContext } from '../types/context';
import { getAllUsers } from '../db/master';
import { getUserSettings } from '../db/settings';
import { getTasksForToday, getTasksForWeek } from '../db/tasks';
import { getLocalISODate } from '../utils/getLocalISODate';
import { formatDate } from '../utils/formatDate';

const CHECK_INTERVAL_MS = 60_000; // every minute

// simple line formatter copied from taskListHandlers
function padId(id: any): string {
    try { const n = Number(id) || 0; return String(n).padStart(4, '0'); } catch { return '0000'; }
}
function formatTime(timeStr: string | null): string { if (!timeStr) return ''; return `⏰ ${timeStr}`; }
function formatTaskLine(task: any): string {
    const repeatIcon = task.repeat_pattern ? ' 🔄' : '';
    const timeInfo = task.due_time ? `${formatTime(task.due_time)}` : '';
    const idPart = task.id ? padId(task.id) : '0000';
    const line = `${idPart} // ${task.text || ''} — ${timeInfo}`;
    return `${line}${repeatIcon}`.trim();
}

export function startSummaries(bot: Bot<BotContext>) {
    const lastSent: Record<string, string> = {};

    async function poll() {
        try {
            const users = getAllUsers();
            // Use Moscow time (UTC+3)
            const moscowNow = new Date(Date.now() + 3 * 60 * 60 * 1000);
            const hh = String(moscowNow.getUTCHours()).padStart(2, '0');
            const mm = String(moscowNow.getUTCMinutes()).padStart(2, '0');
            const timeStr = `${hh}:${mm}`;
            const todayIso = moscowNow.toISOString().split('T')[0];

            for (const u of users) {
                try {
                    const settings = getUserSettings(u);
                    // morning summary at 07:00
                    if ((settings.daily_summary === 'morning' || settings.daily_summary === 'both') && timeStr === '07:00') {
                        const key = `${u}:daily:morning:${todayIso}`;
                        if (lastSent[key]) continue;
                        const tasks = getTasksForToday(u, todayIso);
                        let message = `☀️ *Утренняя сводка (${formatDate(todayIso)})*\n\n`;
                        if (tasks.length === 0) message += 'Нет задач на сегодня 🎉';
                        else {
                            tasks.forEach((t) => { if (t.status !== 'completed') message += `${formatTaskLine(t)}\n`; });
                        }
                        await bot.api.sendMessage(u, message, { parse_mode: 'Markdown' });
                        lastSent[key] = new Date().toISOString();
                    }

                    // evening summary at 20:00
                    if ((settings.daily_summary === 'evening' || settings.daily_summary === 'both') && timeStr === '20:00') {
                        const key = `${u}:daily:evening:${todayIso}`;
                        if (lastSent[key]) continue;
                        const tasks = getTasksForToday(u, todayIso);
                        let message = `🌙 *Вечерняя сводка (${formatDate(todayIso)})*\n\n`;
                        if (tasks.length === 0) message += 'Нет задач на сегодня 🎉';
                        else {
                            tasks.forEach((t) => { if (t.status !== 'completed') message += `${formatTaskLine(t)}\n`; });
                        }
                        await bot.api.sendMessage(u, message, { parse_mode: 'Markdown' });
                        lastSent[key] = new Date().toISOString();
                    }

                    // weekly summary: send on Sunday evening (20:00) if weekly_summary enabled
                    const day = moscowNow.getUTCDay(); // 0 Sunday in Moscow
                    if (settings.weekly_summary && timeStr === '20:00' && day === 0) {
                        const key = `${u}:weekly:${todayIso}`;
                        if (lastSent[key]) continue;
                        // week range: today -6 to today (last 7 days or upcoming week? use next 7 days view per previous UI)
                        const start = todayIso;
                        const endDate = new Date();
                        endDate.setDate(endDate.getDate() + 7);
                        const end = endDate.toISOString().split('T')[0];
                        const tasks = getTasksForWeek(u, start, end);
                        let message = `🗓️ *Недельная сводка*\n\n`;
                        if (tasks.length === 0) message += 'Нет задач на неделю 🎉';
                        else tasks.forEach((t) => { if (t.status !== 'completed') message += `${formatTaskLine(t)}\n`; });
                        await bot.api.sendMessage(u, message, { parse_mode: 'Markdown' });
                        lastSent[key] = new Date().toISOString();
                    }
                } catch (e) {
                    console.error('Ошибка при отправке сводки пользователю', u, e);
                }
            }
        } catch (e) {
            console.error('Ошибка в планировщике сводок:', e);
        }
    }

    // initial run
    poll().catch(console.error);
    setInterval(() => { poll().catch(console.error); }, CHECK_INTERVAL_MS);
}
