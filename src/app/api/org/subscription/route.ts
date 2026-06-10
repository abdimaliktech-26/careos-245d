import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function GET() {
  const { user, error } = await getSession()
  if (error || !user || !user.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServerClient()
  const { data } = await supabase
    .from('organizations')
    .select('plan, plan_expires_at')
    .eq('id', user.organizationId)
    .single()

  if (!data?.plan_expires_at) {
    return NextResponse.json({ plan: data?.plan ?? null, expiresAt: null })
  }

  return NextResponse.json({
    plan: data.plan,
    expiresAt: data.plan_expires_at,
  })
}
