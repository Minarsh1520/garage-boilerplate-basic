import { describe, it, expect } from 'vitest'
import { formatRecord } from '@/features/chatbot/lib/record'

describe('formatRecord', () => {
    it('lists each task with its status', () => {
        const text = formatRecord({ name: 'Alex Chen', tasks: [{ label: 'TFN Declaration', status: 'completed' }] })
        expect(text).toContain('- TFN Declaration: completed')
    })

    // A missing or empty list must NOT look like "nothing outstanding".
    it.each([[undefined], [[]]])('marks tasks as not available when the list is %j', (tasks) => {
        expect(formatRecord({ name: 'Alex Chen', tasks })).toContain('Onboarding tasks: not available')
    })

    it('marks other missing fields as not available', () => {
        expect(formatRecord({})).toContain('Manager: not available')
    })
})