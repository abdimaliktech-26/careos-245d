import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const { user, error } = await getSession()
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()
  const now = new Date()

  const { data: packets } = await supabase
    .from('packets')
    .select('id, status, completed_date, created_at')
    .eq('organization_id', user.organizationId)

  const complianceTrend: Array<{ label: string; score: number; total: number; completed: number }> = []
  for (let i = 11; i >= 0; i--) {
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)

    const totalBefore = packets?.filter(p => new Date(p.created_at) <= monthEnd).length ?? 0
    const completedBefore = packets?.filter(p =>
      p.status === 'completed' && p.completed_date && new Date(p.completed_date) <= monthEnd
    ).length ?? 0

    complianceTrend.push({
      label: monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      score: totalBefore > 0 ? Math.round((completedBefore / totalBefore) * 100) : 0,
      total: totalBefore,
      completed: completedBefore,
    })
  }

  const totalPackets = packets?.length ?? 0
  const completedPackets = packets?.filter(p => p.status === 'completed').length ?? 0

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

  const { count: openIncidents } = await supabase
    .from('incidents')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', user.organizationId)
    .neq('status', 'closed')

  return NextResponse.json({
    complianceTrend,
    totalPackets,
    completedPackets,
    completionRate: totalPackets > 0 ? Math.round((completedPackets / totalPackets) * 100) : 0,
    activeClients: activeClients ?? 0,
    activeStaff: activeStaff ?? 0,
    openIncidents: openIncidents ?? 0,
  })
}
