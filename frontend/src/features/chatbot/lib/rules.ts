import type { EscalationCategory, Pathway } from '../types'

export interface SensitiveRule { pattern: RegExp; category: EscalationCategory; pathway: Pathway }

// Sensitive matters always go to a human. Checked BEFORE any model call, so the AI
// never gets a chance to attempt an answer. This is the net for the OBVIOUS cases
// only; anything subtler is caught by the model's own "escalate" outcome.
// Each rule carries its category and pathway so an escalation is never just "sensitive".
// "bull(y|ie)" also matches "bullied", where the spelling changes. BA owns this list.
export const SENSITIVE_RULES: SensitiveRule[] = [
  { pattern: /\b(salary|pay ?rise|underpaid|wrong pay|pay dispute)\b/i, category: 'pay', pathway: 'HR' },
  { pattern: /\b(complain\w*|harass\w*|bull(y|ie)\w*|discriminat\w*|grievance)\b/i, category: 'complaint', pathway: 'HR' },
  { pattern: /\b(fired|terminat\w*|dismiss\w*|disciplin\w*)\b/i, category: 'employment-decision', pathway: 'HR' },
  // Asking the assistant to DO the approval. "How does leave approval work?" must NOT
  // match: that is a policy question. Pathway is Manager because the leave policy
  // says the manager approves leave.
  { pattern: /\b(approve|sign off|accept)\s+(my|this|the)\s+(\w+\s+)?leave\b/i, category: 'restricted-action', pathway: 'Manager' },
]

export function matchSensitiveRule(question: string): SensitiveRule | null {
  return SENSITIVE_RULES.find((rule) => rule.pattern.test(question)) ?? null
}