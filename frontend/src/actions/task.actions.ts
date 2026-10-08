'use server'

import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { requireAdmin } from '@/actions/auth.actions'

const taskTemplates = {
  'personal-details': {
    id: 'personal-details',
    title: 'Personal Details Form',
    description: 'Complete your personal details form',
    defaultDueDays: 0,
  },
  'tfn-declaration': {
    id: 'tfn-declaration',
    title: 'Tax File Declaration',
    description: 'Complete your tax file declaration',
    defaultDueDays: 0,
  },
  'super-fund': {
    id: 'super-fund',
    title: 'Super Fund Nomination',
    description: 'Complete your super fund nomination',
    defaultDueDays: 3,
  },
  'company-policies': {
    id: 'company-policies',
    title: 'Read through company policies',
    description: 'Read through the company policies',
    defaultDueDays: 1,
  },
}

export type TaskTemplateId = keyof typeof taskTemplates

export type EmployeeOption = {
  email: string
  employeeName: string
}

export type EmployeeTask = {
  id: string
  title: string
  description?: string
  status: 'completed' | 'pending'
  duein: string
}

type TaskResult = {
  success: boolean
  error?: string
}

async function findEmployeeRecord(email: string) {
  const normalisedEmail = email.trim().toLowerCase()

  // First check employees who have already signed up.
  try {
    const user = await adminAuth.getUserByEmail(normalisedEmail)

    const employeeRef = adminDb
      .collection('employeeData')
      .doc(user.uid)

    const employeeSnap = await employeeRef.get()

    if (employeeSnap.exists) {
      return {
        ref: employeeRef,
        data: employeeSnap.data(),
      }
    }
  } catch (error: unknown) {
    const code =
      typeof error === 'object' &&
      error !== null &&
      'code' in error
        ? String(error.code)
        : ''

    if (code !== 'auth/user-not-found') {
      throw error
    }
  }

  // Then check employees who have not signed up yet.
  const pendingSnap = await adminDb
    .collection('pendingEmployees')
    .where('email', '==', normalisedEmail)
    .limit(1)
    .get()

  const pendingDoc = pendingSnap.docs[0]

  if (!pendingDoc) return null

  return {
    ref: pendingDoc.ref,
    data: pendingDoc.data(),
  }
}

export async function getEmployeeOptions(): Promise<EmployeeOption[]> {
  await requireAdmin()

  const employees: EmployeeOption[] = []

  // Signed-up employees
  const activeSnapshot = await adminDb
    .collection('employeeData')
    .get()

  for (const document of activeSnapshot.docs) {
    try {
      const user = await adminAuth.getUser(document.id)
      const data = document.data()

      if (user.email) {
        employees.push({
          email: user.email,
          employeeName:
            data.employeeName ??
            user.displayName ??
            'Employee',
        })
      }
    } catch {
      // Ignore employee records without a matching Auth account.
    }
  }

  // Employees created by Admin but not signed up yet
  const pendingSnapshot = await adminDb
    .collection('pendingEmployees')
    .get()

  for (const document of pendingSnapshot.docs) {
    const data = document.data()

    if (
      data.email &&
      !employees.some(
        (employee) =>
          employee.email.toLowerCase() ===
          String(data.email).toLowerCase()
      )
    ) {
      employees.push({
        email: data.email,
        employeeName:
          data.employeeName ?? 'Employee',
      })
    }
  }

  return employees.sort((a, b) =>
    a.employeeName.localeCompare(b.employeeName)
  )
}

export async function getEmployeeTasks(
  email: string
): Promise<EmployeeTask[]> {
  await requireAdmin()

  if (!email.trim()) return []

  const employee = await findEmployeeRecord(email)

  if (!employee) return []

  return (employee.data?.checklist ?? []) as EmployeeTask[]
}

export async function assignTaskFromTemplate(
  email: string,
  templateId: TaskTemplateId,
  dueDays?: number
): Promise<TaskResult> {
  try {
    await requireAdmin()

    if (!email.trim()) {
      return {
        success: false,
        error: 'Employee email is required.',
      }
    }

    const template = taskTemplates[templateId]

    if (!template) {
      return {
        success: false,
        error: 'Invalid task template.',
      }
    }

    const employee = await findEmployeeRecord(email)

    if (!employee) {
      return {
        success: false,
        error: 'No employee record found.',
      }
    }

    const checklist = employee.data?.checklist ?? []

    const alreadyAssigned = checklist.some(
      (item: { id?: string }) =>
        item.id === template.id
    )

    if (alreadyAssigned) {
      return {
        success: false,
        error: 'This task is already assigned to the employee.',
      }
    }

    const days =
      typeof dueDays === 'number' &&
      Number.isFinite(dueDays)
        ? Math.max(0, Math.floor(dueDays))
        : template.defaultDueDays

    const newTask = {
      id: template.id,
      title: template.title,
      description: template.description,
      status: 'pending',
      duein: `${days} Days`,
    }

    await employee.ref.update({
      checklist: [...checklist, newTask],
    })

    return {
      success: true,
    }
  } catch {
    return {
      success: false,
      error: 'Failed to assign task.',
    }
  }
}

export async function removePendingTask(
  email: string,
  taskId: string
): Promise<TaskResult> {
  try {
    await requireAdmin()

    const employee = await findEmployeeRecord(email)

    if (!employee) {
      return {
        success: false,
        error: 'No employee record found.',
      }
    }

    const checklist = (employee.data?.checklist ?? []) as EmployeeTask[]

    const task = checklist.find(
      (item) => item.id === taskId
    )

    if (!task) {
      return {
        success: false,
        error: 'Task not found.',
      }
    }

    if (task.status === 'completed') {
      return {
        success: false,
        error: 'Completed tasks cannot be removed.',
      }
    }

    const updatedChecklist = checklist.filter(
      (item) => item.id !== taskId
    )

    await employee.ref.update({
      checklist: updatedChecklist,
    })

    return {
      success: true,
    }
  } catch {
    return {
      success: false,
      error: 'Failed to remove task.',
    }
  }
}