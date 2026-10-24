// Order for the Admin Cases page: most urgent first (priority 1 before 3), newest first
// within the same priority. Done in code, not with a second orderBy in the query:
// orderBy('priority').orderBy('createdAt') would need a composite index, and the list is short.
// Cases saved before priority existed count as 3 (lowest), so they still show.
export interface SortableCase {
  priority?: number
  createdAt?: string // ISO date
}

export const DEFAULT_PRIORITY = 3

export function sortCasesForReview<T extends SortableCase>(cases: T[]): T[] {
  const time = (c: T) => (c.createdAt ? Date.parse(c.createdAt) || 0 : 0)
  return [...cases].sort(
    (a, b) => (a.priority ?? DEFAULT_PRIORITY) - (b.priority ?? DEFAULT_PRIORITY) || time(b) - time(a)
  )
}

// The BA's names for the three levels (Sprint 3 automation rules).
export const PRIORITY_LABELS: Record<number, string> = { 1: 'High', 2: 'Medium', 3: 'Low' }
