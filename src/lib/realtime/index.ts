import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

const activeChannels = new Map<string, RealtimeChannel>()

function channel(topic: string): RealtimeChannel {
  const existing = activeChannels.get(topic)
  if (existing) return existing

  const supabase = createClient()
  const ch = supabase.channel(topic)
  activeChannels.set(topic, ch)
  return ch
}

export function subscribeToPacket(
  packetId: string,
  callback: (payload: Record<string, unknown>) => void
): () => void {
  const ch = channel(`packet:${packetId}`)
  ch.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'packets', filter: `id=eq.${packetId}` },
    (payload) => callback(payload as unknown as Record<string, unknown>)
  ).subscribe()

  return () => {
    ch.unsubscribe()
    activeChannels.delete(`packet:${packetId}`)
  }
}

export function subscribeToClient(
  clientId: string,
  callback: (payload: Record<string, unknown>) => void
): () => void {
  const ch = channel(`client:${clientId}`)
  ch.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'clients', filter: `id=eq.${clientId}` },
    (payload) => callback(payload as unknown as Record<string, unknown>)
  ).subscribe()

  return () => {
    ch.unsubscribe()
    activeChannels.delete(`client:${clientId}`)
  }
}

export function subscribeToNotifications(
  orgId: string,
  callback: (payload: { subject: string; message: string; severity?: string }) => void
): () => void {
  const ch = channel(`notifications:${orgId}`)
  ch.on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'audit_notifications',
      filter: `organization_id=eq.${orgId}`,
    },
    (payload) => {
      const row = payload.new as Record<string, unknown>
      callback({
        subject: String(row.subject ?? 'Notification'),
        message: String(row.message ?? ''),
        severity: String(row.severity ?? 'low'),
      })
    }
  ).subscribe()

  return () => {
    ch.unsubscribe()
    activeChannels.delete(`notifications:${orgId}`)
  }
}

export function subscribeToTable(
  table: string,
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*',
  filter: string | undefined,
  callback: (payload: Record<string, unknown>) => void
): () => void {
  const topic = `${table}:${event}:${filter ?? '*'}:${Date.now()}`
  const ch = channel(topic)
  ch.on(
    'postgres_changes',
    { event, schema: 'public', table, filter },
    (payload) => callback(payload as unknown as Record<string, unknown>)
  ).subscribe()

  return () => {
    ch.unsubscribe()
    activeChannels.delete(topic)
  }
}

export function cleanAllChannels(): void {
  for (const [, ch] of activeChannels) {
    ch.unsubscribe()
  }
  activeChannels.clear()
}
