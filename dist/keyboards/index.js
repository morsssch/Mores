"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContinueKeyboard = exports.taskInlineKeyboard = exports.getPersistentKeyboard = void 0;
exports.taskActionKeyboard = taskActionKeyboard;
exports.taskEditKeyboard = taskEditKeyboard;
exports.reminderActionKeyboard = reminderActionKeyboard;
const grammy_1 = require("grammy");
const hmac_1 = require("../utils/hmac");
const getPersistentKeyboard = () => new grammy_1.Keyboard()
    .text("📝 Добавить задачу")
    .row()
    .text("📅 Сегодня")
    .text("⏩ Завтра")
    .text("📆 Неделя")
    .resized()
    .persistent();
exports.getPersistentKeyboard = getPersistentKeyboard;
exports.taskInlineKeyboard = new grammy_1.InlineKeyboard()
    .text("Дедлайн", "set_deadline")
    .text("Повторение", "set_repeat")
    .text("Напоминание", "set_reminder")
    .row()
    .text("Отменить", "cancel_task")
    .text("💾 Сохранить", "save_task");
function taskActionKeyboard(taskId) {
    const completePayload = (0, hmac_1.signPayloadCompact)("complete", taskId);
    const deletePayload = (0, hmac_1.signPayloadCompact)("delete", taskId);
    const snooze10m = (0, hmac_1.signPayloadCompact)("snooze", taskId, { minutes: 10 });
    const snooze1h = (0, hmac_1.signPayloadCompact)("snooze", taskId, { minutes: 60 });
    const snooze1d = (0, hmac_1.signPayloadCompact)("snooze", taskId, { minutes: 24 * 60 });
    return new grammy_1.InlineKeyboard()
        .text("Выполнено", completePayload)
        .text("Удалить", deletePayload)
        .row()
        .text("10м", snooze10m)
        .text("1ч", snooze1h)
        .text("1д", snooze1d);
}
function taskEditKeyboard(taskId) {
    const dl = (0, hmac_1.signPayloadCompact)("edit_deadline", taskId);
    const rep = (0, hmac_1.signPayloadCompact)("edit_repeat", taskId);
    const rem = (0, hmac_1.signPayloadCompact)("edit_reminder", taskId);
    const cancel = (0, hmac_1.signPayloadCompact)("cancel_edit", taskId);
    const save = (0, hmac_1.signPayloadCompact)("save_edit", taskId);
    return new grammy_1.InlineKeyboard()
        .text("Дедлайн", dl)
        .text("Повторение", rep)
        .text("Напоминание", rem)
        .row()
        .text("Отменить", cancel)
        .text("Сохранить", save);
}
function reminderActionKeyboard(taskId) {
    const completePayload = (0, hmac_1.signPayloadCompact)("complete", taskId);
    const deletePayload = (0, hmac_1.signPayloadCompact)("delete", taskId);
    const snooze10m = (0, hmac_1.signPayloadCompact)("snooze", taskId, { minutes: 10 });
    const snooze1h = (0, hmac_1.signPayloadCompact)("snooze", taskId, { minutes: 60 });
    const snooze1d = (0, hmac_1.signPayloadCompact)("snooze", taskId, { minutes: 24 * 60 });
    return new grammy_1.InlineKeyboard()
        .text("Выполнить", completePayload)
        .text("Удалить", deletePayload)
        .row()
        .text("10м", snooze10m)
        .text("1ч", snooze1h)
        .text("1д", snooze1d);
}
// Continue as an inline button so it doesn't replace the persistent keyboard
const getContinueKeyboard = () => new grammy_1.InlineKeyboard().text("➡️ Продолжить", "continue_deadline");
exports.getContinueKeyboard = getContinueKeyboard;
