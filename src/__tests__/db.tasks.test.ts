// Ensure tests use an in-memory DB
process.env.DB_PATH = ':memory:';

import { addTask, getTaskById, setTaskStatus } from '../db/tasks';
import { addReminder, getDueReminders, markReminderSent } from '../db/reminders';

describe('db tasks and reminders', () => {
  it('creates and retrieves a task', () => {
    const id = addTask({
      text: 'Test task',
      due_date: '2025-12-01',
      due_time: '12:00',
      repeat_pattern: null,
      remind_interval: null,
      chat_id: 12345,
    });

    expect(typeof id).toBe('number');
    const t = getTaskById(id as number);
    expect(t).toBeDefined();
    expect((t as any).text).toBe('Test task');
    expect((t as any).chat_id).toBe(12345);
  });

  it('adds and fetches due reminders and marks them sent', () => {
    const taskId = addTask({
      text: 'Remind task',
      due_date: '2025-12-01',
      due_time: '12:00',
      repeat_pattern: null,
      remind_interval: null,
      chat_id: 12345,
    }) as number;

    const past = new Date(Date.now() - 1000).toISOString();
    const rid = addReminder(taskId, past);
    const due = getDueReminders(10);
    expect(due.length).toBeGreaterThan(0);
    const found = due.find((r) => r.id === rid);
    expect(found).toBeDefined();

    markReminderSent(rid);
    const due2 = getDueReminders(10);
    const still = due2.find((r) => r.id === rid);
    expect(still).toBeUndefined();
  });
});
