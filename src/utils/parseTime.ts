export function parseTimeFromText(
    input: string
): { time: string; textMatch: string } | null {
    input = input.toLowerCase();
    // exact HH:MM (allow punctuation or start/end around it)
    const matchHM = input.match(/(^|\s)(\d{1,2}):(\d{2})($|\s|[.,!?])/);
    if (matchHM) {
        const h = parseInt(matchHM[2], 10);
        const m = parseInt(matchHM[3], 10);
        if (h > 23 || m > 59) return null;
        return {
            time: `${h.toString().padStart(2, "0")}:${m
                .toString()
                .padStart(2, "0")}`,
            textMatch: matchHM[0].trim(),
        };
    }

    // special phrases: 'полтора часа' (1.5h) and 'полчаса'/'пол часа' (0.5h)
    const poltora = input.match(/полто?ра\s*(часа|часов|час)/i) || input.match(/полтора/i);
    if (poltora) {
        const dt = new Date(Date.now() + 90 * 60 * 1000);
        const hh = dt.getHours();
        const mm = dt.getMinutes();
        return {
            time: `${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`,
            textMatch: poltora[0].trim(),
        };
    }

    const polChasa = input.match(/пол\s*часа|полчаса/i);
    if (polChasa) {
        const dt = new Date(Date.now() + 30 * 60 * 1000);
        const hh = dt.getHours();
        const mm = dt.getMinutes();
        return {
            time: `${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`,
            textMatch: polChasa[0].trim(),
        };
    }

    // relative: "через N минут" or "через N часов" or variants
    const afterMinutesMatch = input.match(/через\s*(\d+)\s*мин/);
    if (/через\s*минут(?![а-я])/i.test(input) || afterMinutesMatch) {
        const n = afterMinutesMatch ? parseInt(afterMinutesMatch[1], 10) : 1;
        const dt = new Date(Date.now() + (n || 1) * 60 * 1000);
        const hh = dt.getHours();
        const mm = dt.getMinutes();
        const textMatch = afterMinutesMatch ? afterMinutesMatch[0] : (input.match(/через\s*минут/i) || [])[0];
        return {
            time: `${hh.toString().padStart(2, "0")}:${mm
                .toString()
                .padStart(2, "0")}`,
            textMatch: (textMatch || "через минуту").trim(),
        };
    }

    const afterHourMatch = input.match(/через\s*(\d+)\s*час/);
    if (/через\s*час(?![а-я])/i.test(input) || afterHourMatch) {
        const n = afterHourMatch ? parseInt(afterHourMatch[1], 10) : 1;
        const dt = new Date(Date.now() + (n || 1) * 60 * 60 * 1000);
        const hh = dt.getHours();
        const mm = dt.getMinutes();
        const textMatch = afterHourMatch ? afterHourMatch[0] : (input.match(/через\s*час/i) || [])[0];
        return {
            time: `${hh.toString().padStart(2, "0")}:${mm
                .toString()
                .padStart(2, "0")}`,
            textMatch: (textMatch || "через час").trim(),
        };
    }

    // pattern with explicit 'в' before time, e.g. 'в 4' or 'в 4:30'
    const vBefore = input.match(/(^|\s)в\s*(\d{1,2})(?::(\d{2}))?($|\s|[.,!?])/i);
    if (vBefore) {
        const h = parseInt(vBefore[2], 10);
        const m = vBefore[3] ? parseInt(vBefore[3], 10) : 0;
        if (h > 23 || m > 59) return null;
        return {
            time: `${h.toString().padStart(2, "0")}:${m
                .toString()
                .padStart(2, "0")}`,
            textMatch: vBefore[0].trim(),
        };
    }

    // pattern with unit after number: '4ч', '4 часов', '4 часа'
    const unitAfter = input.match(/(^|\s)(\d{1,2})(?::(\d{2}))?\s*(ч|час|часов)($|\s|[.,!?])/i);
    if (unitAfter) {
        const h = parseInt(unitAfter[2], 10);
        const m = unitAfter[3] ? parseInt(unitAfter[3], 10) : 0;
        if (h > 23 || m > 59) return null;
        return {
            time: `${h.toString().padStart(2, "0")}:${m
                .toString()
                .padStart(2, "0")}`,
            textMatch: unitAfter[0].trim(),
        };
    }

    return null;
}
