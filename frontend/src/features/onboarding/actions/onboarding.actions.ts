//This is just a quick demo
'use server'

import { requireAuth } from '@/actions/auth.actions'
import { adminDb } from '@/lib/firebase/admin'
import type { ActionResult } from '@/types'
import type { OnboardingProfile } from '@/types/firestore'

// Returns the SIGNED-IN employee's onboarding record, including their checklist.
// Whose record is decided by the verified session, never by a parameter, so no page
// can request another employee's data. null = no record (render an empty state).
export async function getMyOnboardingProfile(): Promise<ActionResult<OnboardingProfile | null>> {
  const session = await requireAuth()
  const snapshot = await adminDb.doc(`onboardingProfiles/${session.uid}`).get()
  if (!snapshot.exists) return { success: true, data: null }
  // Written only by the seed script (and later Server Actions), so the shape is known.
  return { success: true, data: snapshot.data() as OnboardingProfile }
}