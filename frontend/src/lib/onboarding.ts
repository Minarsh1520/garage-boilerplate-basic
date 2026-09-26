import { adminDb } from '@/lib/firebase/admin'

export interface OnboardingChecklistItem {
  id: string
  title: string
  description: string
  status: 'completed' | 'pending'
  duein: string
}

export interface EmployeeOnboarding {
  employeeId: string
  employeeName: string
  jobTitle: string
  department: string
  manager: string
  startDate: string
  location: string
  onboardingStatus: string

  itAccountStatus: string
  mandatoryTrainingStatus: 'completed' | 'pending'

  checklist: OnboardingChecklistItem[]
}

export async function getEmployeeOnboarding(uid: string) {
  const snapshot = await adminDb
    .collection('employeeData')
    .doc(uid)
    .get()

  if (!snapshot.exists) {
    return null
  }

  return snapshot.data() as EmployeeOnboarding
}