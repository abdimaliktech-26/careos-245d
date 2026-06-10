import type Stripe from 'stripe'

let _stripe: Stripe | null = null

function getStripe(): Stripe {
  if (!_stripe) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const StripeSDK = require('stripe')
    _stripe = new StripeSDK(process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder', {
      apiVersion: '2026-05-27.dahlia',
    })
  }
  return _stripe!
}

export { getStripe as stripe }

export const STRIPE_PLANS = {
  starter: {
    name: 'Starter',
    priceId: process.env.STRIPE_STARTER_PRICE_ID ?? '',
    amount: 9900,
  },
  pro: {
    name: 'Pro',
    priceId: process.env.STRIPE_PRO_PRICE_ID ?? '',
    amount: 24900,
  },
  enterprise: {
    name: 'Enterprise',
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID ?? '',
    amount: 49900,
  },
} as const

export type StripePlan = keyof typeof STRIPE_PLANS

export async function getStripeCustomerId(orgId: string): Promise<string | null> {
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()
  const { data } = await admin
    .from('organizations')
    .select('stripe_customer_id')
    .eq('id', orgId)
    .maybeSingle()

  return data?.stripe_customer_id ?? null
}

export async function setStripeCustomerId(orgId: string, customerId: string): Promise<void> {
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()
  await admin
    .from('organizations')
    .update({ stripe_customer_id: customerId })
    .eq('id', orgId)
}

export async function syncSubscriptionFromStripe(
  orgId: string,
  plan: string,
  status: string,
  currentPeriodEnd: number
): Promise<void> {
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()

  const dbPlan = status === 'active' || status === 'trialing' ? plan : 'expired'

  await admin
    .from('organizations')
    .update({
      plan: dbPlan,
      plan_expires_at: new Date(currentPeriodEnd * 1000).toISOString(),
      stripe_subscription_status: status,
    })
    .eq('id', orgId)
}
