"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRepeatHandlers = registerRepeatHandlers;
const grammy_1 = require("grammy");
const taskHelpers_1 = require("../utils/taskHelpers");
// helper to map russian weekdays
const dayOfWeekMap = {
    'пн': 1, 'понедельник': 1,
    'вт': 2, 'вторник': 2,
    'ср': 3, 'среда': 3,
    'чт': 4, 'четверг': 4,
    'пт': 5, 'пятница': 5,
    'сб': 6, 'суббота': 6,
    'вс': 0, 'воскресенье': 0,
};
function weekdayName(n) {
    const names = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    return names[n] || n.toString();
}
function registerRepeatHandlers(bot) {
    bot.callbackQuery('set_repeat', async (ctx) => {
        try {
            if (!ctx.session.tempTaskText) {
                await ctx.reply('Сначала создай задачу!');
                await ctx.answerCallbackQuery();
                return;
            }
            const kb = new grammy_1.InlineKeyboard()
                .text('Каждый день', 'set_repeat_daily')
                .text('Раз в неделю', 'set_repeat_weekly')
                .row()
                .text('Кастом', 'set_repeat_custom')
                .text('Отмена', 'cancel_repeat');
            await ctx.answerCallbackQuery();
            await ctx.reply('Выберите режим повторения:', { reply_markup: kb });
        }
        catch (e) {
            console.error('repeat select error', e);
            try {
                await ctx.answerCallbackQuery();
            }
            catch (_) { }
        }
    });
    bot.callbackQuery('set_repeat_daily', async (ctx) => {
        try {
            if (!ctx.session.tempTaskText) {
                await ctx.reply('Сначала создай задачу!');
                await ctx.answerCallbackQuery();
                return;
            }
            // choose time from task or default
            const time = ctx.session.tempDueTime ?? new Date().toISOString().slice(11, 16);
            ctx.session.tempRepeatEntries = [{ type: 'daily', time }];
            await ctx.answerCallbackQuery({ text: `Повторение: каждый день в ${time}` });
            await ctx.reply((0, taskHelpers_1.formatTaskPreview)(ctx.session.tempTaskText, ctx.session.tempDue, ctx.session.tempDueTime, ctx.session.tempReminder) + `\n\nПовторение: каждый день в ${time}`, { reply_markup: (await Promise.resolve().then(() => __importStar(require('../keyboards')))).taskInlineKeyboard });
        }
        catch (e) {
            console.error('set_repeat_daily error', e);
            try {
                await ctx.answerCallbackQuery();
            }
            catch (_) { }
        }
    });
    bot.callbackQuery('set_repeat_weekly', async (ctx) => {
        try {
            if (!ctx.session.tempTaskText) {
                await ctx.reply('Сначала создай задачу!');
                await ctx.answerCallbackQuery();
                return;
            }
            // take weekday from tempDue or today
            const dateStr = ctx.session.tempDue ?? new Date().toISOString().split('T')[0];
            const [y, m, d] = dateStr.split('-').map(v => parseInt(v, 10));
            const dt = new Date(y, m - 1, d);
            const weekday = dt.getDay();
            const time = ctx.session.tempDueTime ?? new Date().toISOString().slice(11, 16);
            ctx.session.tempRepeatEntries = [{ type: 'weekly', weekday, time }];
            await ctx.answerCallbackQuery({ text: `Повторение: каждую ${weekdayName(weekday)} в ${time}` });
            await ctx.reply((0, taskHelpers_1.formatTaskPreview)(ctx.session.tempTaskText, ctx.session.tempDue, ctx.session.tempDueTime, ctx.session.tempReminder) + `\n\nПовторение: каждую ${weekdayName(weekday)} в ${time}`, { reply_markup: (await Promise.resolve().then(() => __importStar(require('../keyboards')))).taskInlineKeyboard });
        }
        catch (e) {
            console.error('set_repeat_weekly error', e);
            try {
                await ctx.answerCallbackQuery();
            }
            catch (_) { }
        }
    });
    bot.callbackQuery('set_repeat_custom', async (ctx) => {
        try {
            if (!ctx.session.tempTaskText) {
                await ctx.reply('Сначала создай задачу!');
                await ctx.answerCallbackQuery();
                return;
            }
            ctx.session.awaitingRepeatInput = true;
            await ctx.answerCallbackQuery();
            await ctx.reply('Отправь список повторений в одном сообщении, по одной строке: пример:\nпонедельник 09:00\nср 18:30\nЕсли время не указано, будет использовано текущее.');
        }
        catch (e) {
            console.error('set_repeat_custom error', e);
            try {
                await ctx.answerCallbackQuery();
            }
            catch (_) { }
        }
    });
    bot.callbackQuery('cancel_repeat', async (ctx) => {
        try {
            ctx.session.tempRepeatEntries = undefined;
            ctx.session.awaitingRepeatInput = false;
            await ctx.answerCallbackQuery({ text: 'Отмена повторения' });
        }
        catch (e) {
            console.error('cancel_repeat', e);
            try {
                await ctx.answerCallbackQuery();
            }
            catch (_) { }
        }
    });
    // handle user message when awaiting repeat input
    bot.on('message:text', async (ctx) => {
        if (!ctx.session.awaitingRepeatInput)
            return;
        const text = ctx.message?.text;
        if (!text)
            return;
        try {
            const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
            const entries = [];
            const now = new Date();
            for (const line of lines) {
                // try to parse: day + optional time
                const parts = line.split(/\s+/);
                let dayPart = parts[0].toLowerCase();
                let timePart = parts.slice(1).join(' ');
                // if first token is not a weekday, try if line contains weekday later
                if (!dayOfWeekMap[dayPart]) {
                    // attempt to find weekday token
                    const found = Object.keys(dayOfWeekMap).find(k => line.toLowerCase().includes(k));
                    if (found) {
                        dayPart = found;
                        // remove found from timePart
                        timePart = line.toLowerCase().replace(found, '').trim();
                    }
                }
                const weekday = dayOfWeekMap[dayPart];
                // parse time using existing parseTimeFromText
                const { parseTimeFromText } = await Promise.resolve().then(() => __importStar(require('../utils/parseTime')));
                let parsedTime = parseTimeFromText(timePart || '');
                if (!parsedTime) {
                    // if no time provided, use current time
                    parsedTime = { time: now.toISOString().slice(11, 16), textMatch: '' };
                }
                if (weekday === undefined) {
                    // skip lines we can't parse
                    continue;
                }
                entries.push({ type: 'custom', weekday, time: parsedTime.time });
            }
            ctx.session.tempRepeatEntries = entries;
            ctx.session.awaitingRepeatInput = false;
            if (entries.length === 0) {
                await ctx.reply('Не удалось распознать ни одной строки. Попробуй ещё раз.');
                return;
            }
            // show parsed schedule
            const linesOut = entries.map(e => `${weekdayName(e.weekday)} ${e.time}`);
            const kb = new grammy_1.InlineKeyboard().text('Сохранить', 'save_repeat').text('Отмена', 'cancel_repeat');
            await ctx.reply('Распознаны повторения:\n' + linesOut.join('\n'), { reply_markup: kb });
        }
        catch (e) {
            console.error('error parsing custom repeats', e);
            await ctx.reply('Ошибка при разборе повторений. Попробуй ещё раз.');
        }
    });
    bot.callbackQuery('save_repeat', async (ctx) => {
        try {
            await ctx.answerCallbackQuery();
            // confirmation: we keep entries in session; actual DB save will occur on task save
            await ctx.reply('Повторения сохранены во временной сессии и будут записаны при сохранении задачи.', { reply_markup: (await Promise.resolve().then(() => __importStar(require('../keyboards')))).taskInlineKeyboard });
        }
        catch (e) {
            console.error('save_repeat', e);
            try {
                await ctx.answerCallbackQuery();
            }
            catch (_) { }
        }
    });
}
exports.default = registerRepeatHandlers;
