"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanTaskText = void 0;
exports.formatTaskPreview = formatTaskPreview;
exports.formatDeadlineUpdate = formatDeadlineUpdate;
exports.clearTaskSession = clearTaskSession;
exports.initTaskSession = initTaskSession;
const formatDate_1 = require("./formatDate");
const cleanTaskText_1 = require("./cleanTaskText");
Object.defineProperty(exports, "cleanTaskText", { enumerable: true, get: function () { return cleanTaskText_1.cleanTaskText; } });
function formatTaskPreview(taskText, due, dueTime, reminderISO) {
    let message = `Задача: "${taskText}"`;
    if (due) {
        message += `\n📅 Дата: ${(0, formatDate_1.formatDate)(due)}`;
    }
    if (dueTime) {
        message += `\n⏰ Время: ${dueTime}`;
    }
    if (reminderISO) {
        try {
            const d = new Date(reminderISO);
            if (!isNaN(d.getTime())) {
                // show date using formatDate (pretty) and time as HH:MM
                const datePart = d.toISOString().split("T")[0];
                const timePart = d.toISOString().split("T")[1].slice(0, 5);
                message += `\n🔔 Напомню: ${(0, formatDate_1.formatDate)(datePart)} ${timePart}`;
            }
        }
        catch (_) { }
    }
    return message;
}
function formatDeadlineUpdate(due, dueTime) {
    return (`Дедлайн обновлён:` +
        (due ? ` ${(0, formatDate_1.formatDate)(due)}` : "") +
        (dueTime ? ` ${dueTime}` : ""));
}
function clearTaskSession(ctx) {
    ctx.session.tempTaskText = undefined;
    ctx.session.tempDue = undefined;
    ctx.session.tempDueTime = undefined;
    ctx.session.awaitingNewTask = false;
}
function initTaskSession(ctx) {
    ctx.session.awaitingNewTask = true;
    ctx.session.tempTaskText = undefined;
    ctx.session.tempDue = undefined;
    ctx.session.tempDueTime = undefined;
}
