export function getLocalISODate(date?: Date, offsetHours = 0): string {
    const now = date ? new Date(date) : new Date();
    now.setHours(now.getHours() + offsetHours);
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().split("T")[0];
}
