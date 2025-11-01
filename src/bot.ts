import "dotenv/config";
import { Bot, session } from "grammy";
import { BotContext, SessionData } from "./types/context";
import { handleMessages } from "./middlewares/handleMessages";
import { getPersistentKeyboard } from "./keyboards";
import { registerTaskHandlers } from "./handlers/taskHandlers";
import { registerRepeatHandlers } from "./handlers/repeatHandlers";
import { registerDeadlineHandlers } from "./handlers/deadlineHandlers";
import { registerTaskListHandlers } from "./handlers/taskListHandlers";
import { startRemindersWorker } from "./scheduler/reminders";
import { startSummaries } from "./scheduler/summaries";
import { isWhitelisted } from "./db/master";

const bot = new Bot<BotContext>(process.env.BOT_TOKEN!);

process.on("unhandledRejection", (reason) => {
    console.error("UnhandledRejection:", reason);
});
process.on("uncaughtException", (err) => {
    console.error("UncaughtException:", err);
    bot.use(async (ctx, next) => {
        const uid = ctx.from?.id;
        const username = ctx.from?.username;
        const owner = process.env.ADMIN_USERNAME ?? "morssssss";
        if (!uid) return;
        if (
            username === owner ||
            String(uid) === process.env.ADMIN_CHAT_ID ||
            isWhitelisted(uid)
        ) {
            await next();
            return;
        }

        if (ctx.message?.text && ctx.message.text.startsWith("/start")) {
            await ctx.reply(
                "Бот приватный. Обратись к @morssssss для доступа."
            );
            return;
        }
        try {
            await ctx.reply("Извините, доступ к боту закрыт.");
        } catch (_) {}
    });
});

bot.use(
    session({
        initial: (): SessionData => ({
            awaitingNewTask: false,
            awaitingDeadline: false,
            tempDueTime: undefined,
            tempTaskText: undefined,
            tempDue: undefined,
            awaitingReminderDate: false,
            tempReminder: undefined,
            awaitingRepeatInput: false,
            tempRepeatEntries: undefined,
        }),
    })
);

bot.command("start", async (ctx) => {
    await ctx.reply(
        `👋 Добро пожаловать в *Mores*!\n\n` +
            `Я создана чтобы помогать вам следить за задачами и дедлайнами в простой и удобной форме.\n\n` +
            `📝 *Что я умею:*\n` +
            `• Создавать и управлять задачами\n` +
            `• Устанавливать дедлайны и напоминания\n` +
            `• Показывать задачи на сегодня, завтра и неделю\n` +
            `• Напоминать о важных делах\n\n` +
            `Выберите действие ниже: 👇`,
        {
            reply_markup: getPersistentKeyboard(),
            parse_mode: "Markdown",
        }
    );
});


registerDeadlineHandlers(bot);
registerRepeatHandlers(bot);
registerTaskHandlers(bot);
registerTaskListHandlers(bot);

startRemindersWorker(bot);
startSummaries(bot);

bot.on("message:text", handleMessages);

bot.start({
    onStart: (info) => console.log(`✅ Mores запущена! Имя: @${info.username}`),
});
