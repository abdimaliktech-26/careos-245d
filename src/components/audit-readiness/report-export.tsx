'use client'

import { Printer, FileDown, Download } from 'lucide-react'
import { downloadCsv } from '@/lib/audit-readiness/export'

interface ReportExportProps {
  /** DOM id of the report container to serialize for the Word export. */
  targetId: string
  filename: string
  findingRows: ReadonlyArray<Record<string, string | number | null | undefined>>
}

export function ReportExport({ targetId, filename, findingRows }: ReportExportProps) {
  const exportWord = () => {
    const node = document.getElementById(targetId)
    if (!node) return
    const html =
      `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">` +
      `<head><meta charset="utf-8"><title>${filename}</title></head><body>${node.innerHTML}</body></html>`
    const blob = new Blob(['﻿', html], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}.doc`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex items-center gap-2 print:hidden">
      <button type="button" onClick={() => window.print()} className={btnClass}>
        <Printer className="h-[14px] w-[14px]" /> Print / PDF
      </button>
      <button type="button" onClick={exportWord} className={btnClass}>
        <FileDown className="h-[14px] w-[14px]" /> Word
      </button>
      <button type="button" onClick={() => downloadCsv(filename, findingRows)} disabled={findingRows.length === 0} className={`${btnClass} disabled:cursor-not-allowed disabled:opacity-50`}>
        <Download className="h-[14px] w-[14px]" /> Excel (CSV)
      </button>
    </div>
  )
}

const btnClass = 'inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-[12px] font-semibold text-foreground transition-colors hover:bg-muted/50'
