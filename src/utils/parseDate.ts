export function parseDateFromText(
    input: string
): { date: string; textMatch: string } | null {
    input = input.toLowerCase().trim();
    const today = new Date();

    const toLocalISO = (date: Date): string => {
        const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        return local.toISOString().split("T")[0];
    };

    const dayOfWeekMap: Record<string, number> = {
        пн: 1,
        понедельник: 1,
        вт: 2,
        вторник: 2,
        ср: 3,
        среда: 3,
        чт: 4,
        четверг: 4,
        пт: 5,
        пятница: 5,
        сб: 6,
        суббота: 6,
        вс: 0,
        воскресенье: 0,
    };

    
    const weekendMatch = input.match(/(^|\s)(на\s+выходных|в\s+выходные|выходные|выходных)($|\s|[.,!?])/);
    if (weekendMatch) {
        const d = new Date(today);
        const day = d.getDay();
        const daysUntilSaturday = (6 - day + 7) % 7;
        d.setDate(d.getDate() + daysUntilSaturday);
        return { date: toLocalISO(d), textMatch: weekendMatch[2] };
    }

    
    const tomorrowMatch = input.match(/(^|\s)(завтра)($|\s|[.,!?])/);
    if (tomorrowMatch) {
        const d = new Date(today);
        d.setDate(today.getDate() + 1);
        return { date: toLocalISO(d), textMatch: tomorrowMatch[2] };
    }

    const todayMatch = input.match(/(^|\s)(сегодня)($|\s|[.,!?])/);
    if (todayMatch) {
        const d = new Date(today);
        return { date: toLocalISO(d), textMatch: todayMatch[2] };
    }

    
    const daysMatch = input.match(/(^|\s)(через\s+(\d+)\s*(д(ень|ня|ней))?)($|\s|[.,!?])/);
    if (daysMatch) {
        const d = new Date(today);
        d.setDate(today.getDate() + parseInt(daysMatch[3], 10));
        return { date: toLocalISO(d), textMatch: daysMatch[2] };
    }

    // 'через N часов' - return the resulting date (may be today or tomorrow)
    const hoursMatch = input.match(/(^|\s)(через\s+(\d+)\s*час)/);
    if (hoursMatch) {
        const n = parseInt(hoursMatch[2], 10) || 1;
        const d = new Date(today);
        d.setHours(d.getHours() + n);
        return { date: toLocalISO(d), textMatch: hoursMatch[2] };
    }

    
    const weekMatch = input.match(/(^|\s)(через\s+неделю)($|\s|[.,!?])/);
    if (weekMatch) {
        const d = new Date(today);
        d.setDate(today.getDate() + 7);
        return { date: toLocalISO(d), textMatch: weekMatch[2] };
    }

    
    for (const [key, value] of Object.entries(dayOfWeekMap)) {
        const regex = new RegExp(`(^|\\s)(${key})($|\\s|[.,!?])`, "i");
        const match = input.match(regex);
        if (match) {
            const d = new Date(today);
            const todayWeekDay = d.getDay();
            let diff = (value - todayWeekDay + 7) % 7;
            if (diff === 0) diff = 7;
            d.setDate(d.getDate() + diff);
            return { date: toLocalISO(d), textMatch: match[2] };
        }
    }

    
    const explicitDate = input.match(/(^|\s)(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?($|\s|[.,!?])/);
    if (explicitDate) {
        let day = parseInt(explicitDate[2], 10);
        let month = parseInt(explicitDate[3], 10) - 1;
        let year = explicitDate[4]
            ? parseInt(explicitDate[4], 10)
            : today.getFullYear();

        if (year < 100) year += 2000;

        const d = new Date(year, month, day);
        if (!isNaN(d.getTime())) {
            return { date: toLocalISO(d), textMatch: explicitDate[0].trim() };
        }
    }

    return null;
}
