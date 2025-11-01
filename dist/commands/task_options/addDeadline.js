"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddDeadline = AddDeadline;
const parseDate_1 = require("../../utils/parseDate");
const parseTime_1 = require("../../utils/parseTime");
function AddDeadline(bot) {
    bot.callbackQuery("set_deadline", async (ctx) => {
        if (!ctx.session.tempTaskText) {
            await ctx.reply("Сначала нужно создать задачу!");
            await ctx.answerCallbackQuery();
            return;
        }
        const parsedDate = (0, parseDate_1.parseDateFromText)(ctx.session.tempTaskText || "");
        const parsedTime = (0, parseTime_1.parseTimeFromText)(ctx.session.tempTaskText || "");
        ctx.session.tempDue =
            parsedDate?.date ?? new Date().toISOString().split("T")[0];
        ctx.session.tempDueTime = parsedTime?.time ?? "23:59";
        await ctx.reply(`Дедлайн установлен:` +
            (ctx.session.tempDue ? ` ${ctx.session.tempDue}` : "") +
            (ctx.session.tempDueTime ? ` ${ctx.session.tempDueTime}` : "") +
            `\nЕсли хочешь изменить, просто отправь новую дату / время`);
        await ctx.answerCallbackQuery();
    });
}
