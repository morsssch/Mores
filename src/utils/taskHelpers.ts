import { formatDate } from "./formatDate";
import { cleanTaskText } from "./cleanTaskText";

export function formatTaskPreview(
    taskText: string,
    due?: string,
    dueTime?: string,
    reminderISO?: string
): string {
    let message = `Задача: "${taskText}"`;

    if (due) {
        message += `\n📅 Дата: ${formatDate(due)}`;
    }

    if (dueTime) {
        message += `\n⏰ Время: ${dueTime}`;
    }

    if (reminderISO) {
        try {
            const d = new Date(reminderISO);
            if (!isNaN(d.getTime())) {
                // show date/time in Moscow (UTC+3) so displayed time matches user's expectations
                const ms = d.getTime() + 3 * 60 * 60 * 1000;
                const md = new Date(ms);
                const datePart = md.toISOString().split("T")[0];
                const timePart = md.toISOString().split("T")[1].slice(0, 5);
                message += `\n🔔 Напомню: ${formatDate(datePart)} ${timePart}`;
            }
        } catch (_) {}
    }

    return message;
}

export function formatDeadlineUpdate(due?: string, dueTime?: string): string {
    return (
        `Дедлайн обновлён:` +
        (due ? ` ${formatDate(due)}` : "") +
        (dueTime ? ` ${dueTime}` : "")
    );
}

export function clearTaskSession(ctx: any) {
    ctx.session.tempTaskText = undefined;
    ctx.session.tempDue = undefined;
    ctx.session.tempDueTime = undefined;
    ctx.session.awaitingNewTask = false;
}

export function initTaskSession(ctx: any) {
    ctx.session.awaitingNewTask = true;
    ctx.session.tempTaskText = undefined;
    ctx.session.tempDue = undefined;
    ctx.session.tempDueTime = undefined;
}
export { cleanTaskText };

