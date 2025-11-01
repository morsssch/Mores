import { cleanTaskText } from '../utils/cleanTaskText';

describe('cleanTaskText', () => {
  it('removes date and time with leading "в" and trims', () => {
    const text = 'Купить хлеб в 31.10.2025 22:30';
    const cleaned = cleanTaskText(text, '31.10.2025', '22:30');
    expect(cleaned).toBe('Купить хлеб');
  });

  it('removes time with leading "в" only', () => {
    const text = 'Звонок в 4';
    const cleaned = cleanTaskText(text, undefined, 'в 4');
    expect(cleaned).toBe('Звонок');
  });

  it('does not remove standalone number without context', () => {
    const text = 'Звонок 4';
    const cleaned = cleanTaskText(text, undefined, undefined);
    expect(cleaned).toBe('Звонок 4');
  });

  it('removes unit forms like 4ч', () => {
    const text = 'Встреча 4ч';
    const cleaned = cleanTaskText(text, undefined, '4ч');
    expect(cleaned).toBe('Встреча');
  });
});
