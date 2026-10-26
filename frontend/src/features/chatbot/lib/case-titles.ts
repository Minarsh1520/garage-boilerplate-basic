import type { CaseCategory, Pathway } from '../types'

// The heading a case gets on the Admin Cases page. Kept in its own file (no database code)
// so the chat window can show the employee the SAME heading in the preview before sending.
export const CASE_TITLES: Record<CaseCategory, string> = {
    complaint: 'Workplace complaint or conflict',
    wellbeing: 'Wellbeing or personal circumstance',
    pay: 'Pay or salary matter',
    'employment-decision': 'Employment decision',
    'restricted-action': 'Request for an approval or record change',
    'system-access': 'System access problem',
    'onboarding-task': 'Onboarding task or document',
    other: 'Needs a person',
    'no-policy': 'Question not covered by a policy',
}

// Who picks a case up, in words for the preview.
// Every case goes to the HR team's Cases page; IT and Manager matters say who else to talk to.
export const PATHWAY_NAMES: Record<Pathway, string> = {
    HR: 'The HR team',
    IT: 'The HR team (for system problems, also contact IT Support directly)',
    Manager: 'The HR team (your manager makes this decision, so also speak with them)',
}
