"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parseDate_1 = require("../utils/parseDate");
const parseTime_1 = require("../utils/parseTime");
const cleanTaskText_1 = require("../utils/cleanTaskText");
describe('parsers and cleaning', () => {
    afterEach(() => {
        jest.useRealTimers();
    });
    it('parses today and time with colon and removes from text', () => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2025-10-31T00:00:00.000Z'));
        const text = 'Купить хлеб сегодня в 22:30';
        const pd = (0, parseDate_1.parseDateFromText)(text);
        const pt = (0, parseTime_1.parseTimeFromText)(text);
        expect(pd).not.toBeNull();
        expect(pd.date).toBe('2025-10-31');
        expect(pt).not.toBeNull();
        expect(pt.time).toBe('22:30');
        const cleaned = (0, cleanTaskText_1.cleanTaskText)(text, pd?.textMatch, pt?.textMatch);
        expect(cleaned).toBe('Купить хлеб');
    });
    it('does not parse standalone number as time', () => {
        const text = 'Звонок 4';
        const pt = (0, parseTime_1.parseTimeFromText)(text);
        expect(pt).toBeNull();
        const cleaned = (0, cleanTaskText_1.cleanTaskText)(text, undefined, pt?.textMatch);
        expect(cleaned).toBe('Звонок 4');
    });
    it('parses "в 4" as time and removes it', () => {
        const text = 'Звонок в 4';
        const pt = (0, parseTime_1.parseTimeFromText)(text);
        expect(pt).not.toBeNull();
        expect(pt.time.startsWith('04') || pt.time.startsWith('4')).toBeTruthy();
        const cleaned = (0, cleanTaskText_1.cleanTaskText)(text, undefined, pt?.textMatch);
        expect(cleaned).toBe('Звонок');
    });
    it('parses unit forms like 4ч and removes it', () => {
        const text = 'Встреча 4ч';
        const pt = (0, parseTime_1.parseTimeFromText)(text);
        expect(pt).not.toBeNull();
        expect(pt.time.startsWith('04') || pt.time.startsWith('4')).toBeTruthy();
        const cleaned = (0, cleanTaskText_1.cleanTaskText)(text, undefined, pt?.textMatch);
        expect(cleaned).toBe('Встреча');
    });
    it('parses "через час" relative time', () => {
        jest.useFakeTimers();
        // set known time
        jest.setSystemTime(new Date('2025-10-31T10:00:00.000Z'));
        const text = 'Напомнить через час купить хлеб';
        const pt = (0, parseTime_1.parseTimeFromText)(text);
        expect(pt).not.toBeNull();
        // compute expected relative time using environment (local tz aware)
        const dt = new Date(Date.now() + 60 * 60 * 1000);
        const hh = dt.getHours().toString().padStart(2, '0');
        const mm = dt.getMinutes().toString().padStart(2, '0');
        const expected = `${hh}:${mm}`;
        expect(pt.time).toBe(expected);
        const cleaned = (0, cleanTaskText_1.cleanTaskText)(text, undefined, pt?.textMatch);
        // date/time substring was removed; remaining should contain 'Напомнить' and 'купить хлеб', but simple cleaner removes matches only
        expect(cleaned.includes('купить хлеб')).toBeTruthy();
    });
    it('parses "через 15 минут" relative time', () => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2025-10-31T10:00:00.000Z'));
        const text = 'Напомнить через 15 минут купить хлеб';
        const pt = (0, parseTime_1.parseTimeFromText)(text);
        expect(pt).not.toBeNull();
        const dt = new Date(Date.now() + 15 * 60 * 1000);
        const hh = dt.getHours().toString().padStart(2, '0');
        const mm = dt.getMinutes().toString().padStart(2, '0');
        const expected = `${hh}:${mm}`;
        expect(pt.time).toBe(expected);
    });
    it('parses "полтора часа" as 90 minutes', () => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2025-10-31T10:00:00.000Z'));
        const text = 'Напомнить через полтора часа купить хлеб';
        const pt = (0, parseTime_1.parseTimeFromText)(text);
        expect(pt).not.toBeNull();
        const dt = new Date(Date.now() + 90 * 60 * 1000);
        const hh = dt.getHours().toString().padStart(2, '0');
        const mm = dt.getMinutes().toString().padStart(2, '0');
        const expected = `${hh}:${mm}`;
        expect(pt.time).toBe(expected);
    });
    it('parses "полчаса" as 30 minutes', () => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2025-10-31T10:00:00.000Z'));
        const text = 'Напомнить полчаса купить хлеб';
        const pt = (0, parseTime_1.parseTimeFromText)(text);
        expect(pt).not.toBeNull();
        const dt = new Date(Date.now() + 30 * 60 * 1000);
        const hh = dt.getHours().toString().padStart(2, '0');
        const mm = dt.getMinutes().toString().padStart(2, '0');
        const expected = `${hh}:${mm}`;
        expect(pt.time).toBe(expected);
    });
    it('parses explicit date and time and removes them', () => {
        const text = '31.10.2025 22:40 Купить хлеб';
        const pd = (0, parseDate_1.parseDateFromText)(text);
        const pt = (0, parseTime_1.parseTimeFromText)(text);
        expect(pd).not.toBeNull();
        expect(pd.date).toBe('2025-10-31');
        expect(pt).not.toBeNull();
        expect(pt.time).toBe('22:40');
        const cleaned = (0, cleanTaskText_1.cleanTaskText)(text, pd?.textMatch, pt?.textMatch);
        expect(cleaned).toBe('Купить хлеб');
    });
});
