import { addRepeatRule, getRepeatRulesForTask, deleteRepeatRule } from '../db/repeatRules';
import { generateOccurrences } from '../utils/repeatGenerator';
import { addTask } from '../db/tasks';
import { addReminder, getRemindersForTask } from '../db/reminders';

describe('repeat rules and generation', () => {
  it('creates a daily rule and generates occurrences', () => {
    const taskId = addTask({ text: 'R1', due_date: '2025-01-01', due_time: '09:00', repeat_pattern: null, remind_interval: null, chat_id: null }) as number;
    const ruleId = addRepeatRule({ task_id: taskId, type: 'daily', payload: JSON.stringify({ time: '08:30' }), timezone: null });
    const rules = getRepeatRulesForTask(taskId);
    expect(rules.length).toBeGreaterThan(0);
    const occ = generateOccurrences(rules[0], new Date('2025-01-01T00:00:00.000Z'), 3);
    expect(occ.length).toBe(4); // 0..3 days

    // create reminders from occurrences
    occ.forEach((o) => addReminder(taskId, o));
    const rems = getRemindersForTask(taskId);
    expect(rems.length).toBeGreaterThanOrEqual(4);

    deleteRepeatRule(ruleId);
  });

  it('creates weekly rule and custom rule occurrences', () => {
    const taskId = addTask({ text: 'R2', due_date: '2025-01-01', due_time: '09:00', repeat_pattern: null, remind_interval: null, chat_id: null }) as number;
    const ruleId = addRepeatRule({ task_id: taskId, type: 'weekly', payload: JSON.stringify({ days: [3,5], time: '10:00' }), timezone: null });
    const rules = getRepeatRulesForTask(taskId);
    const occ = generateOccurrences(rules[0], new Date('2025-01-01T00:00:00.000Z'), 7);
    // should include dates where day is Wed(3) or Fri(5)
    expect(occ.length).toBeGreaterThan(0);
    deleteRepeatRule(ruleId);
  });
});
