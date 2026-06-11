import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { createClient as createServerClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/sidebar'
import MobileSidebar from '@/components/layout/mobile-sidebar'
import { AppHeader } from '@/components/layout/app-header'
import CareAssistChat from '@/components/chat/CareAssistChat'
import { SessionGuard } from '@/components/session-guard'
import { RealtimeProvider } from '@/components/layout/realtime-provider'
import { ComplianceAlertBanner } from '@/components/compliance/alert-banner'
import { SubscriptionBanner } from '@/components/compliance/subscription-banner'
import type { OrgBranding } from '@/types/app'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, error } = await getSession()
  if (error || !user) redirect('/auth/login')

  let branding: OrgBranding | null = null
  if (user.organizationId) {
    const supabase = await createServerClient()
    const { data: org } = await supabase
      .from('organizations')
      .select('name, logo_url, brand_primary, brand_accent')
      .eq('id', user.organizationId)
      .single()
    if (org) {
      branding = {
        name: org.name,
        logo_url: org.logo_url,
        brand_primary: org.brand_primary ?? '#E8799E',
        brand_accent: org.brand_accent ?? '#C8A8E8',
      }
    }
  }

  const brandPrimary = branding?.brand_primary ?? '#E8799E'
  const brandAccent = branding?.brand_accent ?? '#C8A8E8'

  return (
    <RealtimeProvider user={user}>
      <div
        className="flex h-screen overflow-hidden bg-background"
        style={{
          '--brand-primary': brandPrimary,
          '--brand-accent': brandAccent,
        } as React.CSSProperties}
      >
        <MobileSidebar branding={branding}>
          <Sidebar user={user} branding={branding} />
        </MobileSidebar>
        <div className="flex flex-1 flex-col overflow-hidden">
          <AppHeader />
          <main className="flex-1 overflow-y-auto bg-background">
            <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
              <SubscriptionBanner />
              <ComplianceAlertBanner />
              {children}
            </div>
          </main>
        </div>
        <SessionGuard />
        <CareAssistChat />
      </div>
    </RealtimeProvider>
  )
}
