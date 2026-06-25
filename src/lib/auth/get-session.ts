import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { UserProfile } from '@/types/app'
import { getActiveImpersonation, type ActiveImpersonation } from '@/lib/super-admin/impersonation-read'

/** Pure: apply an active impersonation onto a profile (super_admin only path). */
export function applyImpersonation(profile: UserProfile, active: ActiveImpersonation | null): UserProfile {
  if (!active) return profile
  return { ...profile, organizationId: active.orgId, impersonating: active }
}

type SessionResult =
  | { user: UserProfile; error: null }
  | { user: null; error: string }

// Wrapped in React cache(): within a single server render, layout + page +
// nested components share ONE getUser + membership query instead of re-fetching.
export const getSession = cache(async (): Promise<SessionResult> => {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { user: null, error: 'Not authenticated' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('organization_members')
    .select('id, organization_id, user_id, role, full_name, email, is_active, organizations(name, logo_url, brand_primary, brand_accent)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (profile) {
    // Branding is joined here so the app layout doesn't fire a second query.
    // The embedded org comes back as an object (or array under some configs).
    const orgRow = Array.isArray(profile.organizations)
      ? profile.organizations[0]
      : profile.organizations
    const branding = orgRow
      ? {
          name: orgRow.name,
          logo_url: orgRow.logo_url,
          brand_primary: orgRow.brand_primary ?? '#10B99A',
          brand_accent: orgRow.brand_accent ?? '#001F5B',
        }
      : null

    const baseProfile: UserProfile = {
      id: profile.user_id,
      organizationId: profile.organization_id,
      role: profile.role,
      fullName: profile.full_name ?? user.email ?? 'User',
      email: profile.email ?? user.email ?? '',
      isActive: profile.is_active,
      branding,
    }
    const active = baseProfile.role === 'super_admin'
      ? await getActiveImpersonation(baseProfile.id)
      : null
    return { user: applyImpersonation(baseProfile, active), error: null }
  }

  // Pharmacy users live in pharmacy_users (not organization_members). They have
  // no provider org; access to provider data is gated by RLS via pharmacy links.
  const { data: pharmUser } = await supabase
    .from('pharmacy_users')
    .select('pharmacy_id, role, full_name, email')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (pharmUser) {
    return {
      user: {
        id: user.id,
        organizationId: null,
        pharmacyId: pharmUser.pharmacy_id,
        role: pharmUser.role,
        fullName: pharmUser.full_name ?? user.email ?? 'Pharmacy User',
        email: pharmUser.email ?? user.email ?? '',
        isActive: true,
      },
      error: null,
    }
  }

  // Fallback for external signers without an organization_members row.
  // Their role and org come from auth user_metadata (set during invite/creation).
  const metaRole = user.user_metadata?.role as string | undefined
  const metaOrgId = user.user_metadata?.organization_id as string | undefined

  if (metaRole === 'external_signer' && metaOrgId) {
    return {
      user: {
        id: user.id,
        organizationId: metaOrgId,
        role: 'external_signer',
        fullName: user.user_metadata?.full_name ?? user.email ?? 'Signer',
        email: user.email ?? '',
        isActive: true,
      },
      error: null,
    }
  }

  if (profileError) {
    return { user: null, error: 'Profile not found' }
  }

  return { user: null, error: 'Profile not found' }
})
