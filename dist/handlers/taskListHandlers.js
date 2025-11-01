"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleTodayTasks = handleTodayTasks;
exports.handleTomorrowTasks = handleTomorrowTasks;
exports.handleWeekTasks = handleWeekTasks;
exports.registerTaskListHandlers = registerTaskListHandlers;
const tasks_1 = require("../db/tasks");
const keyboards_1 = require("../keyboards");
const formatDate_1 = require("../utils/formatDate");
const getLocalISODate_1 = require("../utils/getLocalISODate");
function formatTime(timeStr) {
    if (!timeStr)
        return "";
    return `⏰ ${timeStr}`;
}
function formatDeadline(dueDate, dueTime) {
    if (!dueDate)
        return "";
    const datePart = (0, formatDate_1.formatDate)(dueDate)
        .replace(/\*/g, "")
        .replace("🎯 ", "")
        .replace("🚀 ", "")
        .replace("📅 ", "");
    if (dueTime) {
        return `⏳ до ${datePart} ${dueTime}`;
    }
    return `⏳ до ${datePart}`;
}
function formatTask(task) {
    const status = task.status === "completed" ? "✅" : "⭕";
    const repeatIcon = task.repeat_pattern ? " 🔄" : "";
    const deadlineInfo = formatDeadline(task.due_date, task.due_time);
    return `${status} ${task.text}${repeatIcon}\n   ${deadlineInfo}\n`;
}
function groupTasksByDate(tasks) {
    return tasks.reduce((groups, task) => {
        const date = task.due_date || "Без даты";
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(task);
        return groups;
    }, {});
}
function createWeekTasksMessage(tasks) {
    if (tasks.length === 0) {
        return `📭 На неделю задач нет!\n\nМожно отдохнуть или добавить новые задачи 😊`;
    }
    const groupedTasks = groupTasksByDate(tasks);
    const dates = Object.keys(groupedTasks).sort();
    let message = `🗓️ *Задачи на неделю:*\n\n`;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "completed").length;
    const pendingTasks = totalTasks - completedTasks;
    const repeatingTasks = tasks.filter((t) => t.repeat_pattern).length;
    dates.forEach((date) => {
        const dayTasks = groupedTasks[date];
        const completedCount = dayTasks.filter((t) => t.status === "completed").length;
        message += `${(0, formatDate_1.formatDate)(date)}`;
        if (completedCount > 0) {
            message += ` ✅ ${completedCount}/${dayTasks.length}`;
        }
        message += `\n`;
        dayTasks.forEach((task) => {
            const status = task.status === "completed" ? "✅" : "⭕";
            const repeatIcon = task.repeat_pattern ? " 🔄" : "";
            const timeInfo = task.due_time
                ? ` ${formatTime(task.due_time)}`
                : "";
            message += `${status} ${task.text}${repeatIcon}${timeInfo}\n`;
        });
        message += `\n`;
    });
    message += `\n*📊 Статистика недели:*\n`;
    message += `• Всего задач: ${totalTasks}\n`;
    message += `• Активных: ${pendingTasks}\n`;
    message += `• Выполнено: ${completedTasks}\n`;
    if (repeatingTasks > 0) {
        message += `• Повторяющихся: ${repeatingTasks} 🔄\n`;
    }
    return message;
}
function createSimpleTasksMessage(tasks, period) {
    if (tasks.length === 0) {
        return `📭 На ${period} задач нет!\n\nМожно отдохнуть или добавить новые задачи 😊`;
    }
    const completedTasks = tasks.filter((t) => t.status === "completed");
    const pendingTasks = tasks.filter((t) => t.status !== "completed");
    let message = `📋 *Задачи на ${period}:*\n\n`;
    if (pendingTasks.length > 0) {
        message += `*🔴 Активные задачи (${pendingTasks.length}):*\n`;
        pendingTasks.forEach((task) => {
            const repeatIcon = task.repeat_pattern ? " 🔄" : "";
            const timeInfo = task.due_time
                ? ` ${formatTime(task.due_time)}`
                : "";
            message += `⭕ ${task.text}${repeatIcon}${timeInfo}\n`;
        });
        message += "\n";
    }
    if (completedTasks.length > 0) {
        message += `*✅ Выполненные задачи (${completedTasks.length}):*\n`;
        completedTasks.forEach((task) => {
            message += `✅ ${task.text}\n`;
        });
    }
    message += `\n*📊 Итого:* ${pendingTasks.length} активных, ${completedTasks.length} выполнено`;
    return message;
}
// === ХЕНДЛЕРЫ ===
async function handleTodayTasks(ctx) {
    try {
        const userId = ctx.from.id;
        const today = (0, getLocalISODate_1.getLocalISODate)();
        const tasks = await (0, tasks_1.getTasksForToday)(userId, today);
        const message = createSimpleTasksMessage(tasks, "сегодня");
        await ctx.reply(message, {
            parse_mode: "Markdown",
            reply_markup: (0, keyboards_1.getPersistentKeyboard)(),
        });
    }
    catch (error) {
        console.error("Ошибка при получении задач на сегодня:", error);
        await ctx.reply("❌ Произошла ошибка при загрузке задач");
    }
}
async function handleTomorrowTasks(ctx) {
    try {
        const userId = ctx.from.id;
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tasks = await (0, tasks_1.getTasksForTomorrow)(userId, (0, getLocalISODate_1.getLocalISODate)(tomorrow));
        const message = createSimpleTasksMessage(tasks, "завтра");
        await ctx.reply(message, {
            parse_mode: "Markdown",
            reply_markup: (0, keyboards_1.getPersistentKeyboard)(),
        });
    }
    catch (error) {
        console.error("Ошибка при получении задач на завтра:", error);
        await ctx.reply("❌ Произошла ошибка при загрузке задач");
    }
}
async function handleWeekTasks(ctx) {
    try {
        const userId = ctx.from.id;
        const startOfWeek = (0, getLocalISODate_1.getLocalISODate)();
        const endOfWeekDate = new Date();
        endOfWeekDate.setDate(endOfWeekDate.getDate() + 7);
        const endOfWeek = (0, getLocalISODate_1.getLocalISODate)(endOfWeekDate);
        const tasks = await (0, tasks_1.getTasksForWeek)(userId, startOfWeek, endOfWeek);
        const message = createWeekTasksMessage(tasks);
        await ctx.reply(message, {
            parse_mode: "Markdown",
            reply_markup: (0, keyboards_1.getPersistentKeyboard)(),
        });
    }
    catch (error) {
        console.error("Ошибка при получении задач на неделю:", error);
        await ctx.reply("❌ Произошла ошибка при загрузке задач");
    }
}
function registerTaskListHandlers(bot) {
    bot.hears("📅 Сегодня", handleTodayTasks);
    bot.hears("⏩ Завтра", handleTomorrowTasks);
    bot.hears("📆 Неделя", handleWeekTasks);
}
