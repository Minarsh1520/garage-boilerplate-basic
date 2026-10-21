// Real due dates for onboarding tasks, worked out in CODE.
//
// The checklist stores deadlines as words ("Before your first day", "28 days from your start
// date"), and the AI doesn't know today's date. So the app turns each deadline into a date
// from the employee's start date, compares it with today, and hands the AI the result.
// The AI only explains it ("Company Policies is overdue by 3 days"); it never does the maths.
// BA rule: "Identify urgent tasks: highlight tasks with the earliest due dates".

// The company's dates are Melbourne dates. A task due "today" must not flip to tomorrow
// just because the server runs in another time zone.
export const APP_TIME_ZONE = 'Australia/Melbourne'
const DAY_MS = 24 * 60 * 60 * 1000
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

// Today's date as YYYY-MM-DD in the company's time zone.
export function todayIn(timeZone = APP_TIME_ZONE, now = new Date()): string {
    // en-CA formats dates as YYYY-MM-DD.
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

function toUtcMs(date: string): number | null {
    if (!ISO_DATE.test(date)) return null
    const ms = Date.parse(`${date}T00:00:00Z`)
    return Number.isNaN(ms) ? null : ms
}

function addDays(date: string, days: number): string | null {
    const ms = toUtcMs(date)
    return ms === null ? null : new Date(ms + days * DAY_MS).toISOString().slice(0, 10)
}

// Whole days from `from` to `to` (negative when `to` is earlier).
export function daysBetween(from: string, to: string): number | null {
    const a = toUtcMs(from)
    const b = toUtcMs(to)
    return a === null || b === null ? null : Math.round((b - a) / DAY_MS)
}

// The deadline wordings the checklist uses, turned into a date. Anything else gives null
// ("unknown"), never a guess.
export function resolveDueDate(duein: string | undefined, startDate: string | undefined): string | null {
    const text = duein?.trim()
    if (!text) return null
    if (ISO_DATE.test(text)) return text // already a date
    if (!startDate || !ISO_DATE.test(startDate)) return null // relative deadlines need the start date
    if (/\bbefore (your|the) first day\b/i.test(text)) return addDays(startDate, -1)
    if (/\b(on )?(your|the) first day\b/i.test(text)) return startDate
    // "3 Days" is how the Admin task tools word it: days from the start date.
    const days =
        text.match(/^(\d{1,3})\s+days?$/i) ??
        text.match(/\b(\d{1,3})\s+days?\s+(from|after)\s+(your\s+|the\s+)?start/i) ??
        text.match(/\bwithin\s+(\d{1,3})\s+days?\b/i)
    if (days?.[1]) return addDays(startDate, Number(days[1]))
    return null
}

// "overdue by 3 days", "due today", "due tomorrow", "due in 5 days".
export function describeDue(dueDate: string, today: string): string {
    const days = daysBetween(today, dueDate)
    if (days === null) return 'due date unknown'
    if (days < 0) return `overdue by ${-days} day${days === -1 ? '' : 's'}`
    if (days === 0) return 'due today'
    if (days === 1) return 'due tomorrow'
    return `due in ${days} days`
}

export interface DatedTask<T> {
    task: T
    dueDate: string | null
    daysLeft: number | null // negative = overdue
}

// Each task's date: its saved dueDate if it has a valid one, otherwise worked out from duein.
// Pending tasks first, soonest due first (overdue at the top); tasks with no known date
// after them; completed tasks last. The original order is kept within each group.
export function sortTasksByUrgency<T extends { status: string; duein?: string; dueDate?: string }>(
    tasks: T[],
    startDate: string | undefined,
    today: string
): DatedTask<T>[] {
    const dated = tasks.map((task, index) => {
        // A real date saved with the task (Admin task tools) wins over working it out from the words.
        const stored = task.dueDate && ISO_DATE.test(task.dueDate) ? task.dueDate : null
        const dueDate = stored ?? resolveDueDate(task.duein, startDate)
        return { task, dueDate, daysLeft: dueDate ? daysBetween(today, dueDate) : null, index }
    })
    const group = (t: (typeof dated)[number]) => (t.task.status === 'completed' ? 2 : t.daysLeft === null ? 1 : 0)
    return dated
        .sort((a, b) => group(a) - group(b) || (a.daysLeft ?? 0) - (b.daysLeft ?? 0) || a.index - b.index)
        .map(({ task, dueDate, daysLeft }) => ({ task, dueDate, daysLeft }))
}
