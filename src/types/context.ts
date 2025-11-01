import { Context, SessionFlavor } from "grammy";
import { Message } from "grammy/types";

export type SessionData = {
    awaitingNewTask: boolean;
    awaitingDeadline: boolean;
    awaitingReminderDate?: boolean;
    awaitingRepeatInput?: boolean;
    tempDueTime: any;
    tempTaskText?: string;
    tempDue?: string | null | undefined;
    tempDeadline?: string;
    tempRepeatPattern?: string;
    tempRepeatEntries?: Array<any>;
    tempRemindInterval?: string;
    tempReminder?: string; // ISO datetime for reminder (will be saved when task is saved)
};

export type BotContext = Context &
    SessionFlavor<SessionData> & {
        message?: Message.TextMessage;
        callbackQuery?: {
            id: string;
            from: {
                id: number;
                is_bot: boolean;
                first_name: string;
                username?: string;
                language_code?: string;
            };
            data?: string;
            chat_instance?: string;
            message?: Message.TextMessage;
        };
    };
