import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import ClientSidebar from './_components/client-sidebar'

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, error } = await getSession()

  if (error || !user || user.role !== 'external_signer') {
    redirect('/auth/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F0F4FF]">
      <ClientSidebar user={user} />
      <main className="flex-1 overflow-y-auto bg-[#F0F4FF]">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
