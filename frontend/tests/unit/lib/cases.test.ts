import { describe, it, expect } from 'vitest'
import { PRIORITY_LABELS, sortCasesForReview } from '@/lib/cases'

describe('sortCasesForReview', () => {
    it('puts urgent cases first, newest first within a priority, and treats a missing priority as 3', () => {
        const cases = [
            { id: 'old-normal', priority: 3, createdAt: '2026-10-01T00:00:00Z' },
            { id: 'no-priority', createdAt: '2026-10-09T00:00:00Z' },
            { id: 'urgent-old', priority: 1, createdAt: '2026-10-02T00:00:00Z' },
            { id: 'high', priority: 2, createdAt: '2026-10-08T00:00:00Z' },
            { id: 'urgent-new', priority: 1, createdAt: '2026-10-09T00:00:00Z' },
        ]
        expect(sortCasesForReview(cases).map((c) => c.id)).toEqual(['urgent-new', 'urgent-old', 'high', 'no-priority', 'old-normal'])
    })

    it('does not change the list it was given', () => {
        const cases = [{ priority: 3 }, { priority: 1 }]
        sortCasesForReview(cases)
        expect(cases[0]?.priority).toBe(3)
    })

    it("uses the BA's names for the levels", () => {
        expect([PRIORITY_LABELS[1], PRIORITY_LABELS[2], PRIORITY_LABELS[3]]).toEqual(['High', 'Medium', 'Low'])
    })
})
