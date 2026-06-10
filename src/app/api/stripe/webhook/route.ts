import { NextResponse } from 'next/server'
import { stripe as getStripe, syncSubscriptionFromStripe } from '@/lib/billing/stripe'
import { headers } from 'next/headers'
import type Stripe from 'stripe'

function getMeta(obj: unknown): Record<string, string> {
  return ((obj as Record<string, unknown>)?.metadata ?? {}) as Record<string, string>
}

function getStr(obj: unknown, key: string): string | undefined {
  return (obj as Record<string, unknown>)?.[key] as string | undefined
}

function getNum(obj: unknown, key: string): number | undefined {
  return (obj as Record<string, unknown>)?.[key] as number | undefined
}

export async function POST(request: Request) {
  const body = await request.text()
  const sig = (await headers()).get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Stripe webhook secret not configured' }, { status: 500 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook signature verification failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const obj = event.data.object as unknown

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const meta = getMeta(obj)
        const orgId = meta.orgId
        const plan = meta.plan ?? 'starter'
        if (orgId) {
          await syncSubscriptionFromStripe(
            orgId,
            plan,
            'active',
            Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
          )

          const { createAdminClient } = await import('@/lib/supabase/admin')
          const admin = createAdminClient()
          await admin
            .from('organizations')
            .update({ status: 'active' })
            .eq('id', orgId)
            .eq('status', 'pending')
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const subscriptionId = getStr(obj, 'subscription')
        if (subscriptionId) {
          const sub = await getStripe().subscriptions.retrieve(subscriptionId) as unknown as Record<string, unknown>
          const meta = getMeta(sub)
          const orgId = meta.orgId
          const periodEnd = getNum(sub, 'current_period_end')
          if (orgId && periodEnd) {
            await syncSubscriptionFromStripe(orgId, meta.plan ?? 'starter', getStr(sub, 'status') ?? 'active', periodEnd)
          }
        }
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const meta = getMeta(obj)
        const orgId = meta.orgId
        const periodEnd = getNum(obj, 'current_period_end')
        const status = getStr(obj, 'status')
        const isDeleted = event.type === 'customer.subscription.deleted'

        if (orgId) {
          await syncSubscriptionFromStripe(
            orgId,
            isDeleted ? 'expired' : (meta.plan ?? 'starter'),
            isDeleted ? 'canceled' : (status ?? 'active'),
            periodEnd ?? Math.floor(Date.now() / 1000)
          )
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook processing failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
