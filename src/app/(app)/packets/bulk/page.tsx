import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { BulkPacketActions } from './bulk-packet-actions'

export default async function BulkPacketsPage() {
  const { user, error } = await getSession()
  if (error || !user || !['staff', 'program_manager', 'org_admin', 'super_admin'].includes(user.role))
    redirect('/dashboard')

  const supabase = await createClient()
  const { data: packets } = await supabase
    .from('packets')
    .select('id, packet_type, status, due_date, client_id, clients(legal_name)')
    .eq('organization_id', user.organizationId)
    .order('created_at', { ascending: false })
    .limit(200)

  const items = (packets ?? []).map(p => ({
    id: p.id,
    packet_type: p.packet_type,
    status: p.status,
    due_date: p.due_date,
    client_name: (Array.isArray(p.clients) ? p.clients[0] : p.clients)?.legal_name ?? 'Unknown',
  }))

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.16em] text-gray-400 uppercase mb-2">Packets</p>
        <h1 className="text-3xl font-bold text-[#3A2A4A]">Bulk Actions</h1>
        <p className="text-gray-500 mt-1">Select multiple packets to approve, mark complete, or update status.</p>
      </div>

      <BulkPacketActions packets={items} />
    </div>
  )
}
