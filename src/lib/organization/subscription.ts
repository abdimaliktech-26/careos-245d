type OrganizationSubscription = {
  plan: string | null
  plan_expires_at: string | null
}

export type SubscriptionState = {
  plan: string
  label: string
  isActive: boolean
  expiresAt: string | null
  statusText: string
}

const PLAN_LABELS: Record<string, string> = {
  trial: 'Trial',
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
}

export function getSubscriptionState(organization: OrganizationSubscription | null): SubscriptionState {
  const plan = organization?.plan ?? 'trial'
  const expiresAt = organization?.plan_expires_at ?? null
  const expiresTime = expiresAt ? new Date(expiresAt).getTime() : null
  const hasValidExpiry = expiresTime === null || expiresTime >= Date.now()
  const isActive = plan !== 'expired' && hasValidExpiry

  return {
    plan,
    label: PLAN_LABELS[plan] ?? plan,
    isActive,
    expiresAt,
    statusText: isActive ? 'Active' : 'Expired',
  }
}
