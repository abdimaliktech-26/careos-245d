import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/get-session'

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const { user, error } = await getSession()
  if (error || !user) redirect('/auth/login')

  const supabase = await createClient()
  const { data: org } = await supabase
    .from('organizations')
    .select('onboarding_completed')
    .eq('id', user.organizationId)
    .single()

  if (org?.onboarding_completed) redirect('/dashboard')

  return <>{children}</>
}
