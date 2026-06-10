import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const { action, plan, planExpiresAt, subscriptionPrice } = body

  const admin = createAdminClient()

  if (action) {
    const statusMap: Record<string, string> = {
      activate: 'active',
      suspend: 'suspended',
      pending: 'pending',
    }

    const newStatus = statusMap[action]
    if (!newStatus && action !== 'delete') {
      return NextResponse.json({ error: 'Invalid action. Use: activate, suspend, pending, or delete.' }, { status: 400 })
    }

    if (action === 'delete') {
      const { error } = await admin.from('organizations').delete().eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    const { error } = await admin
      .from('organizations')
      .update({ status: newStatus })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, status: newStatus })
  }

  if (plan !== undefined || planExpiresAt !== undefined || subscriptionPrice !== undefined) {
    const updates: Record<string, unknown> = {}
    if (plan !== undefined) updates.plan = plan
    if (planExpiresAt !== undefined) updates.plan_expires_at = planExpiresAt || null
    if (subscriptionPrice !== undefined) updates.subscription_price = subscriptionPrice

    const { error } = await admin
      .from('organizations')
      .update(updates)
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'No action or fields provided.' }, { status: 400 })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const admin = createAdminClient()

  const { error } = await admin
    .from('organizations')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
