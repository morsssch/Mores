"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRepeatRule = addRepeatRule;
exports.getRepeatRulesForTask = getRepeatRulesForTask;
exports.deleteRepeatRule = deleteRepeatRule;
const db_1 = __importDefault(require("./db"));
function addRepeatRule(rule) {
    const stmt = db_1.default.prepare(`INSERT INTO repeat_rules (task_id, type, payload, timezone) VALUES (?, ?, ?, ?)`);
    const info = stmt.run(rule.task_id, rule.type, rule.payload ?? null, rule.timezone ?? null);
    return info.lastInsertRowid;
}
function getRepeatRulesForTask(taskId) {
    const stmt = db_1.default.prepare(`SELECT * FROM repeat_rules WHERE task_id = ? ORDER BY id`);
    return stmt.all(taskId);
}
function deleteRepeatRule(id) {
    const stmt = db_1.default.prepare(`DELETE FROM repeat_rules WHERE id = ?`);
    stmt.run(id);
}
