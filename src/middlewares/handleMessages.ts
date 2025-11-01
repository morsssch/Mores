import { BotContext } from "../types/context";
import { formatDeadlineUpdate, formatTaskPreview } from "../utils/taskHelpers";
import { getPersistentKeyboard, taskInlineKeyboard } from "../keyboards";
import { handleNewTaskMessage } from "../handlers/taskHandlers";
import { parseTimeFromText } from "../utils/parseTime";
import { parseDateFromText } from "../utils/parseDate";

export async function handleMessages(ctx: BotContext) {
    const text = ctx.message?.text;
    if (!text) return;

    const persistentKeyboard = getPersistentKeyboard();

    // Custom reminder date/time entry with support for phrases like "через час", "через N часов", "сегодня"
    if (ctx.session.awaitingReminderDate) {
        const lower = text.toLowerCase().trim();

        // special: "через час" or "через N часов"
        const afterHourMatch = lower.match(/через\s*(\d+)\s*час/);
        const черезЧас = /(^|\s)через\s*час(?![а-я])/i.test(lower);
        const сегодняMatch = /(^|\s)сегодня(?![а-я])/i.test(lower);

        try {
            let dt: Date | null = null;

            if (черезЧас) {
                dt = new Date(Date.now() + 60 * 60 * 1000);
            } else if (afterHourMatch) {
                const n = parseInt(afterHourMatch[1], 10) || 1;
                dt = new Date(Date.now() + n * 60 * 60 * 1000);
            } else {
                const parsedDate = parseDateFromText(text);
                const parsedTime = parseTimeFromText(text);

                if (!parsedDate && !parsedTime && !сегодняMatch) {
                    await ctx.reply(
                        "Не удалось распознать дату или время. Попробуй ещё раз (например: завтра в 9:00 или 31.10.2025 18:00).",
                        { reply_markup: persistentKeyboard }
                    );
                    return;
                }

                // determine date (prefer parsedDate, otherwise today or 'сегодня')
                const datePart = parsedDate?.date ?? (сегодняMatch ? new Date().toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
                const timePart = parsedTime?.time ?? "09:00";

                const [y, m, d] = datePart.split("-").map((v) => parseInt(v, 10));
                const [hh, mm] = timePart.split(":").map((v) => parseInt(v, 10));
                // Interpret entered date/time as Moscow local time (UTC+3).
                // Convert Moscow local -> UTC by subtracting 3 hours when creating UTC Date.
                const utcMs = Date.UTC(y, m - 1, d, hh - 3, mm, 0);
                dt = new Date(utcMs);

                // if user provided only time (no explicit date) and time already passed today, assume next day
                if (!parsedDate && parsedTime) {
                    const now = new Date();
                    if (dt.getTime() <= now.getTime() - 1000) {
                        dt.setDate(dt.getDate() + 1);
                    }
                }
            }

            if (!dt) {
                await ctx.reply("Не удалось установить напоминание. Попробуй ещё раз.", { reply_markup: persistentKeyboard });
                return;
            }

            ctx.session.tempReminder = dt.toISOString();
            ctx.session.awaitingReminderDate = false;

            await ctx.reply(
                formatTaskPreview(
                    ctx.session.tempTaskText!,
                    ctx.session.tempDue as string | undefined,
                    ctx.session.tempDueTime,
                    ctx.session.tempReminder
                ) + `\n\nНапоминание установлено и сохранится при сохранении задачи.`,
                { reply_markup: taskInlineKeyboard }
            );
            return;
        } catch (e) {
            console.error("Ошибка при разборе даты напоминания:", e);
            await ctx.reply("Не удалось установить напоминание. Попробуй ещё раз.", { reply_markup: persistentKeyboard });
            return;
        }
    }

    if (text === "📝 Добавить задачу" || text === "Добавить задачу") {
        ctx.session.awaitingNewTask = true;
        ctx.session.tempTaskText = undefined;
        ctx.session.tempDue = undefined;
        ctx.session.tempDueTime = undefined;
        // clear any previous repeat settings from session
        ctx.session.tempRepeatEntries = undefined;
        ctx.session.tempRepeatPattern = undefined;

        await ctx.reply("Напиши текст новой задачи:", {
            reply_markup: persistentKeyboard,
        });
        return;
    }

    if (text === "➡️ Продолжить") {
        if (ctx.session.tempTaskText) {
            await ctx.reply(
                formatTaskPreview(
                    ctx.session.tempTaskText,
                    ctx.session.tempDue as string,
                    ctx.session.tempDueTime,
                    ctx.session.tempReminder
                ) + `\n\nВыбери действие:`,
                { reply_markup: taskInlineKeyboard }
            );
            return;
        }
    }

    if (ctx.session.awaitingNewTask) {
        await handleNewTaskMessage(ctx, text);
        return;
    }

    if (ctx.session.tempTaskText) {
        const parsedDate = parseDateFromText(text);
        const parsedTime = parseTimeFromText(text);

        let updated = false;
        if (parsedDate) {
            ctx.session.tempDue = parsedDate.date;
            updated = true;
        }
        if (parsedTime) {
            ctx.session.tempDueTime = parsedTime.time;
            updated = true;
        }

        if (updated) {
            await ctx.reply(
                formatDeadlineUpdate(
                    ctx.session.tempDue as string,
                    ctx.session.tempDueTime
                ),
                { reply_markup: persistentKeyboard }
            );
            return;
        }
    }

    await ctx.reply("📭 Задач нет!\n\nМожно отдохнуть или добавить новые задачи 😊", {
        reply_markup: persistentKeyboard,
    });
}
