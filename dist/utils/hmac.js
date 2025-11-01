"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signPayloadCompact = signPayloadCompact;
exports.verifyPayloadCompact = verifyPayloadCompact;
const crypto_1 = __importDefault(require("crypto"));
const SECRET = process.env.CALLBACK_SECRET || process.env.BOT_TOKEN || "fallback_secret";
// Compact signer: produces small strings like action:taskId:minutes:hexsig
function signPayloadCompact(action, taskId, extras) {
    const payload = `${action}:${taskId}:${extras?.minutes ?? ""}`;
    const sig = crypto_1.default.createHmac("sha256", SECRET).update(payload).digest("hex");
    // shorten signature to 32 chars (16 bytes) to fit callback_data limits
    const short = sig.slice(0, 32);
    return `${action}:${taskId}:${extras?.minutes ?? ""}:${short}`;
}
function verifyPayloadCompact(token) {
    try {
        const parts = token.split(":");
        // expecting [action, taskId, minutes?, sig]
        if (parts.length < 3)
            return null;
        const sig = parts[parts.length - 1];
        const action = parts[0];
        const taskId = Number(parts[1]);
        const minutes = parts[2] === "" ? undefined : Number(parts[2]);
        const base = `${action}:${taskId}:${parts[2]}`;
        const expected = crypto_1.default.createHmac("sha256", SECRET).update(base).digest("hex").slice(0, 32);
        // constant time compare
        if (!crypto_1.default.timingSafeEqual(Buffer.from(expected), Buffer.from(sig)))
            return null;
        return { action, taskId, minutes };
    }
    catch (e) {
        return null;
    }
}
