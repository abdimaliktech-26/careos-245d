import Link from 'next/link'
import { getClients } from '@/lib/clients/actions'
import { ClientCard } from '@/components/clients/client-card'

export default async function ClientListPage() {
  const { data: clients, error } = await getClients()

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <Link
          href="/staff/clients/new"
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
        >
          + New Client
        </Link>
      </div>

      {error && (
        <p className="text-red-600 bg-red-50 border border-red-200 rounded p-3 mb-4 text-sm">
          {error}
        </p>
      )}

      {!clients || clients.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-lg p-10 text-center">
          <p className="text-gray-500 mb-3">No active clients.</p>
          <Link href="/staff/clients/new" className="text-blue-600 text-sm hover:underline">
            Create your first client →
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {clients.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      )}
    </div>
  )
}
