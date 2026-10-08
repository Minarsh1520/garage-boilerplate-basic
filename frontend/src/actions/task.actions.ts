'use server'

import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { requireAdmin } from '@/actions/auth.actions'

const defaultTaskTemplates = {
  'personal-details': { id: 'personal-details', title: 'Personal Details Form', description: 'Complete your personal details form', defaultDueDays: 0 },
  'tfn-declaration': { id: 'tfn-declaration', title: 'Tax File Declaration', description: 'Complete your tax file declaration', defaultDueDays: 0 },
  'super-fund': { id: 'super-fund', title: 'Super Fund Nomination', description: 'Complete your super fund nomination', defaultDueDays: 3 },
  'company-policies': { id: 'company-policies', title: 'Read through company policies', description: 'Complete your company policies review', defaultDueDays: 1 },
}

export type DefaultTaskTemplateId = keyof typeof defaultTaskTemplates
export type EmployeeOption = { email: string; employeeName: string }
export type EmployeeTask = { id: string; title: string; description?: string; status: 'completed' | 'pending'; duein: string; dueDate?: string }
export type TaskTemplateOption = { id: string; label: string; description: string; defaultDueDays: number; custom?: boolean }
type TaskResult = { success: boolean; error?: string }

function addDays(startDate: string | undefined, days: number) {
  if (!startDate) return undefined
  const date = new Date(`${startDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

async function findEmployeeRecord(email: string) {
  const normalisedEmail = email.trim().toLowerCase()

  try {
    const user = await adminAuth.getUserByEmail(normalisedEmail)
    const ref = adminDb.collection('employeeData').doc(user.uid)
    const snap = await ref.get()
    if (snap.exists) return { ref, data: snap.data() }
  } catch (error: unknown) {
    const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
    if (code !== 'auth/user-not-found') throw error
  }

  const pending = await adminDb.collection('pendingEmployees').where('email', '==', normalisedEmail).limit(1).get()
  const doc = pending.docs[0]
  return doc ? { ref: doc.ref, data: doc.data() } : null
}

async function getTemplate(templateId: string) {
  if (templateId in defaultTaskTemplates) return defaultTaskTemplates[templateId as DefaultTaskTemplateId]

  const snap = await adminDb.collection('taskTemplates').doc(templateId).get()
  if (!snap.exists) return null

  const data = snap.data()
  return {
    id: snap.id,
    title: String(data?.title ?? ''),
    description: String(data?.description ?? ''),
    defaultDueDays: Number(data?.defaultDueDays ?? 0),
  }
}

export async function getTaskTemplates(): Promise<TaskTemplateOption[]> {
  await requireAdmin()

  const defaults: TaskTemplateOption[] = Object.values(defaultTaskTemplates).map((task) => ({
    id: task.id, label: task.title, description: task.description, defaultDueDays: task.defaultDueDays,
  }))

  const snapshot = await adminDb.collection('taskTemplates').get()
  const custom: TaskTemplateOption[] = snapshot.docs.map((doc) => {
    const data = doc.data()
    return { id: doc.id, label: data.title ?? 'Custom Task', description: data.description ?? '', defaultDueDays: Number(data.defaultDueDays ?? 0), custom: true }
  })

  return [...defaults, ...custom.sort((a, b) => a.label.localeCompare(b.label))]
}

export async function getEmployeeOptions(): Promise<EmployeeOption[]> {
  await requireAdmin()
  const employees: EmployeeOption[] = []

  const active = await adminDb.collection('employeeData').get()

  for (const document of active.docs) {
    try {
      const user = await adminAuth.getUser(document.id)
      const data = document.data()
      if (user.email) employees.push({ email: user.email, employeeName: data.employeeName ?? user.displayName ?? 'Employee' })
    } catch {}
  }

  const pending = await adminDb.collection('pendingEmployees').get()

  for (const document of pending.docs) {
    const data = document.data()
    if (data.email && !employees.some((employee) => employee.email.toLowerCase() === String(data.email).toLowerCase())) {
      employees.push({ email: data.email, employeeName: data.employeeName ?? 'Employee' })
    }
  }

  return employees.sort((a, b) => a.employeeName.localeCompare(b.employeeName))
}

export async function getEmployeeTasks(email: string): Promise<EmployeeTask[]> {
  await requireAdmin()
  if (!email.trim()) return []
  const employee = await findEmployeeRecord(email)
  return employee ? (employee.data?.checklist ?? []) as EmployeeTask[] : []
}

export async function assignTaskFromTemplate(email: string, templateId: string, dueDays?: number): Promise<TaskResult> {
  try {
    await requireAdmin()
    if (!email.trim()) return { success: false, error: 'Employee email is required.' }

    const template = await getTemplate(templateId)
    if (!template) return { success: false, error: 'Invalid task template.' }

    const employee = await findEmployeeRecord(email)
    if (!employee) return { success: false, error: 'No employee record found.' }

    const checklist = employee.data?.checklist ?? []
    if (checklist.some((item: { id?: string }) => item.id === template.id)) return { success: false, error: 'This task is already assigned to the employee.' }

    const days = typeof dueDays === 'number' && Number.isFinite(dueDays) ? Math.max(0, Math.floor(dueDays)) : template.defaultDueDays
    const dueDate = addDays(employee.data?.startDate, days)
    const newTask = { id: template.id, title: template.title, description: template.description, status: 'pending', duein: `${days} Days`, ...(dueDate ? { dueDate } : {}) }

    await employee.ref.update({ checklist: [...checklist, newTask] })
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to assign task.' }
  }
}

export async function createCustomTaskAndAssign(email: string, title: string, description: string, dueDays: number): Promise<TaskResult> {
  try {
    const session = await requireAdmin()

    if (!email.trim()) return { success: false, error: 'Please select an employee.' }
    if (!title.trim()) return { success: false, error: 'Task title is required.' }
    if (!description.trim()) return { success: false, error: 'Task description is required.' }

    const employee = await findEmployeeRecord(email)
    if (!employee) return { success: false, error: 'No employee record found.' }

    const days = Math.max(0, Math.floor(Number(dueDays) || 0))
    const templateRef = adminDb.collection('taskTemplates').doc()
    const dueDate = addDays(employee.data?.startDate, days)

    const template = {
      id: templateRef.id,
      title: title.trim(),
      description: description.trim(),
      defaultDueDays: days,
      createdBy: session.uid,
      createdAt: new Date(),
    }

    const checklist = employee.data?.checklist ?? []
    const newTask = { id: templateRef.id, title: template.title, description: template.description, status: 'pending', duein: `${days} Days`, ...(dueDate ? { dueDate } : {}) }

    const batch = adminDb.batch()
    batch.set(templateRef, template)
    batch.update(employee.ref, { checklist: [...checklist, newTask] })
    await batch.commit()

    return { success: true }
  } catch {
    return { success: false, error: 'Failed to create and assign task.' }
  }
}

export async function removePendingTask(email: string, taskId: string): Promise<TaskResult> {
  try {
    await requireAdmin()

    const employee = await findEmployeeRecord(email)
    if (!employee) return { success: false, error: 'No employee record found.' }

    const checklist = (employee.data?.checklist ?? []) as EmployeeTask[]
    const task = checklist.find((item) => item.id === taskId)

    if (!task) return { success: false, error: 'Task not found.' }
    if (task.status === 'completed') return { success: false, error: 'Completed tasks cannot be removed.' }

    await employee.ref.update({ checklist: checklist.filter((item) => item.id !== taskId) })
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to remove task.' }
  }
}