import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { createClient as createServerClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/sidebar'
import MobileSidebar from '@/components/layout/mobile-sidebar'
import { AppHeader } from '@/components/layout/app-header'
import { CommandPalette } from '@/components/layout/command-palette'
import CareAssistChat from '@/components/chat/CareAssistChat'
import { SessionGuard } from '@/components/session-guard'
import { ImpersonationBanner } from '@/components/super-admin/impersonation-banner'
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
        brand_primary: org.brand_primary ?? '#DB2777',
        brand_accent: org.brand_accent ?? '#A78BFA',
      }
    }
  }

  const brandPrimary = branding?.brand_primary ?? '#DB2777'
  const brandAccent = branding?.brand_accent ?? '#A78BFA'

  return (
    <RealtimeProvider user={user}>
      <div
        className="flex h-screen flex-col overflow-hidden bg-background"
        style={{
          '--brand-primary': brandPrimary,
          '--brand-accent': brandAccent,
        } as React.CSSProperties}
      >
        {user.impersonating && (
          <ImpersonationBanner orgName={user.impersonating.orgName} expiresAt={user.impersonating.expiresAt} />
        )}
        <div className="flex flex-1 overflow-hidden">
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
        <CommandPalette role={user.role} />
        <CareAssistChat />
        </div>
      </div>
    </RealtimeProvider>
  )
}
