'use client'

import { useState } from 'react'
import type { OnboardingChecklistItem } from '@/lib/onboarding'

export default function TaskCard({ item, index }: { item: OnboardingChecklistItem; index: number }) {
  const [open, setOpen] = useState(false)
  const formatDate = (date?: string) => date ? new Date(`${date}T00:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : null

  return (
    <>
      <div className="rounded-lg border border-[#C9D8E8] bg-[#F4F7FB] p-4">
        <div className="flex items-start justify-between gap-4">
          <div data-tour={index === 0 ? 'task-details' : undefined} className="relative">
            <button type="button" onClick={() => setOpen(true)} className="text-left text-base font-semibold text-[#222222] hover:text-[#4361AB] hover:underline">{item.title}</button>
            <p className="mt-1 text-sm text-[#555555]">{item.description}</p>
          </div>

          <div data-tour={index === 0 ? 'task-status' : undefined} className="relative shrink-0 text-right">
            <p className="text-xs font-bold text-[#4361AB]">{item.status.toUpperCase()}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-[#D8E2F0] pt-3">
          <p className="text-xs font-medium text-[#555555]">Due in: {item.duein}</p>
          <button type="button" onClick={() => setOpen(true)} className="rounded-md bg-[#4361AB] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#36509A]">View</button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className="w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">

            <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#4361AB]">Task Details</p>
                <h2 className="mt-1 text-2xl font-bold text-[#222222]">{item.title}</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-gray-500 hover:bg-gray-100 hover:text-[#222222]">×</button>
            </div>

            <div className="space-y-5 px-6 py-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-[#F4F7FB] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status</p>
                  <span className="mt-2 inline-block rounded-full bg-[#E8F1F8] px-3 py-1 text-xs font-bold text-[#4361AB]">{item.status === 'completed' ? 'Completed ✓' : 'Pending'}</span>
                </div>

                <div className="rounded-lg bg-[#F4F7FB] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Due Date</p>
                  <p className="mt-2 text-sm font-semibold text-[#222222]">{item.duein === '0 Days' ? 'Due today' : formatDate(item.dueDate) ?? item.duein}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Description</p>
                <p className="mt-2 text-sm leading-6 text-[#222222]">{item.description}</p>
              </div>

              <div className="border-t border-gray-200 pt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Task Action</p>
                <p className="mt-2 text-sm text-[#555555]">{item.status === 'completed' ? 'This task has already been completed.' : 'Complete this task as part of your onboarding.'}</p>
              </div>
            </div>

            <div className="flex justify-end border-t border-gray-200 bg-gray-50 px-6 py-4">
              <button type="button" onClick={() => setOpen(false)} className="rounded-md bg-[#4361AB] px-5 py-2 text-sm font-semibold text-white hover:bg-[#36509A]">Close</button>
            </div>

          </div>
        </div>
      )}
    </>
  )
}