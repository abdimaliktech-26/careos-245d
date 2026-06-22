'use client'

import { Download, Printer } from 'lucide-react'
import { downloadCsv } from '@/lib/audit-readiness/export'

interface ExportButtonsProps {
  filename: string
  rows: ReadonlyArray<Record<string, string | number | null | undefined>>
  /** When true, also show a Print / Save-as-PDF button (window.print). */
  print?: boolean
}

export function ExportButtons({ filename, rows, print = true }: ExportButtonsProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => downloadCsv(filename, rows)}
        disabled={rows.length === 0}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-[12px] font-semibold text-foreground transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Download className="h-[14px] w-[14px]" />
        Export Excel (CSV)
      </button>
      {print && (
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-[12px] font-semibold text-foreground transition-colors hover:bg-muted/50"
        >
          <Printer className="h-[14px] w-[14px]" />
          Print / PDF
        </button>
      )}
    </div>
  )
}
