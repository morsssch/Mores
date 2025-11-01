import { Bot } from "grammy";
import { BotContext } from "../types/context";
import { parseDateFromText } from "../utils/parseDate";
import { parseTimeFromText } from "../utils/parseTime";
import { getContinueKeyboard, taskInlineKeyboard } from "../keyboards";
import { formatDate } from "../utils/formatDate";
import { formatTaskPreview } from "../utils/taskHelpers";

export async function handleSetDeadlineCallback(ctx: BotContext) {
    if (!ctx.session.tempTaskText) {
        await ctx.reply("Сначала нужно создать задачу!");
        await ctx.answerCallbackQuery();
        return;
    }

    const parsedDate = parseDateFromText(ctx.session.tempTaskText || "");
    const parsedTime = parseTimeFromText(ctx.session.tempTaskText || "");

    const today = new Date().toISOString().split("T")[0];

    // Prefer already set session values (e.g. when user previously set a date/time)
    // Else fall back to parsed values from text, and only then use defaults
    ctx.session.tempDue = ctx.session.tempDue ?? parsedDate?.date ?? today;
    // do not default time to 23:59; if no time provided, keep null
    ctx.session.tempDueTime = ctx.session.tempDueTime ?? parsedTime?.time ?? null;

    await ctx.reply(
        `📅 Дедлайн установлен:` +
            (ctx.session.tempDue ? ` ${formatDate(ctx.session.tempDue)}` : "") +
            (ctx.session.tempDueTime ? ` ${ctx.session.tempDueTime}` : "") +
            `\nЕсли хочешь изменить — отправь новую дату / время`,
        { reply_markup: getContinueKeyboard() }
    );

    await ctx.answerCallbackQuery();
}

export function registerDeadlineHandlers(bot: Bot<BotContext>) {
    bot.callbackQuery("set_deadline", handleSetDeadlineCallback);

    // When user clicks Continue after setting deadline — show preview and action buttons
    bot.callbackQuery("continue_deadline", async (ctx) => {
        try {
            await ctx.answerCallbackQuery();
            const text = formatTaskPreview(
                ctx.session.tempTaskText ?? "",
                ctx.session.tempDue ?? undefined,
                ctx.session.tempDueTime ?? undefined,
                ctx.session.tempReminder
            );
            await ctx.reply(text + `\n\nВыбери действие:`, { reply_markup: taskInlineKeyboard });
        } catch (e) {
            console.error("Error in continue_deadline handler:", e);
            try {
                await ctx.answerCallbackQuery({ text: "❌ Ошибка" });
            } catch (_) {}
        }
    });
}
