import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import { getCarryForwardSuggestions } from '@/lib/forms/auto-fill-memory'

export async function GET(request: NextRequest) {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const clientId = searchParams.get('clientId')
  const templateCode = searchParams.get('templateCode')
  const fieldKeys = searchParams.get('fieldKeys')?.split(',').filter(Boolean) ?? []

  if (!clientId || !templateCode || fieldKeys.length === 0) {
    return NextResponse.json({ error: 'clientId, templateCode, and fieldKeys required' }, { status: 400 })
  }

  const suggestions = await getCarryForwardSuggestions(clientId, templateCode, fieldKeys)
  return NextResponse.json({ suggestions })
}
