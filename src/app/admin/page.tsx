import Link from 'next/link'
import { listStaff } from '@/lib/staff-admin/actions'
import { getSession } from '@/lib/auth/get-session'
import { redirect } from 'next/navigation'

export default async function AdminDashboard() {
  const { user, error } = await getSession()
  if (error || !user) redirect('/auth/login')

  const { data: staff } = await listStaff()
  const activeStaff = staff?.filter((s) => s.is_active).length ?? 0
  const totalStaff = staff?.length ?? 0

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage your organization</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <p className="text-sm text-gray-500">Active Staff</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{activeStaff}</p>
          <p className="text-xs text-gray-400 mt-0.5">of {totalStaff} total</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <p className="text-sm text-gray-500">Subscription</p>
          <p className="text-lg font-semibold text-gray-900 mt-1">Starter</p>
          <p className="text-xs text-gray-400 mt-0.5">Billing in Plan 5</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-800">Staff</h2>
        <Link href="/admin/staff" className="text-sm text-blue-600 hover:underline">
          Manage staff →
        </Link>
      </div>

      <div className="grid gap-2">
        {staff?.slice(0, 5).map((s) => (
          <div key={s.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex justify-between items-center">
            <div>
              <p className="font-medium text-gray-900 text-sm">{s.first_name} {s.last_name}</p>
              <p className="text-xs text-gray-500">{s.email}</p>
            </div>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {s.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
