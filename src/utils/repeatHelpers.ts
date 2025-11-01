export function weekdayName(n: number) {
    const names = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];
    return names[n] || n.toString();
}

export function formatRepeatEntry(entry: any): string {
    if (!entry || !entry.type) return '';
    if (entry.type === 'daily') {
        return `Каждый день в ${entry.time}`;
    }
    if (entry.type === 'weekly') {
        return `Каждую ${weekdayName(entry.weekday)} в ${entry.time}`;
    }
    if (entry.type === 'custom') {
        // custom: { type: 'custom', weekday, time }
        return `Каждый ${weekdayName(entry.weekday)} в ${entry.time}`;
    }
    return JSON.stringify(entry);
}

export function formatRepeatEntries(entries?: Array<any>): string[] {
    if (!entries || entries.length === 0) return [];
    return entries.map(formatRepeatEntry).filter(Boolean);
}

export function repeatSummaryText(entries?: Array<any>): string {
    const lines = formatRepeatEntries(entries);
    if (lines.length === 0) return '';
    return 'Повторение:\n' + lines.join('\n');
}
