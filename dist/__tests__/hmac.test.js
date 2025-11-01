"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hmac_1 = require("../utils/hmac");
describe('hmac compact signer', () => {
    it('signs and verifies payloads', () => {
        const token = (0, hmac_1.signPayloadCompact)('snooze', 42, { minutes: 15 });
        const parsed = (0, hmac_1.verifyPayloadCompact)(token);
        expect(parsed).not.toBeNull();
        expect(parsed.action).toBe('snooze');
        expect(parsed.taskId).toBe(42);
        expect(parsed.minutes).toBe(15);
    });
    it('rejects tampered tokens', () => {
        const token = (0, hmac_1.signPayloadCompact)('complete', 7);
        const tampered = token.replace(':7:', ':8:');
        const parsed = (0, hmac_1.verifyPayloadCompact)(tampered);
        expect(parsed).toBeNull();
    });
});
