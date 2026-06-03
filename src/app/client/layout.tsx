import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, error } = await getSession()

  if (error || !user || user.role !== 'client') {
    redirect('/auth/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-3 flex justify-between items-center">
        <span className="font-bold text-lg text-gray-900">CareIntake</span>
        <form action="/auth/logout" method="POST">
          <button type="submit" className="text-sm text-gray-500 hover:text-gray-900">
            Sign out
          </button>
        </form>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  )
}
