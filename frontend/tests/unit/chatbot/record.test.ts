import { describe, it, expect } from 'vitest'
import { formatRecord } from '@/features/chatbot/lib/record'

describe('formatRecord', () => {
    it('lists each task with its status', () => {
        const text = formatRecord({ employeeName: 'Alex Chen', checklist: [{ title: 'TFN Declaration', status: 'completed' }] })
        expect(text).toContain('- TFN Declaration: completed')
    })

    // A missing or empty list must NOT look like "nothing outstanding".
    it.each([[undefined], [[]]])('marks tasks as not available when the list is %j', (checklist) => {
        expect(formatRecord({ employeeName: 'Alex Chen', checklist })).toContain('Onboarding tasks: not available')
    })

    it('marks other missing fields as not available', () => {
        expect(formatRecord({})).toContain('Manager: not available')
    })

    it('includes the due date when the checklist item has one', () => {
        const text = formatRecord({ checklist: [{ title: 'Company Policies', status: 'pending', duein: '14 days from your start date' }] })
        expect(text).toContain('- Company Policies: pending (due: 14 days from your start date)')
    })
})
