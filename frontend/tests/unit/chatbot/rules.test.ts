import { describe, it, expect } from 'vitest'
import { matchSensitiveRule } from '@/features/chatbot/lib/rules'

// The BA owns the rule list. When it changes, these two lists say what broke.
const SHOULD_ESCALATE: [string, string, string][] = [
    ['I want to make a complaint about my manager', 'complaint', 'HR'],
    ['I am being bullied by a coworker', 'complaint', 'HR'],
    ['I think I was underpaid this month', 'pay', 'HR'],
    ['Am I going to be fired?', 'employment-decision', 'HR'],
    ['Can you approve my leave for Friday?', 'restricted-action', 'Manager'],
    ['Please approve my annual leave', 'restricted-action', 'Manager'],
]

const SHOULD_NOT_ESCALATE = [
    'How does leave approval work?',
    'Who approves leave requests?',
    'How do I request annual leave?',
    'I want to apply leave tomorrow, how can I do it?',
    'When do I need to complete mandatory training?',
    'What onboarding tasks do I still need to complete?',
]

describe('matchSensitiveRule', () => {
    it.each(SHOULD_ESCALATE)('escalates: %s', (question, category, pathway) => {
    expect(matchSensitiveRule(question)).toMatchObject({ category, pathway })
    })

    it.each(SHOULD_NOT_ESCALATE)('lets through: %s', (question) => {
    expect(matchSensitiveRule(question)).toBeNull()
    })
})