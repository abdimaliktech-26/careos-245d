import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { refreshOverduePackets } from '@/lib/packets/actions'
import { complianceBadgeClass, getPacketCompliance } from '@/lib/packets/compliance'
import { validateRequiredSignatures } from '@/lib/forms/signature-validation'
import { getClientScorecards } from '@/lib/audit/scorecards'
import { ScorecardBadge } from '@/components/audit/scorecard-badge'

// Status badge for packet rows
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
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.bg}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

// Stat card icons
function IconUsers({ color }: { color: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
}
function IconClipboard({ color }: { color: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>
    </svg>
  )
}
function IconClock({ color }: { color: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  )
}
function IconFilePen({ color }: { color: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22h6a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v10"/>
      <path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10.4 12.6a2 2 0 1 1 3 3L8 21l-4 1 1-4Z"/>
    </svg>
  )
}
function IconShieldAlert({ color }: { color: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  )
}
function IconGraduationCap({ color }: { color: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
    </svg>
  )
}

interface StatCardProps {
  label: string
  value: number
  iconBg: string
  iconColor: string
  Icon: (props: { color: string }) => React.ReactElement
  variant?: 'default' | 'warning' | 'danger'
}

function StatCard({ label, value, iconBg, iconColor, Icon, variant = 'default' }: StatCardProps) {
  const isAlert = variant !== 'default' && value > 0
  const accentColor = isAlert ? (variant === 'danger' ? '#EF4444' : '#F59E0B') : undefined
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-white p-5 ${
        isAlert
          ? variant === 'danger' ? 'border-red-100' : 'border-amber-100'
          : 'border-gray-100'
      }`}
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
    >
      {isAlert && accentColor && (
        <div className="absolute inset-y-0 left-0 w-[3px] rounded-l-2xl" style={{ background: accentColor }} />
      )}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: iconBg }}>
          <Icon color={iconColor} />
        </div>
        {isAlert && (
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
            style={{
              background: variant === 'danger' ? '#FEF2F2' : '#FFFBEB',
              color: variant === 'danger' ? '#DC2626' : '#B45309',
            }}
          >
            {variant === 'danger' ? 'Critical' : 'Alert'}
          </span>
        )}
      </div>
      <p className="text-[30px] font-bold leading-none tracking-tight text-[#3A2A4A]">{value}</p>
      <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">{label}</p>
    </div>
  )
}

export default async function DashboardPage() {
  const { user, error } = await getSession()
  if (error || !user) redirect('/auth/login')

  const supabase = await createClient()
  const organizationId = user.organizationId
  await refreshOverduePackets()

  const [
    { count: activeClients },
    { data: recentAssignments },
    { data: openPackets },
    { data: signatureForms },
    { count: openIncidents },
    { count: trainingAlerts },
  ] = await Promise.all([
    organizationId
      ? supabase.from('clients').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('status', 'active')
      : { count: 0 },
    organizationId
      ? supabase.from('packets').select('id, status, due_date, packet_type, clients(legal_name, program)').eq('organization_id', organizationId).neq('status', 'completed').order('due_date', { ascending: true }).limit(8)
      : { data: [] },
    organizationId
      ? supabase.from('packets').select('id, status, due_date, packet_type, clients(legal_name, program)').eq('organization_id', organizationId).in('status', ['overdue', 'not_started', 'in_progress', 'needs_signature']).order('due_date', { ascending: true })
      : { data: [] },
    organizationId
      ? supabase.from('packet_forms').select('id, status, packets!inner(organization_id), signatures(signer_role)').eq('packets.organization_id', organizationId).in('status', ['needs_signature', 'completed'])
      : { data: [] },
    organizationId
      ? supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).neq('status', 'closed')
      : { count: 0 },
    organizationId
      ? supabase.from('staff_trainings').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).in('status', ['expired', 'expiring_soon', 'not_completed'])
      : { count: 0 },
  ])

  const scorecards = user.organizationId ? await getClientScorecards(user.organizationId) : []

  const today = new Date()
  const headerDate = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const openPacketRows = (openPackets ?? []) as Array<Record<string, unknown>>

  const alertAssignments = openPacketRows
    .map((packet) => ({
      packet,
      compliance: getPacketCompliance(packet.due_date as string | null, packet.status as string | null, today),
    }))
    .filter((entry) => entry.compliance.isAlert)
    .toSorted((a, b) => {
      const severity: Record<string, number> = { overdue: 0, due_today: 1, due_tomorrow: 2, warning: 3, none: 4, complete: 5 }
      return (severity[a.compliance.level] ?? 4) - (severity[b.compliance.level] ?? 4)
        || (a.compliance.daysUntilDue ?? 999) - (b.compliance.daysUntilDue ?? 999)
    })
    .slice(0, 8)

  const overdue = openPacketRows.filter((p) =>
    getPacketCompliance(p.due_date as string | null, p.status as string | null, today).level === 'overdue'
  ).length

  const inProgress = openPacketRows.filter((p) =>
    p.status === 'in_progress' || p.status === 'needs_signature'
  ).length

  const signatureIssues = ((signatureForms ?? []) as Array<Record<string, unknown>>).filter((form) =>
    !validateRequiredSignatures((form.signatures ?? []) as Array<{ signer_role: string }>).isValid
  ).length

  const totalAlerts = overdue + signatureIssues + (openIncidents ?? 0) + (trainingAlerts ?? 0)

  return (
    <div>
      {/* Page header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">
            Operational Overview · {headerDate}
          </p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-[#3A2A4A]">
            Welcome back, {user.fullName.split(' ')[0]}.
          </h1>
          <p className="mt-1 text-[13px] text-[#64748B]">
            {totalAlerts > 0
              ? `${totalAlerts} item${totalAlerts !== 1 ? 's' : ''} across your organization need${totalAlerts === 1 ? 's' : ''} attention.`
              : 'All compliance items are on track across your organization.'}
          </p>
        </div>
        <Link
          href="/clients/new"
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #E8799E 0%, #C8A8E8 100%)' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Client
        </Link>
      </div>

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-6">
        <StatCard
          label="Active Clients"
          value={activeClients ?? 0}
          iconBg="#EEF2FF" iconColor="#E8799E"
          Icon={IconUsers}
        />
        <StatCard
          label="In Progress"
          value={inProgress ?? 0}
          iconBg="#DBEAFE" iconColor="#2563EB"
          Icon={IconClipboard}
        />
        <StatCard
          label="Overdue"
          value={overdue ?? 0}
          iconBg="#FEE2E2" iconColor="#DC2626"
          Icon={IconClock}
          variant={overdue > 0 ? 'danger' : 'default'}
        />
        <StatCard
          label="Signature Alerts"
          value={signatureIssues}
          iconBg="#EDE9FE" iconColor="#7C3AED"
          Icon={IconFilePen}
          variant={signatureIssues > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label="Open Incidents"
          value={openIncidents ?? 0}
          iconBg="#FEE2E2" iconColor="#DC2626"
          Icon={IconShieldAlert}
          variant={(openIncidents ?? 0) > 0 ? 'danger' : 'default'}
        />
        <StatCard
          label="Training Alerts"
          value={trainingAlerts ?? 0}
          iconBg="#FEF3C7" iconColor="#D97706"
          Icon={IconGraduationCap}
          variant={(trainingAlerts ?? 0) > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Main grid */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-gray-100 bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#94A3B8]">Compliance Scorecards</p>
            <h2 className="mt-0.5 text-[13px] font-bold text-[#3A2A4A]">Per-Client Health</h2>
          </div>
          <Link href="/packets" className="text-[12px] font-medium text-[#E8799E] hover:opacity-80 transition-opacity">View all →</Link>
        </div>
        <div className="overflow-x-auto">
          {scorecards.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-[13px] text-[#94A3B8]">No clients with compliance data yet.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/30">
                  {['Client', 'Program', 'Packets', 'Health Score', 'Status'].map((h) => (
                    <th key={h} className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {scorecards.slice(0, 8).map((card) => (
                  <tr key={card.clientId} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/clients/${card.clientId}`} className="text-[13px] font-semibold text-[#3A2A4A] hover:text-[#E8799E]">
                        {card.clientName}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-[12px] text-[#64748B] capitalize">{card.program}</td>
                    <td className="px-5 py-3">
                      <span className="text-[12px] font-medium text-[#3A2A4A]">{card.completedPackets}/{card.totalPackets}</span>
                      {card.overduePackets > 0 && <span className="ml-1.5 text-[11px] text-red-500">({card.overduePackets} overdue)</span>}
                    </td>
                    <td className="px-5 py-3">
                      <ScorecardBadge score={card.packetScore} health={card.overallHealth} size="sm" />
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                        card.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${card.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                        {card.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Open packets table */}
        <div className="lg:col-span-2 overflow-hidden rounded-2xl border border-gray-100 bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#94A3B8]">Active Pipeline</p>
              <h2 className="mt-0.5 text-[13px] font-bold text-[#3A2A4A]">Open & Recent Packets</h2>
            </div>
            <Link href="/packets" className="text-[12px] font-medium text-[#E8799E] hover:opacity-80 transition-opacity">
              View all →
            </Link>
          </div>

          {!recentAssignments || recentAssignments.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF2FF]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E8799E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                </svg>
              </div>
              <p className="text-[13px] font-semibold text-[#3A2A4A]">No open packets</p>
              <p className="mt-1 text-[12px] text-[#94A3B8]">Create a client to generate intake packets.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {['Client', 'Packet', 'Program', 'Due', 'Status'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentAssignments.map((a: Record<string, unknown>) => {
                  const client = a.clients as { legal_name: string; program: string } | null
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
                      <td className="px-5 py-3.5"><StatusBadge status={a.status as string} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Compliance risk queue */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#94A3B8]">Risk Queue</p>
              <h2 className="mt-0.5 text-[13px] font-bold text-[#3A2A4A]">Compliance Alerts</h2>
            </div>
            {alertAssignments.length > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {alertAssignments.length}
              </span>
            )}
          </div>

          {alertAssignments.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <p className="text-[13px] font-semibold text-[#3A2A4A]">All clear</p>
              <p className="mt-1 text-[11px] text-[#94A3B8]">No compliance alerts at this time.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {alertAssignments.map(({ packet: a, compliance }) => {
                const client = a.clients as { legal_name: string; program: string } | null
                const isOverdue = compliance.level === 'overdue'
                const isDueToday = compliance.level === 'due_today'
                const leftColor = isOverdue ? '#EF4444' : isDueToday ? '#F59E0B' : '#3B82F6'
                const chipBg = isOverdue ? '#FEF2F2' : isDueToday ? '#FFFBEB' : '#EFF6FF'
                const chipColor = isOverdue ? '#DC2626' : isDueToday ? '#B45309' : '#1D4ED8'
                return (
                  <div key={a.id as string} className="relative pl-8 pr-5 py-3.5">
                    <div
                      className="absolute left-5 rounded-full"
                      style={{ top: '12px', bottom: '12px', width: '2px', background: leftColor }}
                    />
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <span
                          className="mb-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em]"
                          style={{ background: chipBg, color: chipColor }}
                        >
                          {compliance.label}
                        </span>
                        <p className="text-[13px] font-semibold leading-snug text-[#3A2A4A] truncate">
                          {client?.legal_name ?? '—'}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#94A3B8] truncate">
                          {String(a.packet_type ?? '').replaceAll('_', ' ')} · {client?.program ?? ''}
                        </p>
                      </div>
                      <p className="mt-5 shrink-0 text-[11px] tabular-nums text-[#94A3B8]">{a.due_date as string}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="border-t border-gray-50 px-5 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#CBD5E1]">
              {alertAssignments.length > 0 ? `${alertAssignments.length} item${alertAssignments.length !== 1 ? 's' : ''} need attention` : 'No pending items'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
