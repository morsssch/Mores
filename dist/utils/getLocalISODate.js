"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLocalISODate = getLocalISODate;
function getLocalISODate(date, offsetHours = 0) {
    const now = date ? new Date(date) : new Date();
    now.setHours(now.getHours() + offsetHours);
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().split("T")[0];
}
