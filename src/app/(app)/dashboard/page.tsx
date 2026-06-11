import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus, Users, ClipboardList, Clock, FilePen, ShieldAlert, GraduationCap, Check } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { refreshOverduePackets } from '@/lib/packets/actions'
import { getPacketCompliance } from '@/lib/packets/compliance'
import { validateRequiredSignatures } from '@/lib/forms/signature-validation'
import { getClientScorecards } from '@/lib/audit/scorecards'
import { ScorecardBadge } from '@/components/audit/scorecard-badge'
import { MorningBriefingCard } from '@/components/dashboard/morning-briefing-card'

// Status badge for packet rows
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; dot: string; label: string }> = {
    pending:          { bg: 'bg-muted text-muted-foreground',                                          dot: 'bg-muted-foreground/60', label: 'Not Started' },
    not_started:      { bg: 'bg-muted text-muted-foreground',                                          dot: 'bg-muted-foreground/60', label: 'Not Started' },
    in_progress:      { bg: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',         dot: 'bg-blue-500',            label: 'In Progress' },
    needs_signature:  { bg: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300', dot: 'bg-violet-500',          label: 'Needs Signature' },
    completed:        { bg: 'bg-status-ok-bg text-status-ok',                                          dot: 'bg-status-ok',           label: 'Completed' },
    overdue:          { bg: 'bg-status-error-bg text-status-error',                                    dot: 'bg-status-error',        label: 'Overdue' },
  }
  const s = map[status] ?? { bg: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground/60', label: status }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.bg}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

interface StatCardProps {
  label: string
  value: number
  iconClass: string
  Icon: LucideIcon
  variant?: 'default' | 'warning' | 'danger'
}

function StatCard({ label, value, iconClass, Icon, variant = 'default' }: StatCardProps) {
  const isAlert = variant !== 'default' && value > 0
  return (
    <div
      className={`relative overflow-hidden rounded-xl border bg-card p-5 shadow-xs ${
        isAlert
          ? variant === 'danger' ? 'border-status-error/30' : 'border-status-warn/30'
          : 'border-border'
      }`}
    >
      {isAlert && (
        <div
          className={`absolute inset-y-0 left-0 w-[3px] rounded-l-xl ${
            variant === 'danger' ? 'bg-status-error' : 'bg-status-warn'
          }`}
        />
      )}
      <div className="mb-3 flex items-start justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconClass}`}>
          <Icon className="h-[15px] w-[15px]" />
        </div>
        {isAlert && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              variant === 'danger'
                ? 'bg-status-error-bg text-status-error'
                : 'bg-status-warn-bg text-status-warn'
            }`}
          >
            {variant === 'danger' ? 'Critical' : 'Alert'}
          </span>
        )}
      </div>
      <p className="text-[30px] font-bold leading-none tracking-tight text-foreground">{value}</p>
      <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
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
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Operational Overview · {headerDate}
          </p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">
            Welcome back, {user.fullName.split(' ')[0]}.
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {totalAlerts > 0
              ? `${totalAlerts} item${totalAlerts !== 1 ? 's' : ''} across your organization need${totalAlerts === 1 ? 's' : ''} attention.`
              : 'All compliance items are on track across your organization.'}
          </p>
        </div>
        <Link
          href="/clients/new"
          className="flex items-center gap-2 rounded-lg bg-gradient-to-br from-brand-from to-brand-to px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
        >
          <Plus className="h-[13px] w-[13px]" strokeWidth={2.5} />
          New Client
        </Link>
      </div>

      <MorningBriefingCard />

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-6">
        <StatCard
          label="Active Clients"
          value={activeClients ?? 0}
          iconClass="bg-accent text-accent-foreground"
          Icon={Users}
        />
        <StatCard
          label="In Progress"
          value={inProgress ?? 0}
          iconClass="bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"
          Icon={ClipboardList}
        />
        <StatCard
          label="Overdue"
          value={overdue ?? 0}
          iconClass="bg-status-error-bg text-status-error"
          Icon={Clock}
          variant={overdue > 0 ? 'danger' : 'default'}
        />
        <StatCard
          label="Signature Alerts"
          value={signatureIssues}
          iconClass="bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300"
          Icon={FilePen}
          variant={signatureIssues > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label="Open Incidents"
          value={openIncidents ?? 0}
          iconClass="bg-status-error-bg text-status-error"
          Icon={ShieldAlert}
          variant={(openIncidents ?? 0) > 0 ? 'danger' : 'default'}
        />
        <StatCard
          label="Training Alerts"
          value={trainingAlerts ?? 0}
          iconClass="bg-status-warn-bg text-status-warn"
          Icon={GraduationCap}
          variant={(trainingAlerts ?? 0) > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Main grid */}
      <div className="mb-6 overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Compliance Scorecards</p>
            <h2 className="mt-0.5 text-[13px] font-bold text-foreground">Per-Client Health</h2>
          </div>
          <Link href="/packets" className="text-[12px] font-medium text-primary transition-opacity hover:opacity-80">View all →</Link>
        </div>
        <div className="overflow-x-auto">
          {scorecards.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-[13px] text-muted-foreground">No clients with compliance data yet.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  {['Client', 'Program', 'Packets', 'Health Score', 'Status'].map((h) => (
                    <th key={h} className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {scorecards.slice(0, 8).map((card) => (
                  <tr key={card.clientId} className="transition-colors hover:bg-muted/40">
                    <td className="px-5 py-3">
                      <Link href={`/clients/${card.clientId}`} className="text-[13px] font-semibold text-foreground hover:text-primary">
                        {card.clientName}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-[12px] capitalize text-muted-foreground">{card.program}</td>
                    <td className="px-5 py-3">
                      <span className="text-[12px] font-medium text-foreground">{card.completedPackets}/{card.totalPackets}</span>
                      {card.overduePackets > 0 && <span className="ml-1.5 text-[11px] text-status-error">({card.overduePackets} overdue)</span>}
                    </td>
                    <td className="px-5 py-3">
                      <ScorecardBadge score={card.packetScore} health={card.overallHealth} size="sm" />
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                        card.status === 'active' ? 'bg-status-ok-bg text-status-ok' : 'bg-muted text-muted-foreground'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${card.status === 'active' ? 'bg-status-ok' : 'bg-muted-foreground/60'}`} />
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
        <div className="lg:col-span-2 overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Active Pipeline</p>
              <h2 className="mt-0.5 text-[13px] font-bold text-foreground">Open & Recent Packets</h2>
            </div>
            <Link href="/packets" className="text-[12px] font-medium text-primary transition-opacity hover:opacity-80">
              View all →
            </Link>
          </div>

          {!recentAssignments || recentAssignments.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-accent">
                <ClipboardList className="h-4 w-4 text-accent-foreground" />
              </div>
              <p className="text-[13px] font-semibold text-foreground">No open packets</p>
              <p className="mt-1 text-[12px] text-muted-foreground">Create a client to generate intake packets.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {['Client', 'Packet', 'Program', 'Due', 'Status'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {recentAssignments.map((a: Record<string, unknown>) => {
                  const client = a.clients as { legal_name: string; program: string } | null
                  return (
                    <tr key={a.id as string} className="transition-colors hover:bg-muted/40">
                      <td className="px-5 py-3.5 text-[13px] font-medium text-foreground">
                        {client?.legal_name ?? '—'}
                      </td>
                      <td className="px-5 py-3.5 text-[12px] capitalize text-muted-foreground">
                        {String(a.packet_type ?? '').replaceAll('_', ' ')}
                      </td>
                      <td className="px-5 py-3.5 text-[12px] text-muted-foreground">{client?.program ?? '—'}</td>
                      <td className="px-5 py-3.5 text-[12px] tabular-nums text-muted-foreground">{a.due_date as string}</td>
                      <td className="px-5 py-3.5"><StatusBadge status={a.status as string} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Compliance risk queue */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Risk Queue</p>
              <h2 className="mt-0.5 text-[13px] font-bold text-foreground">Compliance Alerts</h2>
            </div>
            {alertAssignments.length > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-status-error text-[10px] font-bold text-white">
                {alertAssignments.length}
              </span>
            )}
          </div>

          {alertAssignments.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-status-ok-bg">
                <Check className="h-4 w-4 text-status-ok" strokeWidth={2.5} />
              </div>
              <p className="text-[13px] font-semibold text-foreground">All clear</p>
              <p className="mt-1 text-[11px] text-muted-foreground">No compliance alerts at this time.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {alertAssignments.map(({ packet: a, compliance }) => {
                const client = a.clients as { legal_name: string; program: string } | null
                const isOverdue = compliance.level === 'overdue'
                const isDueToday = compliance.level === 'due_today'
                const barClass = isOverdue ? 'bg-status-error' : isDueToday ? 'bg-status-warn' : 'bg-blue-500'
                const chipClass = isOverdue
                  ? 'bg-status-error-bg text-status-error'
                  : isDueToday
                    ? 'bg-status-warn-bg text-status-warn'
                    : 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
                return (
                  <div key={a.id as string} className="relative py-3.5 pl-8 pr-5">
                    <div
                      className={`absolute left-5 rounded-full ${barClass}`}
                      style={{ top: '12px', bottom: '12px', width: '2px' }}
                    />
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <span className={`mb-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] ${chipClass}`}>
                          {compliance.label}
                        </span>
                        <p className="truncate text-[13px] font-semibold leading-snug text-foreground">
                          {client?.legal_name ?? '—'}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {String(a.packet_type ?? '').replaceAll('_', ' ')} · {client?.program ?? ''}
                        </p>
                      </div>
                      <p className="mt-5 shrink-0 text-[11px] tabular-nums text-muted-foreground">{a.due_date as string}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="border-t border-border/60 px-5 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/60">
              {alertAssignments.length > 0 ? `${alertAssignments.length} item${alertAssignments.length !== 1 ? 's' : ''} need attention` : 'No pending items'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
