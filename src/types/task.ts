export type Task = {
    id?: number;
    text: string;
    due_date?: string | null;
    due_time?: string | null;
    repeat_pattern?: string | null;
    remind_interval?: string | null;
    created_at?: string;
    status?: 'pending' | 'completed' | 'deleted';
    completed_at?: string | null;
    chat_id?: number | null;
    parent_id?: number | null;
};
