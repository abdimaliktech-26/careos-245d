import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const { user, error } = await getSession()
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()
  const { error: updateErr } = await supabase
    .from('organizations')
    .update({ onboarding_completed: true })
    .eq('id', user.organizationId)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
