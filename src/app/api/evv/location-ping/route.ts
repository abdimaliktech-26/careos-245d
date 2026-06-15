import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// One active-visit GPS breadcrumb. Coordinates are validated to real ranges so
// a malformed client can't poison the map.
const pingSchema = z.object({
  visitId: z.string().uuid(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(100000).optional(),
})

export async function POST(request: NextRequest) {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = pingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid ping.' }, { status: 400 })
  }

  const supabase = await createClient()

  // The visit must belong to this org, be active, and be assigned to a
  // caregiver. RLS enforces that the caller IS that caregiver on INSERT — this
  // load just lets us fail fast with a clear status and capture staff_id.
  const { data: visit, error: visitError } = await supabase
    .from('evv_visits')
    .select('id, status, staff_id, organization_id')
    .eq('id', parsed.data.visitId)
    .eq('organization_id', user.organizationId)
    .single()

  if (visitError || !visit) {
    return NextResponse.json({ error: 'Visit not found.' }, { status: 404 })
  }
  if (visit.status !== 'in_progress') {
    // Not active → tracking must not be happening. Tell the client to stop.
    return NextResponse.json({ error: 'Visit is not active.', stop: true }, { status: 409 })
  }

  const { error: insertError } = await supabase.from('evv_location_pings').insert({
    organization_id: user.organizationId,
    visit_id: visit.id,
    staff_id: visit.staff_id,
    lat: parsed.data.lat,
    lng: parsed.data.lng,
    accuracy: parsed.data.accuracy ?? null,
  })

  if (insertError) {
    // RLS rejection = caller is not the assigned caregiver → forbidden.
    return NextResponse.json({ error: 'Not permitted to track this visit.', stop: true }, { status: 403 })
  }

  return NextResponse.json({ ok: true })
}
