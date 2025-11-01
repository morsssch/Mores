"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const repeatRules_1 = require("../db/repeatRules");
const repeatGenerator_1 = require("../utils/repeatGenerator");
const tasks_1 = require("../db/tasks");
const reminders_1 = require("../db/reminders");
describe('repeat rules and generation', () => {
    it('creates a daily rule and generates occurrences', () => {
        const taskId = (0, tasks_1.addTask)({ text: 'R1', due_date: '2025-01-01', due_time: '09:00', repeat_pattern: null, remind_interval: null, chat_id: null });
        const ruleId = (0, repeatRules_1.addRepeatRule)({ task_id: taskId, type: 'daily', payload: JSON.stringify({ time: '08:30' }), timezone: null });
        const rules = (0, repeatRules_1.getRepeatRulesForTask)(taskId);
        expect(rules.length).toBeGreaterThan(0);
        const occ = (0, repeatGenerator_1.generateOccurrences)(rules[0], new Date('2025-01-01T00:00:00.000Z'), 3);
        expect(occ.length).toBe(4); // 0..3 days
        // create reminders from occurrences
        occ.forEach((o) => (0, reminders_1.addReminder)(taskId, o));
        const rems = (0, reminders_1.getRemindersForTask)(taskId);
        expect(rems.length).toBeGreaterThanOrEqual(4);
        (0, repeatRules_1.deleteRepeatRule)(ruleId);
    });
    it('creates weekly rule and custom rule occurrences', () => {
        const taskId = (0, tasks_1.addTask)({ text: 'R2', due_date: '2025-01-01', due_time: '09:00', repeat_pattern: null, remind_interval: null, chat_id: null });
        const ruleId = (0, repeatRules_1.addRepeatRule)({ task_id: taskId, type: 'weekly', payload: JSON.stringify({ days: [3, 5], time: '10:00' }), timezone: null });
        const rules = (0, repeatRules_1.getRepeatRulesForTask)(taskId);
        const occ = (0, repeatGenerator_1.generateOccurrences)(rules[0], new Date('2025-01-01T00:00:00.000Z'), 7);
        // should include dates where day is Wed(3) or Fri(5)
        expect(occ.length).toBeGreaterThan(0);
        (0, repeatRules_1.deleteRepeatRule)(ruleId);
    });
});
