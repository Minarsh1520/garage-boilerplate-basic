'use server'

import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { requireAdmin } from '@/actions/auth.actions'

type TaskTemplateId =
  | 'personal-details'
  | 'tfn-declaration'
  | 'super-fund'
  | 'company-policies'

type ChecklistSelection = {
  templateId: TaskTemplateId
  dueDays: number
}

type AddEmployeeInput = {
  email: string
  employeeName: string
  employeeId: string
  jobTitle: string
  department: string
  manager: string
  startDate: string
  location: string
  checklist?: ChecklistSelection[]
}

type EmployeeActionResult = {
  success: boolean
  error?: string
}

const taskTemplates = {
  'personal-details': {
    id: 'personal-details',
    title: 'Personal Details Form',
    description: 'Complete your personal details form',
  },

  'tfn-declaration': {
    id: 'tfn-declaration',
    title: 'Tax File Declaration',
    description: 'Complete your tax file declaration',
  },

  'super-fund': {
    id: 'super-fund',
    title: 'Super Fund Nomination',
    description: 'Complete your super fund nomination',
  },

  'company-policies': {
    id: 'company-policies',
    title: 'Read through company policies',
    description: 'Read through the company policies',
  },
}

const defaultChecklist: ChecklistSelection[] = [
  { templateId: 'personal-details', dueDays: 0 },
  { templateId: 'tfn-declaration', dueDays: 0 },
  { templateId: 'super-fund', dueDays: 3 },
  { templateId: 'company-policies', dueDays: 1 },
]

export async function addEmployee(
  input: AddEmployeeInput
): Promise<EmployeeActionResult> {
  try {
    await requireAdmin()

    const email = input.email.trim().toLowerCase()

    if (
      !email ||
      !input.employeeName.trim() ||
      !input.employeeId.trim() ||
      !input.jobTitle.trim() ||
      !input.department.trim() ||
      !input.manager.trim() ||
      !input.startDate.trim() ||
      !input.location.trim()
    ) {
      return {
        success: false,
        error: 'Please complete all required fields.',
      }
    }

    const existing = await adminDb
      .collection('pendingEmployees')
      .where('email', '==', email)
      .limit(1)
      .get()

    if (!existing.empty) {
      return {
        success: false,
        error: 'An employee with this email has already been added.',
      }
    }

    const selectedTasks = input.checklist ?? defaultChecklist

    const checklist = selectedTasks.map((task) => {
      const template = taskTemplates[task.templateId]
      const dueDays = Math.max(0, Math.floor(task.dueDays))

      return {
        ...template,
        status: 'pending',
        duein: `${dueDays} Days`,
      }
    })

    await adminDb.collection('pendingEmployees').add({
      email,
      employeeName: input.employeeName.trim(),
      employeeId: input.employeeId.trim(),
      jobTitle: input.jobTitle.trim(),
      department: input.department.trim(),
      manager: input.manager.trim(),
      startDate: input.startDate,
      location: input.location.trim(),

      onboardingStatus: 'in_progress',
      itAccountStatus: 'pending',
      mandatoryTrainingStatus: 'pending',

      checklist,

      createdAt: new Date(),
    })

    return {
      success: true,
    }
  } catch {
    return {
      success: false,
      error: 'Failed to add employee.',
    }
  }
}

export async function claimPendingEmployee(
  idToken: string
): Promise<EmployeeActionResult> {
  try {
    const decoded = await adminAuth.verifyIdToken(idToken, true)
    const user = await adminAuth.getUser(decoded.uid)

    if (!user.email || !user.emailVerified) {
      return {
        success: false,
        error: 'Verified employee email is required.',
      }
    }

    const email = user.email.trim().toLowerCase()

    const pendingSnap = await adminDb
      .collection('pendingEmployees')
      .where('email', '==', email)
      .limit(1)
      .get()

    if (pendingSnap.empty) {
      return { success: true }
    }

    const pendingDoc = pendingSnap.docs[0]

    if (!pendingDoc) {
      return { success: true }
    }

    const pendingData = pendingDoc.data()

    const employeeRef = adminDb
      .collection('employeeData')
      .doc(decoded.uid)

    const existingEmployee = await employeeRef.get()

    if (!existingEmployee.exists) {
      await employeeRef.set({
        employeeId: pendingData.employeeId,
        employeeName: pendingData.employeeName,
        jobTitle: pendingData.jobTitle,
        department: pendingData.department,
        manager: pendingData.manager,
        startDate: pendingData.startDate,
        location: pendingData.location,
        onboardingStatus:
          pendingData.onboardingStatus ?? 'in_progress',
        itAccountStatus:
          pendingData.itAccountStatus ?? 'pending',
        mandatoryTrainingStatus:
          pendingData.mandatoryTrainingStatus ?? 'pending',
        checklist: pendingData.checklist ?? [],
      })
    }

    await pendingDoc.ref.delete()

    return { success: true }
  } catch {
    return {
      success: false,
      error: 'Failed to link employee onboarding data.',
    }
  }
}