import { InlineKeyboard, Keyboard } from "grammy";
import { signPayloadCompact } from "../utils/hmac";

export const getPersistentKeyboard = () =>
    new Keyboard()
        .text("✨ Добавить задачу")
        .row()
        .text("⚡️ Входящие")
        .row()
        .text("⭐️ Сегодня")
        .text("⭐️ Завтра")
        .text("⭐️ Неделя")
        .text("🌟 Все задачи")
        .row()
        .text("♻️ Очистить выполненные")
        .text("⚙️ Настройки")
        .resized()
        .persistent();

export const taskInlineKeyboard = new InlineKeyboard()
    .text("Дедлайн", "set_deadline")
    .text("Повторение", "set_repeat")
    .text("Напоминание", "set_reminder")
    .row()
    .text("Отменить", "cancel_task")
    .text("Сохранить", "save_task");

export function taskActionKeyboard(taskId: number) {
    const completePayload = signPayloadCompact("complete", taskId);
    const deletePayload = signPayloadCompact("delete", taskId);
    const snooze10m = signPayloadCompact("snooze", taskId, { minutes: 10 });
    const snooze1h = signPayloadCompact("snooze", taskId, { minutes: 60 });
    const snooze1d = signPayloadCompact("snooze", taskId, { minutes: 24 * 60 });
    return new InlineKeyboard()
        .text("Выполнено", completePayload)
        .text("Удалить", deletePayload)
        .row()
        .text("10м", snooze10m)
        .text("1ч", snooze1h)
        .text("1д", snooze1d);
}

export function taskEditKeyboard(taskId: number) {
    const dl = signPayloadCompact("edit_deadline", taskId);
    const rep = signPayloadCompact("edit_repeat", taskId);
    const rem = signPayloadCompact("edit_reminder", taskId);
    const cancel = signPayloadCompact("cancel_edit", taskId);
    const save = signPayloadCompact("save_edit", taskId);

    return new InlineKeyboard()
        .text("Дедлайн", dl)
        .text("Повторение", rep)
        .text("Напоминание", rem)
        .row()
        .text("Отменить", cancel)
        .text("Сохранить", save);
}

export function reminderActionKeyboard(taskId: number) {
    const completePayload = signPayloadCompact("complete", taskId);
    const deletePayload = signPayloadCompact("delete", taskId);
    const snooze10m = signPayloadCompact("snooze", taskId, { minutes: 10 });
    const snooze1h = signPayloadCompact("snooze", taskId, { minutes: 60 });
    const snooze1d = signPayloadCompact("snooze", taskId, { minutes: 24 * 60 });

    return new InlineKeyboard()
        .text("Выполнить", completePayload)
        .text("Удалить", deletePayload)
        .row()
        .text("10м", snooze10m)
        .text("1ч", snooze1h)
        .text("1д", snooze1d);
}

export const getContinueKeyboard = () =>
    new InlineKeyboard().text("➡️ Продолжить", "continue_deadline");
