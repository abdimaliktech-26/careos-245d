import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'

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
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-gray-900 text-white px-6 py-3 flex justify-between items-center">
        <span className="font-bold text-lg">CareIntake — Super Admin</span>
        <form action="/auth/logout" method="POST">
          <button type="submit" className="text-sm text-gray-300 hover:text-white">
            Sign out
          </button>
        </form>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  )
}
