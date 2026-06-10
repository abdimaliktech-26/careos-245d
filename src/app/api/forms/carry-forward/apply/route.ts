import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import { applyCarryForward } from '@/lib/forms/auto-fill-memory'
import type { CarryForwardSuggestion } from '@/lib/forms/auto-fill-memory'

export async function POST(request: NextRequest) {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { packetFormId, suggestions } = body as {
    packetFormId: string
    suggestions: CarryForwardSuggestion[]
  }

  if (!packetFormId || !suggestions || suggestions.length === 0) {
    return NextResponse.json({ error: 'packetFormId and suggestions required' }, { status: 400 })
  }

  const ok = await applyCarryForward(packetFormId, suggestions)
  return NextResponse.json({ ok })
}
