"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddNewTask = AddNewTask;
const grammy_1 = require("grammy");
const tasks_1 = require("../db/tasks");
const parseDate_1 = require("../utils/parseDate");
const parseTime_1 = require("../utils/parseTime");
const cleanTaskText_1 = require("../utils/cleanTaskText");
function AddNewTask(bot) {
    const taskInlineKeyboard = new grammy_1.InlineKeyboard()
        .text("Добавить дедлайн", "set_deadline")
        .text("Задать повторение", "set_repeat")
        .row()
        .text("Задать напоминание", "set_reminder")
        .text("Сохранить и выйти", "save_task");
    bot.command("start", async (ctx) => {
        const keyboard = new grammy_1.InlineKeyboard().text("Добавить задачу", "add_task");
        await ctx.reply("Нажми кнопку чтобы добавить задачу", {
            reply_markup: keyboard,
        });
    });
    bot.callbackQuery(/.*/, async (ctx) => {
        const action = ctx.callbackQuery?.data;
        if (!action)
            return;
        switch (action) {
            case "add_task":
                ctx.session.awaitingNewTask = true;
                ctx.session.tempTaskText = undefined;
                ctx.session.tempDue = undefined;
                ctx.session.tempDueTime = undefined;
                await ctx.reply("Напиши текст новой задачи:");
                break;
            case "set_deadline":
                if (!ctx.session.tempTaskText) {
                    await ctx.reply("Сначала нужно создать задачу!");
                    break;
                }
                // Если дата уже в тексте, используем её, иначе сегодня
                const parsedDate = (0, parseDate_1.parseDateFromText)(ctx.session.tempTaskText);
                const parsedTime = (0, parseTime_1.parseTimeFromText)(ctx.session.tempTaskText);
                ctx.session.tempDue =
                    parsedDate?.date ?? new Date().toISOString().split("T")[0];
                ctx.session.tempDueTime = parsedTime?.time ?? "23:59";
                await ctx.reply(`Дедлайн установлен: ${ctx.session.tempDue} ${ctx.session.tempDueTime}\n` +
                    `Если хочешь изменить — отправь новую дату/время.`);
                break;
            case "save_task":
                if (!ctx.session.tempTaskText) {
                    await ctx.reply("Сначала создай задачу!");
                    break;
                }
                const id = (0, tasks_1.addTask)({
                    text: ctx.session.tempTaskText,
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
    bot.on("message:text", async (ctx) => {
        if (!ctx.session.awaitingNewTask)
            return;
        const text = ctx.message?.text;
        if (!text)
            return;
        const parsedDate = (0, parseDate_1.parseDateFromText)(text);
        const parsedTime = (0, parseTime_1.parseTimeFromText)(text);
        ctx.session.tempTaskText = (0, cleanTaskText_1.cleanTaskText)(text, parsedDate?.textMatch, parsedTime?.textMatch);
        ctx.session.tempDue = parsedDate?.date;
        ctx.session.tempDueTime = parsedTime?.time;
        ctx.session.awaitingNewTask = false;
        await ctx.reply(`Задача: "${ctx.session.tempTaskText}"` +
            (ctx.session.tempDue ? `\nДата: ${ctx.session.tempDue}` : "") +
            (ctx.session.tempDueTime
                ? `\nВремя: ${ctx.session.tempDueTime}`
                : "") +
            `\nВыбери действие:`, { reply_markup: taskInlineKeyboard });
    });
}
