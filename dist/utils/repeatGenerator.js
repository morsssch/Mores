"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOccurrences = generateOccurrences;
function toISODateTime(date) {
    return date.toISOString();
}
// Generate occurrences for a repeat rule within the next `days` days (inclusive)
function generateOccurrences(rule, fromDate = new Date(), days = 30) {
    const occurrences = [];
    const start = new Date(fromDate);
    start.setHours(0, 0, 0, 0);
    if (rule.type === "daily") {
        // payload can be {time: 'HH:MM'} or null -> default 09:00
        const payload = rule.payload ? JSON.parse(rule.payload) : {};
        const time = payload.time || "09:00";
        for (let i = 0; i <= days; i++) {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            const [hh, mm] = time.split(":").map(Number);
            d.setHours(hh ?? 9, mm ?? 0, 0, 0);
            occurrences.push(toISODateTime(d));
        }
    }
    else if (rule.type === "weekly") {
        // payload: {days: [0..6], time: 'HH:MM'}
        const payload = rule.payload ? JSON.parse(rule.payload) : { days: [1], time: '09:00' };
        const daysOfWeek = payload.days || [1];
        const time = payload.time || "09:00";
        for (let i = 0; i <= days; i++) {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            if (daysOfWeek.includes(d.getDay())) {
                const [hh, mm] = time.split(":").map(Number);
                d.setHours(hh ?? 9, mm ?? 0, 0, 0);
                occurrences.push(toISODateTime(d));
            }
        }
    }
    else if (rule.type === "custom") {
        // payload: {dates: ['2025-12-01T09:00:00Z', ...]}
        const payload = rule.payload ? JSON.parse(rule.payload) : { dates: [] };
        const dates = payload.dates || [];
        dates.forEach((s) => {
            const d = new Date(s);
            if (!isNaN(d.getTime())) {
                // include only within window
                const diff = (d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
                if (diff >= 0 && diff <= days)
                    occurrences.push(d.toISOString());
            }
        });
    }
    return occurrences.sort();
}
