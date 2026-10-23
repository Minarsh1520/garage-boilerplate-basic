'use client'

import { useState } from 'react'

export function HelpMenu() {
  const [open, setOpen] = useState(false)

  const startTour = (section: 'all' | 'home' | 'chatbot') => {
    setOpen(false)
    window.dispatchEvent(new CustomEvent('start-app-tour', { detail: { section } }))
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)} className="rounded-md border border-[#4361AB] bg-white px-4 py-2 text-sm font-semibold text-[#4361AB] hover:bg-[#E8F1F8]">Help</button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-52 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <p className="border-b border-gray-200 px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500">Replay Tour</p>
          <button type="button" onClick={() => startTour('all')} className="block w-full px-4 py-3 text-left text-sm font-medium text-[#222222] hover:bg-[#F4F7FB]">Entire App</button>
          <button type="button" onClick={() => startTour('home')} className="block w-full px-4 py-3 text-left text-sm font-medium text-[#222222] hover:bg-[#F4F7FB]">Dashboard</button>
          <button type="button" onClick={() => startTour('chatbot')} className="block w-full px-4 py-3 text-left text-sm font-medium text-[#222222] hover:bg-[#F4F7FB]">AI Assistant</button>
        </div>
      )}
    </div>
  )
}