"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const grammy_1 = require("grammy");
const handleMessages_1 = require("./middlewares/handleMessages");
const keyboards_1 = require("./keyboards");
const taskHandlers_1 = require("./handlers/taskHandlers");
const repeatHandlers_1 = require("./handlers/repeatHandlers");
const deadlineHandlers_1 = require("./handlers/deadlineHandlers");
const taskListHandlers_1 = require("./handlers/taskListHandlers");
const reminders_1 = require("./scheduler/reminders");
const bot = new grammy_1.Bot(process.env.BOT_TOKEN);
// global handlers to capture otherwise-silent crashes and log them
process.on('unhandledRejection', (reason) => {
    console.error('UnhandledRejection:', reason);
});
process.on('uncaughtException', (err) => {
    console.error('UncaughtException:', err);
});
bot.use((0, grammy_1.session)({
    initial: () => ({
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
}));
// Optional debug middleware to log incoming callback_data when DEBUG_CALLBACKS is set
bot.use(async (ctx, next) => {
    try {
        // always log callback queries briefly to help debug missing handlers
        // log raw update payload for debugging (compact)
        try {
            console.log('RAW_UPDATE:', JSON.stringify(ctx.update));
        }
        catch (e) {
            console.log('RAW_UPDATE error', e);
        }
    }
    catch (_) { }
    await next();
});
// Log every update type for debugging (very verbose)
// Use middleware to log raw update type (safer typing)
bot.use(async (ctx, next) => {
    try {
        // @ts-ignore
        const t = ctx.updateType || 'unknown';
        console.log('Update received:', t);
    }
    catch (_) { }
    await next();
});
// At startup, log webhook info to detect if Telegram has a webhook set for this bot
(async () => {
    try {
        const info = await bot.api.getWebhookInfo();
        console.log('Webhook info:', info);
    }
    catch (e) {
        console.error('Failed to get webhook info:', e);
    }
})();
bot.command("start", async (ctx) => {
    await ctx.reply(`👋 Добро пожаловать в *Mores*!\n\n` +
        `Я создана чтобы помогать вам следить за задачами и дедлайнами в простой и удобной форме.\n\n` +
        `📝 *Что я умею:*\n` +
        `• Создавать и управлять задачами\n` +
        `• Устанавливать дедлайны и напоминания\n` +
        `• Показывать задачи на сегодня, завтра и неделю\n` +
        `• Напоминать о важных делах\n\n` +
        `Выберите действие ниже: 👇`, {
        reply_markup: (0, keyboards_1.getPersistentKeyboard)(),
        parse_mode: "Markdown",
    });
});
// register deadline handlers first so specific callback handlers run before the generic signed-callback handler
(0, deadlineHandlers_1.registerDeadlineHandlers)(bot);
(0, repeatHandlers_1.registerRepeatHandlers)(bot);
(0, taskHandlers_1.registerTaskHandlers)(bot);
(0, taskListHandlers_1.registerTaskListHandlers)(bot);
// Temporary fallback callback handler to verify callbacks arrive; registered after specific handlers
bot.callbackQuery(/.*/, async (ctx) => {
    try {
        console.log('Fallback callback handler, data=', ctx.callbackQuery?.data);
        await ctx.answerCallbackQuery({ text: 'Получено (debug)' });
    }
    catch (e) {
        console.error('Fallback callback handler error', e);
    }
});
// start reminders worker
(0, reminders_1.startRemindersWorker)(bot);
bot.on("message:text", handleMessages_1.handleMessages);
bot.start({
    onStart: (info) => console.log(`✅ Mores запущен! Имя: @${info.username}`),
});
