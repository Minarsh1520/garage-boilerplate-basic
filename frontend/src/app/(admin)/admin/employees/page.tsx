'use client'

import { useEffect, useState, type ChangeEvent } from 'react'
import { addEmployee, getNextEmployeeId } from '@/actions/employee.actions'
import { assignTaskFromTemplate, createCustomTaskAndAssign, getEmployeeOptions, getEmployeeTasks, getTaskTemplates, removePendingTask, type DefaultTaskTemplateId, type EmployeeOption, type EmployeeTask, type TaskTemplateOption } from '@/actions/task.actions'

const defaultTasks: { id: DefaultTaskTemplateId; label: string }[] = [
  { id: 'personal-details', label: 'Personal Details Form' },
  { id: 'tfn-declaration', label: 'Tax File Declaration' },
  { id: 'super-fund', label: 'Super Fund Nomination' },
  { id: 'company-policies', label: 'Read through company policies' },
]

const defaultNewEmployeeTasks: Record<DefaultTaskTemplateId, { selected: boolean; dueDays: string }> = {
  'personal-details': { selected: true, dueDays: '0' },
  'tfn-declaration': { selected: true, dueDays: '0' },
  'super-fund': { selected: true, dueDays: '3' },
  'company-policies': { selected: true, dueDays: '1' },
}

const emptyForm = { email: '', employeeName: '', employeeId: '', jobTitle: '', department: '', manager: '', startDate: '', location: '' }

export default function EmployeesPage() {
  const [form, setForm] = useState(emptyForm)
  const [newEmployeeTasks, setNewEmployeeTasks] = useState(defaultNewEmployeeTasks)
  const [addingEmployee, setAddingEmployee] = useState(false)
  const [addSuccess, setAddSuccess] = useState('')
  const [addError, setAddError] = useState('')

  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [templates, setTemplates] = useState<TaskTemplateOption[]>([])
  const [selectionMode, setSelectionMode] = useState<'existing' | 'manual'>('existing')
  const [selectedEmail, setSelectedEmail] = useState('')
  const [manualEmail, setManualEmail] = useState('')
  const [template, setTemplate] = useState('personal-details')
  const [taskDueDays, setTaskDueDays] = useState('1')
  const [employeeTasks, setEmployeeTasks] = useState<EmployeeTask[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [removingTaskId, setRemovingTaskId] = useState('')
  const [taskSuccess, setTaskSuccess] = useState('')
  const [taskError, setTaskError] = useState('')

  const [showAddTask, setShowAddTask] = useState(false)
  const [customEmployee, setCustomEmployee] = useState('')
  const [customTitle, setCustomTitle] = useState('')
  const [customDescription, setCustomDescription] = useState('')
  const [customDueDays, setCustomDueDays] = useState('1')
  const [creatingCustom, setCreatingCustom] = useState(false)
  const [customError, setCustomError] = useState('')

  const formComplete = Object.values(form).every((value) => value.trim() !== '')
  const taskEmail = selectionMode === 'existing' ? selectedEmail : manualEmail.trim()

  useEffect(() => {
    Promise.all([getEmployeeOptions(), getTaskTemplates(), getNextEmployeeId()])
      .then(([employeeList, templateList, nextId]) => {
        setEmployees(employeeList)
        setTemplates(templateList)
        setForm((current) => ({ ...current, employeeId: nextId }))
      })
      .catch(() => setTaskError('Failed to load employee data.'))
  }, [])

  useEffect(() => {
    if (!taskEmail) { setEmployeeTasks([]); return }
    const loadTasks = async () => {
      setLoadingTasks(true)
      try { setEmployeeTasks(await getEmployeeTasks(taskEmail)) } catch { setEmployeeTasks([]) }
      setLoadingTasks(false)
    }
    loadTasks()
  }, [taskEmail])

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setAddSuccess(''); setAddError('')
  }

  const handleAddEmployee = async () => {
    if (!formComplete) return
    setAddingEmployee(true); setAddSuccess(''); setAddError('')

    const checklist = defaultTasks
      .filter((task) => newEmployeeTasks[task.id].selected)
      .map((task) => ({ templateId: task.id, dueDays: Math.max(0, Number(newEmployeeTasks[task.id].dueDays) || 0) }))

    const result = await addEmployee({ ...form, checklist })

    if (result.success) {
      setAddSuccess('Employee added successfully.')
      setNewEmployeeTasks(defaultNewEmployeeTasks)

      try {
        const [employeeList, nextId] = await Promise.all([
          getEmployeeOptions(),
          getNextEmployeeId(),
        ])

        setEmployees(employeeList)
        setForm({ ...emptyForm, employeeId: nextId })
      } catch {
        setForm(emptyForm)
      }
    }

    setAddingEmployee(false)
  }

  const handleAssignTask = async () => {
    if (!taskEmail) return
    setAssigning(true); setTaskSuccess(''); setTaskError('')

    const result = await assignTaskFromTemplate(taskEmail, template, Math.max(0, Number(taskDueDays) || 0))
    if (result.success) {
      setTaskSuccess('Task assigned successfully.')
      setEmployeeTasks(await getEmployeeTasks(taskEmail))
    } else setTaskError(result.error ?? 'Failed to assign task.')

    setAssigning(false)
  }

  const handleRemoveTask = async (taskId: string) => {
    if (!taskEmail) return
    setRemovingTaskId(taskId); setTaskSuccess(''); setTaskError('')

    const result = await removePendingTask(taskEmail, taskId)
    if (result.success) {
      setTaskSuccess('Task removed successfully.')
      setEmployeeTasks(await getEmployeeTasks(taskEmail))
    } else setTaskError(result.error ?? 'Failed to remove task.')

    setRemovingTaskId('')
  }

  const handleCreateCustomTask = async () => {
    if (!customEmployee || !customTitle.trim() || !customDescription.trim()) return
    setCreatingCustom(true); setCustomError('')

    const result = await createCustomTaskAndAssign(customEmployee, customTitle, customDescription, Math.max(0, Number(customDueDays) || 0))

    if (result.success) {
      setTemplates(await getTaskTemplates())
      setSelectionMode('existing')
      setSelectedEmail(customEmployee)
      setEmployeeTasks(await getEmployeeTasks(customEmployee))
      setTaskSuccess('Custom task created and assigned successfully.')
      setShowAddTask(false)
      setCustomEmployee(''); setCustomTitle(''); setCustomDescription(''); setCustomDueDays('1')
    } else setCustomError(result.error ?? 'Failed to create task.')

    setCreatingCustom(false)
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-[#222222]">Employees</h1>
      <p className="mt-1 text-sm text-[#222222]">Add a new employee and manage onboarding checklist tasks</p>

      {/* Add Employee */}
      <section className="mt-6">
        <h2 className="text-xl font-bold text-[#222222]">Add Employee</h2>

        <form className="mt-4 max-w-3xl">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="email" className="text-sm font-semibold text-[#222222]">Employee Email</label>
              <input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="employee@example.com" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-[#222222] outline-none focus:border-[#4361AB]" />
            </div>

            <div>
              <label htmlFor="employeeName" className="text-sm font-semibold text-[#222222]">Employee Name</label>
              <input id="employeeName" name="employeeName" value={form.employeeName} onChange={handleChange} placeholder="Employee name" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-[#222222] outline-none focus:border-[#4361AB]" />
            </div>

            <div>
              <label htmlFor="employeeId" className="text-sm font-semibold text-[#222222]">Employee ID</label>
              <input id="employeeId" name="employeeId" value={form.employeeId} readOnly className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-[#222222] outline-none focus:border-[#4361AB]" />
            </div>

            <div>
              <label htmlFor="jobTitle" className="text-sm font-semibold text-[#222222]">Job Title</label>
              <input id="jobTitle" name="jobTitle" value={form.jobTitle} onChange={handleChange} placeholder="Job title" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-[#222222] outline-none focus:border-[#4361AB]" />
            </div>

            <div>
              <label htmlFor="department" className="text-sm font-semibold text-[#222222]">Department</label>
              <input id="department" name="department" value={form.department} onChange={handleChange} placeholder="Department" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-[#222222] outline-none focus:border-[#4361AB]" />
            </div>

            <div>
              <label htmlFor="manager" className="text-sm font-semibold text-[#222222]">Manager</label>
              <input id="manager" name="manager" value={form.manager} onChange={handleChange} placeholder="Manager name" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-[#222222] outline-none focus:border-[#4361AB]" />
            </div>

            <div>
              <label htmlFor="startDate" className="text-sm font-semibold text-[#222222]">Start Date</label>
              <input id="startDate" name="startDate" type="date" value={form.startDate} onChange={handleChange} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-[#222222] outline-none focus:border-[#4361AB]" />
            </div>

            <div>
              <label htmlFor="location" className="text-sm font-semibold text-[#222222]">Location</label>
              <input id="location" name="location" value={form.location} onChange={handleChange} placeholder="Melbourne" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-[#222222] outline-none focus:border-[#4361AB]" />
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold text-[#222222]">Onboarding Checklist</h3>
            <p className="mt-1 text-sm text-zinc-600">Select the tasks to assign and set the number of days to complete each task.</p>

            <div className="mt-3 space-y-3">
              {defaultTasks.map((task) => {
                const state = newEmployeeTasks[task.id]
                return (
                  <div key={task.id} className="flex flex-col gap-3 rounded-md border border-gray-200 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <label className="flex items-center gap-3 text-sm text-[#222222]">
                      <input type="checkbox" checked={state.selected} onChange={(e) => setNewEmployeeTasks((current) => ({ ...current, [task.id]: { ...current[task.id], selected: e.target.checked } }))} />
                      {task.label}
                    </label>

                    <div className="flex items-center gap-2">
                      <span className="text-sm text-zinc-600">Due in</span>
                      <input type="number" min="0" value={state.dueDays} disabled={!state.selected} onChange={(e) => setNewEmployeeTasks((current) => ({ ...current, [task.id]: { ...current[task.id], dueDays: e.target.value } }))} className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm text-[#222222] disabled:bg-gray-100 disabled:text-gray-400" />
                      <span className="text-sm text-zinc-600">days</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {addSuccess && <p className="mt-4 text-sm text-green-700">{addSuccess}</p>}
          {addError && <p className="mt-4 text-sm text-red-600">{addError}</p>}

          <button type="button" onClick={handleAddEmployee} disabled={!formComplete || addingEmployee} className="mt-5 rounded bg-[#4361AB] px-4 py-2 text-sm font-semibold text-white hover:bg-[#36509A] disabled:cursor-not-allowed disabled:opacity-50">{addingEmployee ? 'Adding...' : 'Add Employee'}</button>
        </form>
      </section>

      {/* Manage Employee Tasks */}
      <section className="mt-10 border-t border-gray-300 pt-6">
        <div className="flex max-w-3xl items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#222222]">Manage Employee Tasks</h2>
            <p className="mt-1 text-sm text-zinc-600">Assign tasks from a template, set due days, and remove pending tasks.</p>
          </div>

          <button type="button" onClick={() => { setShowAddTask(true); setCustomError('') }} className="shrink-0 rounded bg-[#4361AB] px-4 py-2 text-sm font-semibold text-white hover:bg-[#36509A]">+ Add Task & Assign</button>
        </div>

        <div className="mt-4 max-w-3xl">
          <div className="mb-4 flex gap-6">
            <label className="flex items-center gap-2 text-sm text-[#222222]">
              <input type="radio" checked={selectionMode === 'existing'} onChange={() => { setSelectionMode('existing'); setTaskSuccess(''); setTaskError('') }} />
              Choose employee
            </label>

            <label className="flex items-center gap-2 text-sm text-[#222222]">
              <input type="radio" checked={selectionMode === 'manual'} onChange={() => { setSelectionMode('manual'); setTaskSuccess(''); setTaskError('') }} />
              Enter email
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-semibold text-[#222222]">Employee</label>

              {selectionMode === 'existing' ? (
                <select value={selectedEmail} onChange={(e) => setSelectedEmail(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#222222] outline-none focus:border-[#4361AB]">
                  <option value="">Select employee</option>
                  {employees.map((employee) => <option key={employee.email} value={employee.email}>{employee.employeeName} — {employee.email}</option>)}
                </select>
              ) : (
                <input type="email" value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} placeholder="employee@example.com" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-[#222222] outline-none focus:border-[#4361AB]" />
              )}
            </div>

            <div>
              <label className="text-sm font-semibold text-[#222222]">Task Template</label>
              <select value={template} onChange={(e) => setTemplate(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#222222] outline-none focus:border-[#4361AB]">
                {templates.map((item) => <option key={item.id} value={item.id}>{item.label}{item.custom ? ' (Custom)' : ''}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-[#222222]">Due In</label>
              <div className="mt-1 flex items-center gap-2">
                <input type="number" min="0" value={taskDueDays} onChange={(e) => setTaskDueDays(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-[#222222] outline-none focus:border-[#4361AB]" />
                <span className="text-sm text-zinc-600">days</span>
              </div>
            </div>
          </div>

          {taskSuccess && <div className="mt-4 rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">{taskSuccess}</div>}
          {taskError && <div className="mt-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-600">{taskError}</div>}

          <button type="button" onClick={handleAssignTask} disabled={!taskEmail || assigning} className="mt-5 rounded bg-[#4361AB] px-4 py-2 text-sm font-semibold text-white hover:bg-[#36509A] disabled:cursor-not-allowed disabled:opacity-50">{assigning ? 'Assigning...' : 'Assign Task'}</button>

          {taskEmail && (
            <div className="mt-8">
              <h3 className="text-base font-bold text-[#222222]">Current Tasks</h3>

              {loadingTasks ? <p className="mt-3 text-sm text-zinc-600">Loading tasks...</p> : employeeTasks.length === 0 ? <p className="mt-3 text-sm text-zinc-600">No checklist tasks assigned.</p> : (
                <div className="mt-3 space-y-3">
                  {employeeTasks.map((task) => (
                    <div key={task.id} className="flex flex-col gap-3 rounded-md border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[#222222]">{task.title}</p>
                        <p className="mt-1 text-sm text-zinc-600">{task.status === 'completed' ? 'Completed' : `Pending · Due in ${task.duein}`}</p>
                      </div>

                      {task.status === 'pending' && <button type="button" onClick={() => handleRemoveTask(task.id)} disabled={removingTaskId === task.id} className="text-sm font-semibold text-red-600 hover:text-red-700 disabled:opacity-50">{removingTaskId === task.id ? 'Removing...' : 'Remove'}</button>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Custom Task Overlay */}
      {showAddTask && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#222222]">Add Task & Assign</h2>
              <button type="button" onClick={() => setShowAddTask(false)} className="text-xl text-zinc-500">×</button>
            </div>

            <p className="mt-1 text-sm text-zinc-600">Create a reusable checklist task and assign it to an employee.</p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-sm font-semibold text-[#222222]">Employee</label>
                <select value={customEmployee} onChange={(e) => setCustomEmployee(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#222222] outline-none focus:border-[#4361AB]">
                  <option value="">Select employee</option>
                  {employees.map((employee) => <option key={employee.email} value={employee.email}>{employee.employeeName} — {employee.email}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-[#222222]">Task Title</label>
                <input value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder="Security Awareness Training" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-[#222222] outline-none focus:border-[#4361AB]" />
              </div>

              <div>
                <label className="text-sm font-semibold text-[#222222]">Description</label>
                <textarea value={customDescription} onChange={(e) => setCustomDescription(e.target.value)} rows={3} placeholder="Complete the security awareness training module" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-[#222222] outline-none focus:border-[#4361AB]" />
              </div>

              <div>
                <label className="text-sm font-semibold text-[#222222]">Due In</label>
                <div className="mt-1 flex items-center gap-2">
                  <input type="number" min="0" value={customDueDays} onChange={(e) => setCustomDueDays(e.target.value)} className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm text-[#222222] outline-none focus:border-[#4361AB]" />
                  <span className="text-sm text-zinc-600">days</span>
                </div>
              </div>

              {customError && <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-600">{customError}</div>}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setShowAddTask(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-[#222222] hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={handleCreateCustomTask} disabled={!customEmployee || !customTitle.trim() || !customDescription.trim() || creatingCustom} className="rounded-md bg-[#4361AB] px-4 py-2 text-sm font-semibold text-white hover:bg-[#36509A] disabled:opacity-50">{creatingCustom ? 'Creating...' : 'Add Task & Assign'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}