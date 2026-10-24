// Does this question only make sense together with the conversation before it?
// "And for part-timers?" or "who approves it?" do; "How do I set up my IT account?" doesn't.
//
// Used to decide whether the policy search should include the previous question's topic.
// Adding the topic to a question that has moved on would pull the search back to the old
// subject, so this errs towards "no": a missed follow-up just gets a slightly worse search,
// the same as before conversations were saved.
const FOLLOW_UP_START = /^(and|also|but|so|then|what about|how about|what if|same for|does that|is that|can i also)\b/i
const POINTING_WORD = /\b(it|that|this|those|these|them|they|there|one|ones)\b/i
const MAX_FOLLOW_UP_WORDS = 7

export function isFollowUp(question: string): boolean {
    const text = question.trim()
    if (FOLLOW_UP_START.test(text)) return true
    const words = text.split(/\s+/).filter(Boolean).length
    // Short AND pointing at something said before: "who approves it?", "when is that due?"
    return words <= MAX_FOLLOW_UP_WORDS && POINTING_WORD.test(text)
}
