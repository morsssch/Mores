import { Bot } from "grammy";
import { BotContext } from "../../types/context";
import { parseDateFromText } from "../../utils/parseDate";
import { parseTimeFromText } from "../../utils/parseTime";

export function AddDeadline(bot: Bot<BotContext>) {
    bot.callbackQuery("set_deadline", async (ctx) => {
        if (!ctx.session.tempTaskText) {
            await ctx.reply("Сначала нужно создать задачу!");
            await ctx.answerCallbackQuery();
            return;
        }

        const parsedDate = parseDateFromText(ctx.session.tempTaskText || "");
        const parsedTime = parseTimeFromText(ctx.session.tempTaskText || "");

        ctx.session.tempDue = parsedDate?.date ?? new Date().toISOString().split("T")[0];
        // don't default to 23:59; leave empty when not provided
        ctx.session.tempDueTime = parsedTime?.time ?? null;

        await ctx.reply(
            `Дедлайн установлен:` +
                (ctx.session.tempDue ? ` ${ctx.session.tempDue}` : "") +
                (ctx.session.tempDueTime ? ` ${ctx.session.tempDueTime}` : "") +
                `\nЕсли хочешь изменить, просто отправь новую дату / время`
        );

        await ctx.answerCallbackQuery();
    });
}
