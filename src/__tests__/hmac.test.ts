import { signPayloadCompact, verifyPayloadCompact } from '../utils/hmac';

describe('hmac compact signer', () => {
  it('signs and verifies payloads', () => {
    const token = signPayloadCompact('snooze', 42, { minutes: 15 });
    const parsed = verifyPayloadCompact(token as string);
    expect(parsed).not.toBeNull();
    expect(parsed.action).toBe('snooze');
    expect(parsed.taskId).toBe(42);
    expect(parsed.minutes).toBe(15);
  });

  it('rejects tampered tokens', () => {
    const token = signPayloadCompact('complete', 7);
    const tampered = token.replace(':7:', ':8:');
    const parsed = verifyPayloadCompact(tampered);
    expect(parsed).toBeNull();
  });
});
