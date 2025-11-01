"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDate = formatDate;
function formatDate(dateStr) {
    // debug logs removed in production
    const inputDate = new Date(dateStr);
    // debug logs removed in production
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    inputDate.setHours(0, 0, 0, 0);
    const diffMs = inputDate.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    const weekdays = [
        "Воскресенье",
        "Понедельник",
        "Вторник",
        "Среда",
        "Четверг",
        "Пятница",
        "Суббота",
    ];
    if (diffDays >= 0 && diffDays <= 7) {
        return weekdays[inputDate.getDay()];
    }
    const dayNum = inputDate.getDate();
    const year = inputDate.getFullYear();
    const monthNames = [
        "января",
        "февраля",
        "марта",
        "апреля",
        "мая",
        "июня",
        "июля",
        "августа",
        "сентября",
        "октября",
        "ноября",
        "декабря",
    ];
    const monthName = monthNames[inputDate.getMonth()];
    const now = new Date();
    const currentYear = now.getFullYear();
    const dayStr = String(dayNum); // no leading zero
    const output = year === currentYear ? `${dayStr} ${monthName}` : `${dayStr} ${monthName} ${year}`;
    // debug logs removed in production
    return output;
}
