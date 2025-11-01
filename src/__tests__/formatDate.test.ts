import { formatDate } from '../utils/formatDate';

describe('formatDate', () => {
  afterEach(() => {
    // restore real timers
    jest.useRealTimers();
  });

  it('returns weekday for dates within 7 days', () => {
  jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-11-01T00:00:00.000Z'));

    const res = formatDate('2025-11-03');
    const weekdays = [
      'Воскресенье',
      'Понедельник',
      'Вторник',
      'Среда',
      'Четверг',
      'Пятница',
      'Суббота',
    ];
    expect(weekdays.includes(res)).toBeTruthy();
  });

  it('returns day and month for dates beyond 7 days in same year', () => {
  jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));

    expect(formatDate('2025-12-15')).toBe('15 декабря');
  });

  it('includes year if different', () => {
  jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));

    expect(formatDate('2026-02-02')).toBe('2 февраля 2026');
  });
});

