'use client'

import { useState } from 'react'

export default function EmployeesPage() {
  const [form, setForm] = useState({
    email: '',
    employeeName: '',
    employeeId: '',
    jobTitle: '',
    department: '',
    manager: '',
    startDate: '',
    location: '',
  })

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const formComplete = Object.values(form).every(
    (value) => value.trim() !== ''
  )

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-[#222222]">
        Employees
      </h1>

      <p className="mt-1 text-sm text-[#222222]">
        Add a new employee and assign the default onboarding checklist
      </p>

      <form className="mt-6 max-w-3xl">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="email"
              className="text-sm font-semibold text-[#222222]"
            >
              Employee Email
            </label>

            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="employee@example.com"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-[#222222] outline-none focus:border-[#4361AB]"
            />
          </div>

          <div>
            <label
              htmlFor="employeeName"
              className="text-sm font-semibold text-[#222222]"
            >
              Employee Name
            </label>

            <input
              id="employeeName"
              name="employeeName"
              type="text"
              value={form.employeeName}
              onChange={handleChange}
              placeholder="Employee name"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-[#222222] outline-none focus:border-[#4361AB]"
            />
          </div>

          <div>
            <label
              htmlFor="employeeId"
              className="text-sm font-semibold text-[#222222]"
            >
              Employee ID
            </label>

            <input
              id="employeeId"
              name="employeeId"
              type="text"
              value={form.employeeId}
              onChange={handleChange}
              placeholder="EMP001"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-[#222222] outline-none focus:border-[#4361AB]"
            />
          </div>

          <div>
            <label
              htmlFor="jobTitle"
              className="text-sm font-semibold text-[#222222]"
            >
              Job Title
            </label>

            <input
              id="jobTitle"
              name="jobTitle"
              type="text"
              value={form.jobTitle}
              onChange={handleChange}
              placeholder="Job title"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-[#222222] outline-none focus:border-[#4361AB]"
            />
          </div>

          <div>
            <label
              htmlFor="department"
              className="text-sm font-semibold text-[#222222]"
            >
              Department
            </label>

            <input
              id="department"
              name="department"
              type="text"
              value={form.department}
              onChange={handleChange}
              placeholder="Department"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-[#222222] outline-none focus:border-[#4361AB]"
            />
          </div>

          <div>
            <label
              htmlFor="manager"
              className="text-sm font-semibold text-[#222222]"
            >
              Manager
            </label>

            <input
              id="manager"
              name="manager"
              type="text"
              value={form.manager}
              onChange={handleChange}
              placeholder="Manager name"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-[#222222] outline-none focus:border-[#4361AB]"
            />
          </div>

          <div>
            <label
              htmlFor="startDate"
              className="text-sm font-semibold text-[#222222]"
            >
              Start Date
            </label>

            <input
              id="startDate"
              name="startDate"
              type="date"
              value={form.startDate}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-[#222222] outline-none focus:border-[#4361AB]"
            />
          </div>

          <div>
            <label
              htmlFor="location"
              className="text-sm font-semibold text-[#222222]"
            >
              Location
            </label>

            <input
              id="location"
              name="location"
              type="text"
              value={form.location}
              onChange={handleChange}
              placeholder="Melbourne"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-[#222222] outline-none focus:border-[#4361AB]"
            />
          </div>
        </div>

        <div className="mt-5 rounded-md bg-[#F4F7FB] px-4 py-3">
          <p className="text-sm text-[#222222]">
            The default onboarding checklist will be assigned automatically.
          </p>
        </div>

        <button
          type="button"
          disabled={!formComplete}
          className="mt-5 rounded bg-[#4361AB] px-4 py-2 text-sm font-semibold text-white hover:bg-[#36509A] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add Employee
        </button>
      </form>
    </div>
  )
}