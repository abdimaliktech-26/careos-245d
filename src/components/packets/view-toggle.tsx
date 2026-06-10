'use client'

import { useState, type ReactNode } from 'react'
import { KanbanBoard } from '@/components/packets/kanban-board'

type ViewMode = 'table' | 'kanban'

type PacketsViewToggleProps = {
  tableView: ReactNode
  packetRows: Array<Record<string, unknown>>
}

export function PacketsViewToggle({ tableView, packetRows }: PacketsViewToggleProps) {
  const [view, setView] = useState<ViewMode>('table')

  const kanbanPackets = packetRows.map((p) => {
    const client = p.clients as { legal_name: string; program: string } | null
    return {
      id: p.id as string,
      clientName: client?.legal_name ?? '—',
      clientId: p.client_id as string,
      packetType: (p.packet_type as string).replaceAll('_', ' '),
      program: client?.program ?? '—',
      dueDate: p.due_date as string,
      status: p.status as string,
    }
  })

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => setView('table')}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            view === 'table'
              ? 'bg-[#E8799E] text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Table
        </button>
        <button
          onClick={() => setView('kanban')}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            view === 'kanban'
              ? 'bg-[#E8799E] text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Kanban
        </button>
      </div>

      {view === 'table' ? tableView : <KanbanBoard packets={kanbanPackets} />}
    </div>
  )
}
