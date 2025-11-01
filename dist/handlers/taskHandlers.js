"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSaveTaskCallback = handleSaveTaskCallback;
exports.handleNewTaskMessage = handleNewTaskMessage;
exports.registerTaskHandlers = registerTaskHandlers;
const tasks_1 = require("../db/tasks");
const taskHelpers_1 = require("../utils/taskHelpers");
const keyboards_1 = require("../keyboards");
const grammy_1 = require("grammy");
const parseDate_1 = require("../utils/parseDate");
const parseTime_1 = require("../utils/parseTime");
const hmac_1 = require("../utils/hmac");
const tasks_2 = require("../db/tasks");
const reminders_1 = require("../db/reminders");
const repeatRules_1 = require("../db/repeatRules");
// Deadline handling moved to deadlineHandlers.ts
async function handleSaveTaskCallback(ctx) {
    if (!ctx.session.tempTaskText) {
        await ctx.reply("Сначала создай задачу!");
        return;
    }
    try {
        const today = new Date().toISOString().split("T")[0];
        const defaultTime = "23:59";
        const id = (0, tasks_1.addTask)({
            text: ctx.session.tempTaskText,
            due_date: ctx.session.tempDue ?? today,
            due_time: ctx.session.tempDueTime ?? defaultTime,
            repeat_pattern: null,
            remind_interval: null,
            chat_id: ctx.chat?.id ?? ctx.from?.id ?? null,
        });
        // if a temp reminder was set during creation, persist it
        let reminderInfo = "";
        if (ctx.session.tempReminder) {
            try {
                (0, reminders_1.addReminder)(id, ctx.session.tempReminder);
                const rd = new Date(ctx.session.tempReminder);
                reminderInfo = `\n\n🔔 Напомню: ${rd.toLocaleString()}`;
            }
            catch (e) {
                console.error("Ошибка при сохранении напоминания:", e);
            }
        }
        // if temp repeat entries exist, persist them as repeat_rules
        let repeatInfo = "";
        if (ctx.session.tempRepeatEntries && Array.isArray(ctx.session.tempRepeatEntries)) {
            try {
                for (const entry of ctx.session.tempRepeatEntries) {
                    if (entry.type === 'daily') {
                        (0, repeatRules_1.addRepeatRule)({ task_id: id, type: 'daily', payload: JSON.stringify({ time: entry.time }), timezone: null });
                        repeatInfo += `\nКаждый день в ${entry.time}`;
                    }
                    else if (entry.type === 'weekly') {
                        (0, repeatRules_1.addRepeatRule)({ task_id: id, type: 'weekly', payload: JSON.stringify({ weekday: entry.weekday, time: entry.time }), timezone: null });
                        repeatInfo += `\nКаждую неделю в ${entry.time}`;
                    }
                    else if (entry.type === 'custom') {
                        // store single custom entry
                        (0, repeatRules_1.addRepeatRule)({ task_id: id, type: 'custom', payload: JSON.stringify(entry), timezone: null });
                        repeatInfo += `\nПовторение: ${JSON.stringify(entry)}`;
                    }
                }
            }
            catch (e) {
                console.error('Ошибка при сохранении повторений:', e);
            }
        }
        await ctx.reply(`✅ Задача "${ctx.session.tempTaskText}" сохранена!${reminderInfo}${repeatInfo}`);
        ctx.session.tempTaskText = undefined;
        ctx.session.tempDue = undefined;
        ctx.session.tempDueTime = undefined;
        ctx.session.awaitingNewTask = false;
        ctx.session.tempReminder = undefined;
        ctx.session.awaitingReminderDate = false;
    }
    catch (error) {
        console.error("Ошибка при сохранении задачи:", error);
        await ctx.reply("❌ Произошла ошибка при сохранении задачи");
    }
}
async function handleNewTaskMessage(ctx, text) {
    const parsedDate = (0, parseDate_1.parseDateFromText)(text);
    const parsedTime = (0, parseTime_1.parseTimeFromText)(text);
    // removed debug logs
    ctx.session.tempTaskText = (0, taskHelpers_1.cleanTaskText)(text, parsedDate?.textMatch, parsedTime?.textMatch);
    ctx.session.tempDue = parsedDate?.date;
    ctx.session.tempDueTime = parsedTime?.time;
    ctx.session.awaitingNewTask = false;
    // removed debug logs
    await ctx.reply((0, taskHelpers_1.formatTaskPreview)(ctx.session.tempTaskText, ctx.session.tempDue, ctx.session.tempDueTime) + `\n\nВыбери действие:`, { reply_markup: keyboards_1.taskInlineKeyboard });
}
function registerTaskHandlers(bot) {
    bot.callbackQuery("save_task", handleSaveTaskCallback);
    // Reminder setup during task creation (preset + custom)
    bot.callbackQuery("set_reminder", async (ctx) => {
        try {
            if (!ctx.session.tempTaskText) {
                await ctx.reply("Сначала создай задачу!");
                await ctx.answerCallbackQuery();
                return;
            }
            const kb = new grammy_1.InlineKeyboard()
                .text("Через час", "set_reminder_1h")
                .text("Через день", "set_reminder_1d")
                .row()
                .text("Другая дата", "set_reminder_custom")
                .text("Отмена", "cancel_temp_reminder");
            await ctx.answerCallbackQuery();
            await ctx.reply("Выбери когда напомнить:", { reply_markup: kb });
        }
        catch (e) {
            console.error("Ошибка при выборе напоминания:", e);
            try {
                await ctx.answerCallbackQuery();
            }
            catch (_) { }
        }
    });
    bot.callbackQuery("set_reminder_1h", async (ctx) => {
        try {
            if (!ctx.session.tempTaskText) {
                await ctx.reply("Сначала создай задачу!");
                await ctx.answerCallbackQuery();
                return;
            }
            const remindAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
            ctx.session.tempReminder = remindAt;
            ctx.session.awaitingReminderDate = false;
            await ctx.answerCallbackQuery({ text: "⏰ Напоминание: через час" });
            await ctx.reply((0, taskHelpers_1.formatTaskPreview)(ctx.session.tempTaskText, ctx.session.tempDue, ctx.session.tempDueTime, ctx.session.tempReminder) + `\n\nСохранится при сохранении задачи.`, { reply_markup: keyboards_1.taskInlineKeyboard });
        }
        catch (e) {
            console.error("Ошибка set_reminder_1h:", e);
            try {
                await ctx.answerCallbackQuery();
            }
            catch (_) { }
        }
    });
    bot.callbackQuery("set_reminder_1d", async (ctx) => {
        try {
            if (!ctx.session.tempTaskText) {
                await ctx.reply("Сначала создай задачу!");
                await ctx.answerCallbackQuery();
                return;
            }
            const remindAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
            ctx.session.tempReminder = remindAt;
            ctx.session.awaitingReminderDate = false;
            await ctx.answerCallbackQuery({ text: "⏰ Напоминание: через день" });
            await ctx.reply((0, taskHelpers_1.formatTaskPreview)(ctx.session.tempTaskText, ctx.session.tempDue, ctx.session.tempDueTime, ctx.session.tempReminder) + `\n\nСохранится при сохранении задачи.`, { reply_markup: keyboards_1.taskInlineKeyboard });
        }
        catch (e) {
            console.error("Ошибка set_reminder_1d:", e);
            try {
                await ctx.answerCallbackQuery();
            }
            catch (_) { }
        }
    });
    bot.callbackQuery("set_reminder_custom", async (ctx) => {
        try {
            if (!ctx.session.tempTaskText) {
                await ctx.reply("Сначала создай задачу!");
                await ctx.answerCallbackQuery();
                return;
            }
            ctx.session.awaitingReminderDate = true;
            await ctx.answerCallbackQuery();
            await ctx.reply("Отправь дату и время напоминания в свободной форме (например: завтра в 9:00 или 31.10.2025 18:00).");
        }
        catch (e) {
            console.error("Ошибка set_reminder_custom:", e);
            try {
                await ctx.answerCallbackQuery();
            }
            catch (_) { }
        }
    });
    bot.callbackQuery("cancel_temp_reminder", async (ctx) => {
        try {
            ctx.session.tempReminder = undefined;
            ctx.session.awaitingReminderDate = false;
            await ctx.answerCallbackQuery({ text: "❌ Напоминание отменено" });
        }
        catch (e) {
            console.error("Ошибка cancel_temp_reminder:", e);
            try {
                await ctx.answerCallbackQuery();
            }
            catch (_) { }
        }
    });
    // allow cancelling creation from the inline keyboard
    bot.callbackQuery("cancel_task", async (ctx) => {
        try {
            ctx.session.tempTaskText = undefined;
            ctx.session.tempDue = undefined;
            ctx.session.tempDueTime = undefined;
            ctx.session.awaitingNewTask = false;
            await ctx.answerCallbackQuery({ text: "❌ Создание задачи отменено" });
            await ctx.reply("Создание задачи отменено.", { reply_markup: (await Promise.resolve().then(() => __importStar(require("../keyboards")))).getPersistentKeyboard() });
        }
        catch (e) {
            console.error("Ошибка при отмене создания:", e);
            try {
                await ctx.answerCallbackQuery();
            }
            catch (_) { }
        }
    });
    // Generic callback data handler for signed actions
    bot.on("callback_query:data", async (ctx, next) => {
        try {
            const data = ctx.callbackQuery?.data;
            if (!data)
                return await next();
            const payload = (0, hmac_1.verifyPayloadCompact)(data);
            if (!payload) {
                // Not our signed callback_data — allow other handlers (like set_deadline) to process it.
                return await next();
            }
            const action = payload.action;
            const taskId = payload.taskId;
            const minutes = payload.minutes;
            if (!action || !taskId) {
                await ctx.answerCallbackQuery({ text: "⚠️ Неверные данные" });
                return;
            }
            if (action === "complete") {
                (0, tasks_2.setTaskStatus)(taskId, "completed", new Date().toISOString());
                await ctx.answerCallbackQuery({ text: "✅ Отмечено как выполненное" });
                return;
            }
            if (action === "delete") {
                (0, tasks_2.setTaskStatus)(taskId, "deleted");
                await ctx.answerCallbackQuery({ text: "🗑 Задача удалена" });
                return;
            }
            if (action === "snooze") {
                const mins = minutes || 10;
                const remindAt = new Date(Date.now() + mins * 60 * 1000).toISOString();
                (0, reminders_1.addReminder)(taskId, remindAt);
                await ctx.answerCallbackQuery({ text: `⏰ Отложено на ${mins} минут` });
                return;
            }
            await ctx.answerCallbackQuery({ text: "⚠️ Неизвестное действие" });
            return;
        }
        catch (error) {
            console.error("Ошибка обработки callback_query:", error);
            try {
                await ctx.answerCallbackQuery({ text: "❌ Ошибка при обработке действия" });
            }
            catch (_) { }
        }
    });
}
