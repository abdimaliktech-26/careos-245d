'use client'

import { useState, useRef } from 'react'

function csvEscape(val: string) {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`
  }
  return val
}

export function ExportButton({ filename = 'export', data, headers }: { filename?: string; data: Array<Record<string, string | number | null>>; headers: { key: string; label: string }[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const handleCsv = () => {
    const lines = [
      headers.map(h => csvEscape(h.label)).join(','),
      ...data.map(row =>
        headers.map(h => csvEscape(String(row[h.key] ?? ''))).join(',')
      ),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setOpen(false)
  }

  const handlePdf = () => {
    window.print()
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 flex items-center gap-1.5"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Export
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-40 bg-white rounded-xl border border-gray-200 shadow-lg z-20 py-1">
            <button
              onClick={handleCsv}
              className="w-full text-left px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Export as CSV
            </button>
            <button
              onClick={handlePdf}
              className="w-full text-left px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Export as PDF
            </button>
          </div>
        </>
      )}
    </div>
  )
}
