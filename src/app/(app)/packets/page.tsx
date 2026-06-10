import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { refreshOverduePackets } from '@/lib/packets/actions'
import { complianceBadgeClass, getPacketCompliance } from '@/lib/packets/compliance'
import { PacketsViewToggle } from '@/components/packets/view-toggle'
import { PacketFilters } from '@/components/packets/packet-filters'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; dot: string; label: string }> = {
    pending:          { bg: 'bg-gray-100 text-gray-500',      dot: 'bg-gray-400',   label: 'Not Started' },
    not_started:      { bg: 'bg-gray-100 text-gray-500',      dot: 'bg-gray-400',   label: 'Not Started' },
    in_progress:      { bg: 'bg-blue-50 text-blue-700',       dot: 'bg-blue-500',   label: 'In Progress' },
    needs_signature:  { bg: 'bg-violet-50 text-violet-700',   dot: 'bg-violet-500', label: 'Needs Signature' },
    completed:        { bg: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500',label: 'Completed' },
    overdue:          { bg: 'bg-red-50 text-red-700',         dot: 'bg-red-500',    label: 'Overdue' },
  }
  const s = map[status] ?? { bg: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400', label: status }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${s.bg}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

function TableView({ packets }: { packets: Array<Record<string, unknown>> }) {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-gray-100 bg-white"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-5 py-3.5">
        <PacketFilters filters={[
          { name: 'status', defaultLabel: 'All Statuses', options: [['pending','Not Started'],['in_progress','In Progress'],['overdue','Overdue'],['completed','Completed']] as [string,string][] },
          { name: 'program', defaultLabel: 'All Programs', options: [['ihs','IHS'],['residential','Residential'],['employment','Employment'],['emergency','Emergency']] as [string,string][] },
          { name: 'type', defaultLabel: 'All Types', options: [['intake','Intake'],['45_day','45-Day Review'],['semi_annual','Semi-Annual'],['annual','Annual Review']] as [string,string][] },
        ]} />
        {packets.length > 0 && (
          <span className="ml-auto text-[11px] font-medium text-[#94A3B8]">
            {packets.length} packet{packets.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {packets.length === 0 ? (
        <div className="px-6 py-20 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF2FF]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E8799E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
            </svg>
          </div>
          <p className="text-[13px] font-semibold text-[#3A2A4A]">No packets yet</p>
          <p className="mt-1 text-[12px] text-[#94A3B8]">Create a client to generate compliance packets.</p>
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              {['Client', 'Type', 'Program', 'Due Date', 'Compliance', 'Status'].map((h) => (
                <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {packets.map((a: Record<string, unknown>) => {
              const client = a.clients as { legal_name: string; program: string } | null
              const compliance = getPacketCompliance(a.due_date as string | null, a.status as string | null)
              return (
                <tr key={a.id as string} className="transition-colors hover:bg-gray-50/60">
                  <td className="px-5 py-3.5 text-[13px] font-medium text-[#3A2A4A]">
                    {client?.legal_name ?? '—'}
                  </td>
                  <td className="px-5 py-3.5 text-[12px] capitalize text-[#64748B]">
                    {String(a.packet_type ?? '').replaceAll('_', ' ')}
                  </td>
                  <td className="px-5 py-3.5 text-[12px] text-[#94A3B8]">{client?.program ?? '—'}</td>
                  <td className="px-5 py-3.5 text-[12px] tabular-nums text-[#64748B]">{a.due_date as string}</td>
                  <td className="px-5 py-3.5">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${complianceBadgeClass(compliance.level)}`}>
                      {compliance.label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5"><StatusBadge status={a.status as string} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default async function PacketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; program?: string; type?: string }>
}) {
  const { user, error } = await getSession()
  if (error || !user) redirect('/auth/login')

  const params = await searchParams
  const statusFilter = params.status ?? ''
  const programFilter = params.program ?? ''
  const typeFilter = params.type ?? ''

  const supabase = await createClient()
  await refreshOverduePackets()

  let query = supabase
    .from('packets')
    .select('id, client_id, status, due_date, packet_type, clients(legal_name, program)')
    .eq('organization_id', user.organizationId ?? '')
    .order('due_date', { ascending: true })

  if (statusFilter) query = query.eq('status', statusFilter)
  if (typeFilter) query = query.eq('packet_type', typeFilter)
  if (programFilter) query = query.eq('clients.program', programFilter)

  const { data: packets } = (user.organizationId ? await query : { data: [] })

  const packetRows = (packets ?? []) as Array<Record<string, unknown>>

  return (
    <div>
      <div className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">
          Compliance Pipeline
        </p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-[#3A2A4A]">All Packets</h1>
        <p className="mt-1 text-[13px] text-[#64748B]">
          Track every intake and periodic review across your organization.
        </p>
      </div>

      <PacketsViewToggle
        tableView={<TableView packets={packetRows} />}
        packetRows={packetRows}
      />
    </div>
  )
}
