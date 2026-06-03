import Link from 'next/link'
import { getClients } from '@/lib/clients/actions'
import { getSession } from '@/lib/auth/get-session'
import { redirect } from 'next/navigation'

export default async function StaffDashboard() {
  const { user, error } = await getSession()
  if (error || !user) redirect('/auth/login')

  const { data: clients } = await getClients()
  const activeCount = clients?.length ?? 0

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {user.firstName}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <Link
          href="/staff/clients/new"
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
        >
          + New Client
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <p className="text-sm text-gray-500">Active Clients</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{activeCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <p className="text-sm text-gray-500">Forms Due Soon</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">—</p>
          <p className="text-xs text-gray-400 mt-1">Available in Plan 5</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-800">My Clients</h2>
        <Link href="/staff/clients" className="text-sm text-blue-600 hover:underline">
          View all
        </Link>
      </div>

      {!clients || clients.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-lg p-8 text-center">
          <p className="text-gray-500">No clients yet.</p>
          <Link href="/staff/clients/new" className="mt-3 inline-block text-blue-600 text-sm hover:underline">
            Create your first client →
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {clients.slice(0, 5).map((c) => (
            <div key={c.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="font-medium text-gray-900">{c.last_name}, {c.first_name}</p>
              <p className="text-sm text-gray-500">{c.programs?.name ?? '—'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
