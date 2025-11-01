"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addReminder = addReminder;
exports.getDueReminders = getDueReminders;
exports.markReminderSent = markReminderSent;
exports.deleteRemindersForTask = deleteRemindersForTask;
exports.getRemindersForTask = getRemindersForTask;
exports.deleteReminderById = deleteReminderById;
const db_1 = __importDefault(require("./db"));
function addReminder(taskId, remindAt) {
    const stmt = db_1.default.prepare(`INSERT INTO reminders (task_id, remind_at, sent) VALUES (?, ?, 0)`);
    const info = stmt.run(taskId, remindAt);
    return info.lastInsertRowid;
}
function getDueReminders(limit = 50) {
    const stmt = db_1.default.prepare(`SELECT r.* FROM reminders r JOIN tasks t ON t.id = r.task_id WHERE r.sent = 0 AND r.remind_at <= ? AND t.status = 'pending' ORDER BY r.remind_at LIMIT ?`);
    const now = new Date().toISOString();
    return stmt.all(now, limit);
}
function markReminderSent(reminderId) {
    const stmt = db_1.default.prepare(`UPDATE reminders SET sent = 1 WHERE id = ?`);
    stmt.run(reminderId);
}
function deleteRemindersForTask(taskId) {
    const stmt = db_1.default.prepare(`DELETE FROM reminders WHERE task_id = ?`);
    stmt.run(taskId);
}
function getRemindersForTask(taskId) {
    const stmt = db_1.default.prepare(`SELECT * FROM reminders WHERE task_id = ? ORDER BY remind_at`);
    return stmt.all(taskId);
}
function deleteReminderById(id) {
    const stmt = db_1.default.prepare(`DELETE FROM reminders WHERE id = ?`);
    stmt.run(id);
}
