import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { GEOFENCE_RADIUS_M } from '@/lib/evv/compliance'
import { EvvLiveBoard } from '@/components/evv/evv-live-board'
import type { LiveVisit } from '@/components/evv/evv-live-map'

export const dynamic = 'force-dynamic'

const STAFF_ROLES = ['staff', 'program_manager', 'org_admin', 'super_admin']

type VisitRow = {
  id: string
  service_name: string | null
  clients: { legal_name: string | null; geo_lat: number | null; geo_lng: number | null } | null
  staff_profiles: { full_name: string | null } | null
}

type PingRow = { visit_id: string; lat: number; lng: number; recorded_at: string }

export default async function EvvLivePage() {
  const { user, error } = await getSession()
  if (error || !user || !user.organizationId) redirect('/auth/login')
  if (!STAFF_ROLES.includes(user.role)) redirect('/dashboard')

  const supabase = await createClient()

  const { data: visitData } = await supabase
    .from('evv_visits')
    .select('id, service_name, clients(legal_name, geo_lat, geo_lng), staff_profiles(full_name)')
    .eq('organization_id', user.organizationId)
    .eq('status', 'in_progress')

  const visits = (visitData ?? []) as unknown as VisitRow[]

  // Latest ping per active visit (seed positions before realtime takes over).
  const latestByVisit = new Map<string, PingRow>()
  if (visits.length > 0) {
    const { data: pingData } = await supabase
      .from('evv_location_pings')
      .select('visit_id, lat, lng, recorded_at')
      .in('visit_id', visits.map((v) => v.id))
      .order('recorded_at', { ascending: false })
      .limit(500)

    for (const ping of (pingData ?? []) as PingRow[]) {
      if (!latestByVisit.has(ping.visit_id)) latestByVisit.set(ping.visit_id, ping)
    }
  }

  const initialVisits: LiveVisit[] = visits.map((v) => {
    const latest = latestByVisit.get(v.id)
    const home =
      v.clients?.geo_lat != null && v.clients?.geo_lng != null
        ? { lat: v.clients.geo_lat, lng: v.clients.geo_lng }
        : null
    return {
      visitId: v.id,
      clientName: v.clients?.legal_name ?? 'Client',
      staffName: v.staff_profiles?.full_name ?? 'Caregiver',
      clientHome: home,
      geofenceRadiusM: GEOFENCE_RADIUS_M,
      latest: latest ? { lat: latest.lat, lng: latest.lng, recordedAt: latest.recorded_at } : null,
    }
  })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">EVV · Live Map</p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">Caregivers on Active Visits</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Live GPS while visits are in progress. Locations stop the moment a caregiver checks out.
          </p>
        </div>
        <Link href="/evv" className="text-[12px] font-medium text-primary hover:opacity-80 transition-opacity">
          ← Back to EVV
        </Link>
      </div>

      <EvvLiveBoard orgId={user.organizationId} initialVisits={initialVisits} />
    </div>
  )
}
