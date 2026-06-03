import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, error } = await getSession()

  if (error || !user || user.role !== 'staff') {
    redirect('/auth/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-teal-700 text-white px-6 py-3 flex items-center justify-between">
        <span className="font-bold text-lg">CareIntake</span>
        <span className="text-sm text-teal-200">
          {user.firstName} {user.lastName}
        </span>
        <form action="/auth/logout" method="POST">
          <button type="submit" className="text-sm text-teal-200 hover:text-white">
            Sign out
          </button>
        </form>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  )
}
