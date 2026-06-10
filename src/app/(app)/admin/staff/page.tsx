import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth/get-session'
import { listStaff, deactivateStaff, reactivateStaff } from '@/lib/staff-admin/actions'

async function handleDeactivate(staffId: string): Promise<void> {
  'use server'
  await deactivateStaff(staffId)
}

async function handleReactivate(staffId: string): Promise<void> {
  'use server'
  await reactivateStaff(staffId)
}

export default async function StaffListPage() {
  const { user, error } = await getSession()
  if (error || !user || !['org_admin', 'super_admin'].includes(user.role)) {
    redirect('/dashboard')
  }

  const { data: staff } = await listStaff()

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
        <Link
          href="/admin/staff/new"
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md"
        >
          + Add Staff
        </Link>
      </div>

      {error && (
        <p className="text-red-600 bg-red-50 border border-red-200 rounded p-3 mb-4 text-sm">{error}</p>
      )}

      <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
        {!staff || staff.length === 0 ? (
          <p className="p-6 text-center text-gray-500 text-sm">
            No staff yet.{' '}
            <Link href="/admin/staff/new" className="text-blue-600 hover:underline">
              Add your first staff member →
            </Link>
          </p>
        ) : (
          staff.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="font-medium text-gray-900">{s.full_name}</p>
                <p className="text-sm text-gray-500">{s.email}</p>
                {s.phone && <p className="text-xs text-gray-400">{s.phone}</p>}
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {s.is_active ? 'Active' : 'Inactive'}
                </span>
                {s.is_active ? (
                  <form action={handleDeactivate.bind(null, s.id)}>
                    <button type="submit" className="text-xs text-red-600 hover:underline">Deactivate</button>
                  </form>
                ) : (
                  <form action={handleReactivate.bind(null, s.id)}>
                    <button type="submit" className="text-xs text-blue-600 hover:underline">Reactivate</button>
                  </form>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
