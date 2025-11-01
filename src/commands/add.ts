import { Bot } from "grammy";
import { BotContext } from "../types/context";
import { InlineKeyboard } from "grammy";
import { addTask } from "../db/tasks";
import { parseDateFromText } from "../utils/parseDate";
import { parseTimeFromText } from "../utils/parseTime";
import { cleanTaskText } from "../utils/cleanTaskText";

export function AddNewTask(bot: Bot<BotContext>) {
    const taskInlineKeyboard = new InlineKeyboard()
        .text("Добавить дедлайн", "set_deadline")
        .text("Задать повторение", "set_repeat")
        .row()
        .text("Задать напоминание", "set_reminder")
        .text("Сохранить и выйти", "save_task");

    bot.command("start", async (ctx: BotContext) => {
        const keyboard = new InlineKeyboard().text(
            "Добавить задачу",
            "add_task"
        );
        await ctx.reply("Нажми кнопку чтобы добавить задачу", {
            reply_markup: keyboard,
        });
    });

    bot.callbackQuery(/.*/, async (ctx: BotContext) => {
        const action = ctx.callbackQuery?.data;
        if (!action) return;

        switch (action) {
            case "add_task":
                ctx.session.awaitingNewTask = true;
                ctx.session.tempTaskText = undefined;
                ctx.session.tempDue = undefined;
                ctx.session.tempDueTime = undefined;
                // clear any previous repeat settings
                ctx.session.tempRepeatEntries = undefined;
                ctx.session.tempRepeatPattern = undefined;
                await ctx.reply("Напиши текст новой задачи:");
                break;

            case "set_deadline":
                if (!ctx.session.tempTaskText) {
                    await ctx.reply("Сначала нужно создать задачу!");
                    break;
                }
                // Если дата уже в тексте, используем её, иначе сегодня
                const parsedDate = parseDateFromText(ctx.session.tempTaskText);
                const parsedTime = parseTimeFromText(ctx.session.tempTaskText);

                ctx.session.tempDue = parsedDate?.date ?? new Date().toISOString().split("T")[0];
                // do not default to 23:59 — leave time empty when not provided
                ctx.session.tempDueTime = parsedTime?.time ?? null;

                let dlMsg = `Дедлайн установлен: ${ctx.session.tempDue}`;
                if (ctx.session.tempDueTime) dlMsg += ` ${ctx.session.tempDueTime}`;
                dlMsg += `\nЕсли хочешь изменить — отправь новую дату/время.`;
                await ctx.reply(dlMsg);
                break;

            case "save_task":
                if (!ctx.session.tempTaskText) {
                    await ctx.reply("Сначала создай задачу!");
                    break;
                }
                const id = addTask({
                    text: ctx.session.tempTaskText!,
                    due_date: ctx.session.tempDue ?? null,
                    due_time: ctx.session.tempDueTime ?? null,
                    repeat_pattern: null,
                    remind_interval: null,
                });
                await ctx.reply(`Задача сохранена с id ${id}`);

                ctx.session.tempTaskText = undefined;
                ctx.session.tempDue = undefined;
                ctx.session.tempDueTime = undefined;
                ctx.session.awaitingNewTask = false;
                break;
        }

        await ctx.answerCallbackQuery();
    });

    bot.on("message:text", async (ctx: BotContext) => {
        if (!ctx.session.awaitingNewTask) return;
        const text = ctx.message?.text;
        if (!text) return;

        const parsedDate = parseDateFromText(text);
        const parsedTime = parseTimeFromText(text);

        ctx.session.tempTaskText = cleanTaskText(
            text,
            parsedDate?.textMatch,
            parsedTime?.textMatch
        );
        ctx.session.tempDue = parsedDate?.date;
        ctx.session.tempDueTime = parsedTime?.time;

        ctx.session.awaitingNewTask = false;

        await ctx.reply(
            `Задача: "${ctx.session.tempTaskText}"` +
                (ctx.session.tempDue ? `\nДата: ${ctx.session.tempDue}` : "") +
                (ctx.session.tempDueTime
                    ? `\nВремя: ${ctx.session.tempDueTime}`
                    : "") +
                `\nВыбери действие:`,
            { reply_markup: taskInlineKeyboard }
        );
    });
}
