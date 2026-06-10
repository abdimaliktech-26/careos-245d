import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { user, error } = await getSession()
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()
  const now = new Date()

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
    .select('id, status')
    .eq('organization_id', user.organizationId)

  const totalPackets = packets?.length ?? 0
  const completedPackets = packets?.filter(p => p.status === 'completed').length ?? 0
  const packetIds = packets?.map(p => p.id) ?? []

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  let formsCompletedThisMonth = 0
  if (packetIds.length > 0) {
    const { count } = await supabase
      .from('packet_forms')
      .select('*', { count: 'exact', head: true })
      .in('packet_id', packetIds)
      .eq('status', 'completed')
      .gte('submitted_at', monthStart)
    formsCompletedThisMonth = count ?? 0
  }

  const { count: incidentsOpen } = await supabase
    .from('incidents')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', user.organizationId)
    .neq('status', 'closed')

  const { count: incidentsClosed } = await supabase
    .from('incidents')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', user.organizationId)
    .eq('status', 'closed')

  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay() + 1)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  const { count: evvVisitsThisWeek } = await supabase
    .from('evv_visits')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', user.organizationId)
    .gte('service_date', weekStart.toISOString().split('T')[0])
    .lte('service_date', weekEnd.toISOString().split('T')[0])

  const formsByMonth: Array<{ month: string; count: number }> = []
  let allCompletedForms: Array<{ submitted_at: string | null }> = []
  if (packetIds.length > 0) {
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const { data } = await supabase
      .from('packet_forms')
      .select('submitted_at')
      .in('packet_id', packetIds)
      .eq('status', 'completed')
      .gte('submitted_at', sixMonthsAgo.toISOString())
    allCompletedForms = data ?? []
  }

  for (let i = 5; i >= 0; i--) {
    const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
    const count = allCompletedForms.filter(f =>
      f.submitted_at && new Date(f.submitted_at) >= mStart && new Date(f.submitted_at) <= mEnd
    ).length
    formsByMonth.push({
      month: mStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      count,
    })
  }

  const packetStatusBreakdown = [
    { name: 'Completed', value: packets?.filter(p => p.status === 'completed').length ?? 0, color: '#10B981' },
    { name: 'In Progress', value: packets?.filter(p => p.status === 'in_progress').length ?? 0, color: '#E8799E' },
    { name: 'Needs Signature', value: packets?.filter(p => p.status === 'needs_signature').length ?? 0, color: '#F59E0B' },
    { name: 'Overdue', value: packets?.filter(p => p.status === 'overdue').length ?? 0, color: '#EF4444' },
    { name: 'Not Started', value: packets?.filter(p => p.status === 'not_started').length ?? 0, color: '#94A3B8' },
  ]

  const today = now.toISOString().split('T')[0]
  const thirtyDaysOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data: upcomingReviews } = await supabase
    .from('packets')
    .select('id, due_date, client_id, packet_type, status')
    .eq('organization_id', user.organizationId)
    .gte('due_date', today)
    .lte('due_date', thirtyDaysOut)
    .neq('status', 'completed')
    .order('due_date', { ascending: true })
    .limit(5)

  let upcomingReviewsWithClients: Array<Record<string, unknown>> = upcomingReviews ?? []
  if (upcomingReviews && upcomingReviews.length > 0) {
    const clientIds = upcomingReviews.map(r => r.client_id)
    const { data: clients } = await supabase
      .from('clients')
      .select('id, legal_name')
      .in('id', clientIds)
    const clientMap = new Map(clients?.map(c => [c.id, c.legal_name]) ?? [])
    upcomingReviewsWithClients = upcomingReviews.map(r => ({
      ...r,
      client_name: clientMap.get(r.client_id) ?? 'Unknown',
    }))
  }

  return NextResponse.json({
    activeClients: activeClients ?? 0,
    activeStaff: activeStaff ?? 0,
    totalPackets,
    completedPackets,
    completionRate: totalPackets > 0 ? Math.round((completedPackets / totalPackets) * 100) : 0,
    formsCompletedThisMonth,
    incidentsOpen: incidentsOpen ?? 0,
    incidentsClosed: incidentsClosed ?? 0,
    evvVisitsThisWeek: evvVisitsThisWeek ?? 0,
    upcomingReviews: upcomingReviewsWithClients,
    formsByMonth,
    packetStatusBreakdown,
  })
}
