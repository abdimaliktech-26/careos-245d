import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { SuperAdminSidebar } from '@/components/super-admin/sidebar'
import { SessionGuard } from '@/components/session-guard'
import { ImpersonationBanner } from '@/components/super-admin/impersonation-banner'

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, error } = await getSession()
  if (error || !user || user.role !== 'super_admin') {
    redirect('/auth/login')
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {user.impersonating && (
        <ImpersonationBanner orgName={user.impersonating.orgName} expiresAt={user.impersonating.expiresAt} />
      )}
      <div className="flex flex-1 overflow-hidden">
      <SuperAdminSidebar user={user} />
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto">
          {children}
      <SessionGuard />
        </div>
      </main>
      </div>
    </div>
  )
}
