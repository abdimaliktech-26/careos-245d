import { createClient } from '@/lib/supabase/server'
import type { UserProfile } from '@/types/app'

type SessionResult =
  | { user: UserProfile; error: null }
  | { user: null; error: string }

export async function getSession(): Promise<SessionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { user: null, error: 'Not authenticated' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('organization_members')
    .select('id, organization_id, user_id, role, full_name, email, is_active')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (profile) {
    return {
      user: {
        id: profile.user_id,
        organizationId: profile.organization_id,
        role: profile.role,
        fullName: profile.full_name ?? user.email ?? 'User',
        email: profile.email ?? user.email ?? '',
        isActive: profile.is_active,
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
}
