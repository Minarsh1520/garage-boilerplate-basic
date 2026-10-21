import { describe, it, expect } from 'vitest'
import { daysBetween, describeDue, resolveDueDate, sortTasksByUrgency, todayIn } from '@/features/chatbot/lib/due-dates'
import { formatRecord } from '@/features/chatbot/lib/record'

const START = '2026-09-14'

describe('resolveDueDate', () => {
    it.each([
        ['Before your first day', '2026-09-13'],
        ['Your first day', '2026-09-14'],
        ['14 days from your start date', '2026-09-28'],
        ['28 days from your start date', '2026-10-12'],
        ['Within 30 days', '2026-10-14'],
        ['2026-11-01', '2026-11-01'],
        ['3 Days', '2026-09-17'],
        ['0 Days', '2026-09-14'],
    ])('turns "%s" into %s', (duein, expected) => {
        expect(resolveDueDate(duein, START)).toBe(expected)
    })

    it('returns null instead of guessing', () => {
        expect(resolveDueDate('As soon as possible', START)).toBeNull()
        expect(resolveDueDate('14 days from your start date', undefined)).toBeNull()
        expect(resolveDueDate('14 days from your start date', 'mid September')).toBeNull()
        expect(resolveDueDate(undefined, START)).toBeNull()
    })
})

describe('describeDue', () => {
    it.each([
        ['2026-10-14', 'overdue by 3 days'],
        ['2026-10-16', 'overdue by 1 day'],
        ['2026-10-17', 'due today'],
        ['2026-10-18', 'due tomorrow'],
        ['2026-10-22', 'due in 5 days'],
    ])('%s seen on 2026-10-17 is "%s"', (due, words) => {
        expect(describeDue(due, '2026-10-17')).toBe(words)
    })

    it('counts whole days across a month end', () => {
        expect(daysBetween('2026-09-30', '2026-10-01')).toBe(1)
    })
})

describe('todayIn', () => {
    it("uses the company's time zone, not the server's", () => {
        // 14:30 UTC on 16 Oct is already 17 Oct in Melbourne (UTC+11 in October).
        expect(todayIn('Australia/Melbourne', new Date('2026-10-16T14:30:00Z'))).toBe('2026-10-17')
    })
})

describe('sortTasksByUrgency', () => {
    const tasks: { title: string; status: 'pending' | 'completed'; duein: string }[] = [
        { title: 'Super Fund Nomination', status: 'pending', duein: '28 days from your start date' },
        { title: 'TFN Declaration', status: 'completed', duein: 'Before your first day' },
        { title: 'Ask about parking', status: 'pending', duein: 'Whenever suits' },
        { title: 'Company Policies', status: 'pending', duein: '14 days from your start date' },
    ]

    it('puts pending tasks soonest first, unknown dates after them, completed last', () => {
        const order = sortTasksByUrgency(tasks, START, '2026-10-17').map((t) => t.task.title)
        expect(order).toEqual(['Company Policies', 'Super Fund Nomination', 'Ask about parking', 'TFN Declaration'])
    })

    it('gives the AI the worked-out date and words, so it never does the maths', () => {
        const text = formatRecord({ startDate: START, checklist: tasks }, '2026-10-17')
        expect(text).toContain('- Company Policies: pending (due: 14 days from your start date, 2026-09-28, overdue by 19 days)')
        expect(text.indexOf('Company Policies')).toBeLessThan(text.indexOf('Super Fund Nomination'))
        // Completed tasks keep their wording but get no "overdue" label.
        expect(text).toContain('- TFN Declaration: completed (due: Before your first day)')
    })
})

describe('tasks from the Admin task tools (dueDate saved with the task)', () => {
    it('uses the saved dueDate over the wording, and ignores one that is not a date', () => {
        const tasks: { title: string; status: 'pending' | 'completed'; duein: string; dueDate?: string }[] = [
            { title: 'Read through company policies', status: 'pending', duein: '1 Days', dueDate: '2026-10-20' },
            { title: 'Super Fund Nomination', status: 'pending', duein: '3 Days', dueDate: 'soon' },
        ]
        const sorted = sortTasksByUrgency(tasks, START, '2026-10-17')
        expect(sorted.map((t) => [t.task.title, t.dueDate])).toEqual([
            ['Super Fund Nomination', '2026-09-17'], // bad dueDate: worked out from "3 Days"
            ['Read through company policies', '2026-10-20'], // saved date used as is
        ])
    })

    it('keeps dueDate when reading the record, so the AI sees the real date', () => {
        const text = formatRecord({ startDate: START, checklist: [{ title: 'Tax File Declaration', status: 'pending', duein: '0 Days', dueDate: '2026-10-18' }] }, '2026-10-17')
        expect(text).toContain('- Tax File Declaration: pending (due: 0 Days, 2026-10-18, due tomorrow)')
    })
})
