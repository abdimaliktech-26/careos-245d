import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import { dismissAlert } from '@/lib/audit/compliance-alerts'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const ok = await dismissAlert(id)
  return NextResponse.json({ ok })
}
