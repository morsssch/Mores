"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Ensure tests use an in-memory DB
process.env.DB_PATH = ':memory:';
const tasks_1 = require("../db/tasks");
const reminders_1 = require("../db/reminders");
describe('db tasks and reminders', () => {
    it('creates and retrieves a task', () => {
        const id = (0, tasks_1.addTask)({
            text: 'Test task',
            due_date: '2025-12-01',
            due_time: '12:00',
            repeat_pattern: null,
            remind_interval: null,
            chat_id: 12345,
        });
        expect(typeof id).toBe('number');
        const t = (0, tasks_1.getTaskById)(id);
        expect(t).toBeDefined();
        expect(t.text).toBe('Test task');
        expect(t.chat_id).toBe(12345);
    });
    it('adds and fetches due reminders and marks them sent', () => {
        const taskId = (0, tasks_1.addTask)({
            text: 'Remind task',
            due_date: '2025-12-01',
            due_time: '12:00',
            repeat_pattern: null,
            remind_interval: null,
            chat_id: 12345,
        });
        const past = new Date(Date.now() - 1000).toISOString();
        const rid = (0, reminders_1.addReminder)(taskId, past);
        const due = (0, reminders_1.getDueReminders)(10);
        expect(due.length).toBeGreaterThan(0);
        const found = due.find((r) => r.id === rid);
        expect(found).toBeDefined();
        (0, reminders_1.markReminderSent)(rid);
        const due2 = (0, reminders_1.getDueReminders)(10);
        const still = due2.find((r) => r.id === rid);
        expect(still).toBeUndefined();
    });
});
