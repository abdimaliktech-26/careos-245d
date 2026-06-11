import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { ComplianceTrendChart } from '@/components/analytics/compliance-chart'
import { AnalyticsStatCard } from '@/components/analytics/stat-card'
import { OverviewCharts } from '@/components/analytics/overview-charts'
import { DashboardHeader } from '@/components/analytics/dashboard-header'
import { ExportButton } from '@/components/analytics/export-button'

function DeltaBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return null
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct === 0) return <span className="text-xs text-muted-foreground ml-1">(same)</span>
  return (
    <span className={`text-xs ml-1 ${pct > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
      {pct > 0 ? '↑' : '↓'} {Math.abs(pct)}%
    </span>
  )
}

const now = Date.now()

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const { user, error } = await getSession()
  if (error || !user) redirect('/auth/login')

  const supabase = await createClient()
  const { range } = await searchParams
  const days = range ? parseInt(range) : 30

  const prevStart = new Date()
  prevStart.setDate(prevStart.getDate() - days * 2)
  const prevEnd = new Date()
  prevEnd.setDate(prevEnd.getDate() - days)

  const periodStart = new Date()
  periodStart.setDate(periodStart.getDate() - days)

  const { count: activeClients } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', user.organizationId)
    .eq('status', 'active')

  const { count: activeStaff } = await supabase
    .from('staff_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', user.organizationId)
    .eq('is_active', true)

  const { data: packets } = await supabase
    .from('packets')
    .select('id, status, completed_date, created_at')
    .eq('organization_id', user.organizationId)

  const totalPackets = packets?.length ?? 0
  const completedPackets = packets?.filter(p => p.status === 'completed').length ?? 0
  const overduePackets = packets?.filter(p => p.status === 'overdue').length ?? 0
  const completionRate = totalPackets > 0 ? Math.round((completedPackets / totalPackets) * 100) : 0
  const packetIds = packets?.map(p => p.id) ?? []

  const prevCompletedPackets = packets?.filter(p => p.status === 'completed' && p.completed_date && new Date(p.completed_date) >= prevStart && new Date(p.completed_date) <= prevEnd).length ?? 0

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  let formsThisMonth = 0
  if (packetIds.length > 0) {
    const { count } = await supabase
      .from('packet_forms')
      .select('*', { count: 'exact', head: true })
      .in('packet_id', packetIds)
      .eq('status', 'completed')
      .gte('submitted_at', monthStart.toISOString())
    formsThisMonth = count ?? 0
  }

  const today = new Date().toISOString().split('T')[0]
  const thirtyDays = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data: upcomingReviews } = await supabase
    .from('packets')
    .select('id, due_date, client_id, packet_type, status')
    .eq('organization_id', user.organizationId)
    .gte('due_date', today)
    .lte('due_date', thirtyDays)
    .neq('status', 'completed')
    .order('due_date', { ascending: true })
    .limit(5)

  let upcomingReviewsWithNames: Array<{
    id: string
    due_date: string
    client_name: string
    packet_type: string
    status: string
  }> = []

  if (upcomingReviews && upcomingReviews.length > 0) {
    const clientIds = upcomingReviews.map(r => r.client_id)
    const { data: clients } = await supabase
      .from('clients')
      .select('id, legal_name')
      .in('id', clientIds)
    const clientMap = new Map(clients?.map(c => [c.id, c.legal_name]) ?? [])
    upcomingReviewsWithNames = upcomingReviews.map(r => ({
      id: r.id,
      due_date: r.due_date,
      client_name: clientMap.get(r.client_id) ?? 'Unknown',
      packet_type: r.packet_type,
      status: r.status,
    }))
  }

  let recentActivity: Array<{
    id: string
    client_name: string
    form_status: string
    submitted_at: string
  }> = []

  if (packetIds.length > 0) {
    const { data: recentForms } = await supabase
      .from('packet_forms')
      .select('id, status, submitted_at, packet_id')
      .in('packet_id', packetIds)
      .not('submitted_at', 'is', null)
      .order('submitted_at', { ascending: false })
      .limit(10)

    if (recentForms && recentForms.length > 0) {
      const distinctPacketIds = [...new Set(recentForms.map(f => f.packet_id))]
      const { data: recentPackets } = await supabase
        .from('packets')
        .select('id, client_id')
        .in('id', distinctPacketIds)

      const distinctClientIds = [...new Set(recentPackets?.map(p => p.client_id) ?? [])]
      const { data: recentClients } = await supabase
        .from('clients')
        .select('id, legal_name')
        .in('id', distinctClientIds)

      const packetClientMap = new Map(recentPackets?.map(p => [p.id, p.client_id]) ?? [])
      const clientNameMap = new Map(recentClients?.map(c => [c.id, c.legal_name]) ?? [])

      recentActivity = recentForms.map(f => ({
        id: f.id,
        client_name: clientNameMap.get(packetClientMap.get(f.packet_id) ?? '') ?? 'Unknown',
        form_status: f.status,
        submitted_at: f.submitted_at,
      }))
    }
  }

  const exportHeaders = [
    { key: 'client_name', label: 'Client' },
    { key: 'packet_type', label: 'Packet Type' },
    { key: 'due_date', label: 'Due Date' },
    { key: 'status', label: 'Status' },
  ]
  const exportData = upcomingReviewsWithNames.map(r => ({
    client_name: r.client_name,
    packet_type: r.packet_type,
    due_date: r.due_date,
    status: r.status,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <DashboardHeader range={range ?? '30'} />
        <ExportButton filename="analytics-export" data={exportData} headers={exportHeaders} />
      </div>

      <div className="grid grid-cols-6 gap-4">
        <Link href="/clients" className="block">
          <AnalyticsStatCard label="Active Clients" value={activeClients ?? 0} color="blue" />
        </Link>
        <Link href="/staff" className="block">
          <AnalyticsStatCard label="Active Staff" value={activeStaff ?? 0} />
        </Link>
        <Link href="/packets?status=completed" className="block">
          <AnalyticsStatCard label="Packets Done" value={completedPackets} color="emerald" />
        </Link>
        <Link href="/packets?status=overdue" className="block">
          <AnalyticsStatCard label="Overdue" value={overduePackets} color={overduePackets > 0 ? 'danger' : 'gray'} />
        </Link>
        <AnalyticsStatCard
          label={
            <span>
              Completion Rate
              <DeltaBadge current={completedPackets} previous={prevCompletedPackets} />
            </span>
          }
          value={`${completionRate}%`}
          color="blue"
        />
        <AnalyticsStatCard label="Forms This Month" value={formsThisMonth} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h2 className="text-sm font-bold text-foreground mb-4">Compliance Score Trends</h2>
        <ComplianceTrendChart range={days} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <OverviewCharts range={days} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border bg-card p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-foreground">Upcoming Reviews (30 days)</h2>
            <ExportButton filename="upcoming-reviews" data={exportData} headers={exportHeaders} />
          </div>
          {upcomingReviewsWithNames.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No upcoming reviews</p>
          ) : (
            <div className="divide-y divide-border/60">
              {upcomingReviewsWithNames.map(r => (
                <div key={r.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{r.client_name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      {r.packet_type.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-primary">
                      {new Date(r.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p className="text-[10px] text-muted-foreground capitalize">{r.status.replace(/_/g, ' ')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h2 className="text-sm font-bold text-foreground mb-4">Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No recent activity</p>
          ) : (
            <div className="divide-y divide-border/60">
              {recentActivity.map(a => (
                <div key={a.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{a.client_name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      {a.form_status.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(a.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
