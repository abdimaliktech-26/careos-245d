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
    .from('users')
    .select('id, tenant_id, role, first_name, last_name, email, phone, is_active')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return { user: null, error: 'Profile not found' }
  }

  if (!profile.is_active) {
    return { user: null, error: 'Account deactivated' }
  }

  return {
    user: {
      id: profile.id,
      tenantId: profile.tenant_id,
      role: profile.role,
      firstName: profile.first_name,
      lastName: profile.last_name,
      email: profile.email,
      phone: profile.phone,
      isActive: profile.is_active,
    },
    error: null,
  }
}
