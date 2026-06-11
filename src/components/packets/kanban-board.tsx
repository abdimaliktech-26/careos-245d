'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updatePacketStatus } from '@/lib/packets/actions'

type Packet = {
  id: string
  clientName: string
  clientId: string
  packetType: string
  program: string
  dueDate: string
  status: string
}

const COLUMNS = [
  { key: 'not_started', label: 'Not Started', color: 'border-t-gray-400', bg: 'bg-muted' },
  { key: 'in_progress', label: 'In Progress', color: 'border-t-blue-500', bg: 'bg-blue-50/30' },
  { key: 'needs_signature', label: 'Needs Signature', color: 'border-t-violet-500', bg: 'bg-violet-50/30' },
  { key: 'completed', label: 'Completed', color: 'border-t-emerald-500', bg: 'bg-emerald-50/30' },
]

const PENDING_STATUSES = ['pending', 'not_started']

function normalizeStatus(status: string): string {
  if (PENDING_STATUSES.includes(status)) return 'not_started'
  return status
}

type KanbanBoardProps = {
  packets: Packet[]
}

export function KanbanBoard({ packets }: KanbanBoardProps) {
  const router = useRouter()
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  const columnPackets = COLUMNS.map((col) => ({
    ...col,
    packets: packets.filter((p) => normalizeStatus(p.status) === col.key),
  }))

  const handleDragStart = (e: React.DragEvent, packetId: string) => {
    setDraggingId(packetId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', packetId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault()
    const packetId = e.dataTransfer.getData('text/plain')
    if (!packetId) return

    const packet = packets.find((p) => p.id === packetId)
    if (!packet || normalizeStatus(packet.status) === newStatus) return

    setUpdating(packetId)
    setDraggingId(null)

    const dbStatus = newStatus === 'not_started' ? 'pending' : newStatus
    const result = await updatePacketStatus(packetId, dbStatus)
    if (!result.error) router.refresh()
    setUpdating(null)
  }

  return (
    <div className="grid grid-cols-4 gap-4">
      {columnPackets.map((col) => (
        <div
          key={col.key}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, col.key)}
          className={`rounded-2xl border border-border ${col.color} border-t-4 ${col.bg} transition-colors ${
            draggingId ? 'ring-2 ring-ring/20' : ''
          }`}
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
        >
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">{col.label}</h3>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-card border border-border text-[10px] font-bold text-muted-foreground">
                {col.packets.length}
              </span>
            </div>
          </div>

          <div className="p-3 space-y-2 min-h-[200px]">
            {col.packets.length === 0 ? (
              <div className="flex items-center justify-center h-20">
                <p className="text-[11px] text-muted-foreground">Drop packets here</p>
              </div>
            ) : (
              col.packets.map((packet) => (
                <div
                  key={packet.id}
                  draggable={updating !== packet.id}
                  onDragStart={(e) => handleDragStart(e, packet.id)}
                  className={`bg-card rounded-xl border border-border p-3 cursor-grab active:cursor-grabbing transition-all hover:shadow-md ${
                    draggingId === packet.id ? 'opacity-50 scale-[0.97]' : ''
                  } ${updating === packet.id ? 'opacity-50 pointer-events-none' : ''}`}
                  style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
                >
                  <Link href={`/clients/${packet.clientId}`} className="block">
                    <p className="text-[13px] font-semibold text-foreground truncate">{packet.clientName}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">{packet.packetType} · {packet.program}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">Due {packet.dueDate}</p>
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
