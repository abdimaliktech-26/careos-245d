'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { subscribeToNotifications, subscribeToTable } from '@/lib/realtime'
import type { UserProfile } from '@/types/app'

type Toast = {
  id: string
  message: string
  type: 'info' | 'success' | 'warning'
}

function ToastItem({ toast, onDone }: { toast: Toast; onDone: (id: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDone(toast.id), 4000)
    return () => clearTimeout(t)
  }, [toast.id, onDone])

  const colors = {
    info: 'border-blue-200 bg-blue-50 text-blue-800',
    success: 'border-green-200 bg-green-50 text-green-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
  }

  return (
    <div
      className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-lg shadow-black/5 animate-slide-up ${colors[toast.type]}`}
    >
      <span className="mt-0.5">{toast.type === 'success' ? '✓' : toast.type === 'warning' ? '⚠' : 'ℹ'}</span>
      <p className="flex-1 leading-snug">{toast.message}</p>
    </div>
  )
}

export function RealtimeProvider({
  user,
  children,
}: {
  user: UserProfile
  children: React.ReactNode
}) {
  const orgId = user.organizationId
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastId = useRef(0)

  const addToast = useCallback((message: string, type: Toast['type']) => {
    toastId.current += 1
    setToasts((prev) => [...prev, { id: String(toastId.current), message, type }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  useEffect(() => {
    if (!orgId) return

    const unsubNotifications = subscribeToNotifications(orgId, (payload) => {
      addToast(payload.subject, payload.severity === 'high' || payload.severity === 'critical' ? 'warning' : 'info')
    })

    const unsubPackets = subscribeToTable('packets', 'UPDATE', undefined, (payload) => {
      const row = payload.new as Record<string, unknown>
      addToast(`Packet status updated: ${String(row.title ?? 'Document packet')}`, 'info')
    })

    const unsubIncidents = subscribeToTable('incidents', 'INSERT', undefined, () => {
      addToast('New incident reported', 'warning')
    })

    return () => {
      unsubNotifications()
      unsubPackets()
      unsubIncidents()
    }
  }, [orgId, addToast])

  return (
    <>
      {children}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDone={removeToast} />
          ))}
        </div>
      )}
    </>
  )
}
