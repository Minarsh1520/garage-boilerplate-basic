'use client'

import { useEffect, useState, type ChangeEvent } from 'react'
import { addEmployee } from '@/actions/employee.actions'
import { assignTaskFromTemplate, getEmployeeOptions, getEmployeeTasks, removePendingTask, type EmployeeOption, type EmployeeTask, type TaskTemplateId } from '@/actions/task.actions'

const taskTemplates: { id: TaskTemplateId; label: string }[] = [
  { id: 'personal-details', label: 'Personal Details Form' },
  { id: 'tfn-declaration', label: 'Tax File Declaration' },
  { id: 'super-fund', label: 'Super Fund Nomination' },
  { id: 'company-policies', label: 'Read through company policies' },
]

const defaultNewEmployeeTasks: Record<TaskTemplateId, { selected: boolean; dueDays: string }> = {
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
  const [selectionMode, setSelectionMode] = useState<'existing' | 'manual'>('existing')
  const [selectedEmail, setSelectedEmail] = useState('')
  const [manualEmail, setManualEmail] = useState('')
  const [template, setTemplate] = useState<TaskTemplateId>('personal-details')
  const [taskDueDays, setTaskDueDays] = useState('1')
  const [employeeTasks, setEmployeeTasks] = useState<EmployeeTask[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [removingTaskId, setRemovingTaskId] = useState('')
  const [taskSuccess, setTaskSuccess] = useState('')
  const [taskError, setTaskError] = useState('')

  const formComplete = Object.values(form).every((value) => value.trim() !== '')
  const taskEmail = selectionMode === 'existing' ? selectedEmail : manualEmail.trim()

  useEffect(() => {
    getEmployeeOptions().then(setEmployees).catch(() => setTaskError('Failed to load employees.'))
  }, [])

  useEffect(() => {
    if (!taskEmail) { setEmployeeTasks([]); return }

    const loadTasks = async () => {
      setLoadingTasks(true)
      try { setEmployeeTasks(await getEmployeeTasks(taskEmail)) }
      catch { setEmployeeTasks([]) }
      setLoadingTasks(false)
    }

    loadTasks()
  }, [taskEmail])

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setAddSuccess('')
    setAddError('')
  }

  const handleAddEmployee = async () => {
    if (!formComplete) return

    setAddingEmployee(true)
    setAddSuccess('')
    setAddError('')

    const checklist = taskTemplates
      .filter((task) => newEmployeeTasks[task.id].selected)
      .map((task) => ({ templateId: task.id, dueDays: Math.max(0, Number(newEmployeeTasks[task.id].dueDays) || 0) }))

    const result = await addEmployee({ ...form, checklist })

    if (result.success) {
      setAddSuccess('Employee added successfully.')
      setForm(emptyForm)
      setNewEmployeeTasks(defaultNewEmployeeTasks)
      try { setEmployees(await getEmployeeOptions()) } catch {}
    } else setAddError(result.error ?? 'Failed to add employee.')

    setAddingEmployee(false)
  }

  const handleAssignTask = async () => {
    if (!taskEmail) return

    setAssigning(true)
    setTaskSuccess('')
    setTaskError('')

    const result = await assignTaskFromTemplate(taskEmail, template, Math.max(0, Number(taskDueDays) || 0))

    if (result.success) {
      setTaskSuccess('Task assigned successfully.')
      setEmployeeTasks(await getEmployeeTasks(taskEmail))
    } else setTaskError(result.error ?? 'Failed to assign task.')

    setAssigning(false)
  }

  const handleRemoveTask = async (taskId: string) => {
    if (!taskEmail) return

    setRemovingTaskId(taskId)
    setTaskSuccess('')
    setTaskError('')

    const result = await removePendingTask(taskEmail, taskId)

    if (result.success) {
      setTaskSuccess('Task removed successfully.')
      setEmployeeTasks(await getEmployeeTasks(taskEmail))
    } else setTaskError(result.error ?? 'Failed to remove task.')

    setRemovingTaskId('')
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
              <input id="employeeId" name="employeeId" value={form.employeeId} onChange={handleChange} placeholder="EMP001" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-[#222222] outline-none focus:border-[#4361AB]" />
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
              {taskTemplates.map((task) => {
                const taskState = newEmployeeTasks[task.id]

                return (
                  <div key={task.id} className="flex flex-col gap-3 rounded-md border border-gray-200 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <label className="flex items-center gap-3 text-sm text-[#222222]">
                      <input type="checkbox" checked={taskState.selected} onChange={(event) => setNewEmployeeTasks((current) => ({ ...current, [task.id]: { ...current[task.id], selected: event.target.checked } }))} />
                      {task.label}
                    </label>

                    <div className="flex items-center gap-2">
                      <span className="text-sm text-zinc-600">Due in</span>
                      <input type="number" min="0" value={taskState.dueDays} disabled={!taskState.selected} onChange={(event) => setNewEmployeeTasks((current) => ({ ...current, [task.id]: { ...current[task.id], dueDays: event.target.value } }))} className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm disabled:bg-gray-100 disabled:text-gray-400" />
                      <span className="text-sm text-zinc-600">days</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {addSuccess && <p className="mt-4 text-sm text-green-700">{addSuccess}</p>}
          {addError && <p className="mt-4 text-sm text-red-600">{addError}</p>}

          <button type="button" onClick={handleAddEmployee} disabled={!formComplete || addingEmployee} className="mt-5 rounded bg-[#4361AB] px-4 py-2 text-sm font-semibold text-white hover:bg-[#36509A] disabled:cursor-not-allowed disabled:opacity-50">
            {addingEmployee ? 'Adding...' : 'Add Employee'}
          </button>
        </form>
      </section>

      {/* Manage Employee Tasks */}
      <section className="mt-10 border-t border-gray-300 pt-6">
        <h2 className="text-xl font-bold text-[#222222]">Manage Employee Tasks</h2>
        <p className="mt-1 text-sm text-zinc-600">Assign tasks from a template, set due days, and remove pending tasks.</p>

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
                <select value={selectedEmail} onChange={(event) => setSelectedEmail(event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#222222] outline-none focus:border-[#4361AB]">
                  <option value="">Select employee</option>
                  {employees.map((employee) => <option key={employee.email} value={employee.email}>{employee.employeeName} — {employee.email}</option>)}
                </select>
              ) : (
                <input type="email" value={manualEmail} onChange={(event) => setManualEmail(event.target.value)} placeholder="employee@example.com" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-[#222222] outline-none focus:border-[#4361AB]" />
              )}
            </div>

            <div>
              <label htmlFor="taskTemplate" className="text-sm font-semibold text-[#222222]">Task Template</label>
              <select id="taskTemplate" value={template} onChange={(event) => setTemplate(event.target.value as TaskTemplateId)} className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#222222] outline-none focus:border-[#4361AB]">
                {taskTemplates.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="taskDueDays" className="text-sm font-semibold text-[#222222]">Due In</label>
              <div className="mt-1 flex items-center gap-2">
                <input id="taskDueDays" type="number" min="0" value={taskDueDays} onChange={(event) => setTaskDueDays(event.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-[#222222] outline-none focus:border-[#4361AB]" />
                <span className="text-sm text-zinc-600">days</span>
              </div>
            </div>
          </div>

          {taskSuccess && <div className="mt-4 rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">{taskSuccess}</div>}
          {taskError && <div className="mt-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-600">{taskError}</div>}

          <button type="button" onClick={handleAssignTask} disabled={!taskEmail || assigning} className="mt-5 rounded bg-[#4361AB] px-4 py-2 text-sm font-semibold text-white hover:bg-[#36509A] disabled:cursor-not-allowed disabled:opacity-50">
            {assigning ? 'Assigning...' : 'Assign Task'}
          </button>

          {taskEmail && (
            <div className="mt-8">
              <h3 className="text-base font-bold text-[#222222]">Current Tasks</h3>

              {loadingTasks ? (
                <p className="mt-3 text-sm text-zinc-600">Loading tasks...</p>
              ) : employeeTasks.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-600">No checklist tasks assigned.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {employeeTasks.map((task) => (
                    <div key={task.id} className="flex flex-col gap-3 rounded-md border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[#222222]">{task.title}</p>
                        <p className="mt-1 text-sm text-zinc-600">{task.status === 'completed' ? 'Completed' : `Pending · Due in ${task.duein}`}</p>
                      </div>

                      {task.status === 'pending' && (
                        <button type="button" onClick={() => handleRemoveTask(task.id)} disabled={removingTaskId === task.id} className="text-sm font-semibold text-red-600 hover:text-red-700 disabled:opacity-50">
                          {removingTaskId === task.id ? 'Removing...' : 'Remove'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}