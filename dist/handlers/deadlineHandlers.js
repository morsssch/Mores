"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSetDeadlineCallback = handleSetDeadlineCallback;
exports.registerDeadlineHandlers = registerDeadlineHandlers;
const parseDate_1 = require("../utils/parseDate");
const parseTime_1 = require("../utils/parseTime");
const keyboards_1 = require("../keyboards");
const formatDate_1 = require("../utils/formatDate");
const taskHelpers_1 = require("../utils/taskHelpers");
async function handleSetDeadlineCallback(ctx) {
    if (!ctx.session.tempTaskText) {
        await ctx.reply("Сначала нужно создать задачу!");
        await ctx.answerCallbackQuery();
        return;
    }
    const parsedDate = (0, parseDate_1.parseDateFromText)(ctx.session.tempTaskText || "");
    const parsedTime = (0, parseTime_1.parseTimeFromText)(ctx.session.tempTaskText || "");
    const today = new Date().toISOString().split("T")[0];
    // Prefer already set session values (e.g. when user previously set a date/time)
    // Else fall back to parsed values from text, and only then use defaults
    ctx.session.tempDue = ctx.session.tempDue ?? parsedDate?.date ?? today;
    ctx.session.tempDueTime = ctx.session.tempDueTime ?? parsedTime?.time ?? "23:59";
    await ctx.reply(`📅 Дедлайн установлен:` +
        (ctx.session.tempDue ? ` ${(0, formatDate_1.formatDate)(ctx.session.tempDue)}` : "") +
        (ctx.session.tempDueTime ? ` ${ctx.session.tempDueTime}` : "") +
        `\nЕсли хочешь изменить — отправь новую дату / время`, { reply_markup: (0, keyboards_1.getContinueKeyboard)() });
    await ctx.answerCallbackQuery();
}
function registerDeadlineHandlers(bot) {
    bot.callbackQuery("set_deadline", handleSetDeadlineCallback);
    // When user clicks Continue after setting deadline — show preview and action buttons
    bot.callbackQuery("continue_deadline", async (ctx) => {
        try {
            await ctx.answerCallbackQuery();
            const text = (0, taskHelpers_1.formatTaskPreview)(ctx.session.tempTaskText ?? "", ctx.session.tempDue ?? undefined, ctx.session.tempDueTime ?? undefined, ctx.session.tempReminder);
            await ctx.reply(text + `\n\nВыбери действие:`, { reply_markup: keyboards_1.taskInlineKeyboard });
        }
        catch (e) {
            console.error("Error in continue_deadline handler:", e);
            try {
                await ctx.answerCallbackQuery({ text: "❌ Ошибка" });
            }
            catch (_) { }
        }
    });
}
