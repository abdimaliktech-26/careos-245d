import { NextResponse } from 'next/server'
import { stripe as getStripe, setStripeCustomerId } from '@/lib/billing/stripe'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { orgId, plan, successUrl, cancelUrl } = body

    if (!orgId || !plan) {
      return NextResponse.json({ error: 'Missing orgId or plan' }, { status: 400 })
    }

    if (!['starter', 'pro', 'enterprise'].includes(plan)) {
      return NextResponse.json({ error: `Invalid plan: ${plan}` }, { status: 400 })
    }

    const admin = createAdminClient()

    // Read price ID from platform_settings, fall back to env var
    const { data: priceSetting } = await admin
      .from('platform_settings')
      .select('value')
      .eq('key', `stripe_${plan}_price_id`)
      .maybeSingle()

    const priceId = priceSetting?.value || process.env[`STRIPE_${plan.toUpperCase()}_PRICE_ID`]
    if (!priceId) {
      return NextResponse.json({ error: `No Stripe price ID configured for ${plan}. Set it in Super Admin → Settings.` }, { status: 400 })
    }

    const { data: org } = await admin
      .from('organizations')
      .select('id, name, email, stripe_customer_id')
      .eq('id', orgId)
      .single()

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    let customerId = org.stripe_customer_id

    if (!customerId) {
      const customer = await getStripe().customers.create({
        name: org.name,
        email: org.email ?? undefined,
        metadata: { orgId },
      })
      customerId = customer.id
      await setStripeCustomerId(orgId, customerId)
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl || `${baseUrl}/super-admin/organizations/${orgId}?checkout=success`,
      cancel_url: cancelUrl || `${baseUrl}/super-admin/organizations/${orgId}?checkout=cancelled`,
      metadata: { orgId, plan },
      subscription_data: {
        metadata: { orgId, plan },
      },
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Checkout failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
