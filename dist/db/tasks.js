"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addTask = addTask;
exports.getTasks = getTasks;
exports.completeTask = completeTask;
exports.getTasksForDate = getTasksForDate;
exports.getTasksForToday = getTasksForToday;
exports.getTasksForTomorrow = getTasksForTomorrow;
exports.getTasksForWeek = getTasksForWeek;
exports.getTaskById = getTaskById;
exports.updateTask = updateTask;
exports.deleteTask = deleteTask;
exports.setTaskStatus = setTaskStatus;
const db_1 = __importDefault(require("./db"));
function addTask(task) {
    const stmt = db_1.default.prepare(`
        INSERT INTO tasks (text, due_date, due_time, repeat_pattern, remind_interval, status, chat_id)
        VALUES (?, ?, ?, ?, ?, 'pending', ?)
    `);
    const info = stmt.run(task.text, task.due_date, task.due_time, task.repeat_pattern, task.remind_interval, task.chat_id ?? null);
    return info.lastInsertRowid;
}
function getTasks() {
    const stmt = db_1.default.prepare("SELECT * FROM tasks WHERE status = 'pending' ORDER BY due_date, due_time");
    return stmt.all();
}
function completeTask(id) {
    const stmt = db_1.default.prepare("UPDATE tasks SET status = 'completed', completed_at = ? WHERE id = ?");
    stmt.run(new Date().toISOString(), id);
}
function getTasksForDate(userId, date) {
    const stmt = db_1.default.prepare(`
        SELECT * FROM tasks
        WHERE due_date = ?
        ORDER BY due_time IS NULL, due_time
    `);
    return stmt.all(date);
}
function getTasksForToday(userId, today) {
    const stmt = db_1.default.prepare(`
        SELECT * FROM tasks
        WHERE due_date = ?
        ORDER BY due_time IS NULL, due_time
    `);
    return stmt.all(today);
}
function getTasksForTomorrow(userId, tomorrow) {
    const stmt = db_1.default.prepare(`
        SELECT * FROM tasks
        WHERE due_date = ?
        ORDER BY due_time IS NULL, due_time
    `);
    return stmt.all(tomorrow);
}
function getTasksForWeek(userId, startDate, endDate) {
    const stmt = db_1.default.prepare(`
        SELECT * FROM tasks
        WHERE due_date BETWEEN ? AND ?
        AND status = 'pending'
        ORDER BY due_date, due_time IS NULL, due_time
    `);
    return stmt.all(startDate, endDate);
}
function getTaskById(id) {
    const stmt = db_1.default.prepare("SELECT * FROM tasks WHERE id = ?");
    return stmt.get(id);
}
function updateTask(task) {
    const stmt = db_1.default.prepare(`
        UPDATE tasks 
        SET text = ?, due_date = ?, due_time = ?, repeat_pattern = ?, remind_interval = ?, status = ?, completed_at = ?
        WHERE id = ?
    `);
    stmt.run(task.text, task.due_date, task.due_time, task.repeat_pattern, task.remind_interval, 
    // @ts-ignore allow string status on Task
    task.status ?? 'pending', task.completed_at ?? null, task.id);
}
function deleteTask(id) {
    // Soft delete
    const stmt = db_1.default.prepare("UPDATE tasks SET status = 'deleted' WHERE id = ?");
    stmt.run(id);
}
function setTaskStatus(id, status, completedAt) {
    const stmt = db_1.default.prepare("UPDATE tasks SET status = ?, completed_at = ? WHERE id = ?");
    stmt.run(status, completedAt ?? null, id);
}
