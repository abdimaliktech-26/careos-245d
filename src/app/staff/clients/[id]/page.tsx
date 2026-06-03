import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getClientById, getClientFormStatus } from '@/lib/clients/actions'

type Props = { params: Promise<{ id: string }> }

const FORM_SET_COLORS: Record<string, string> = {
  intake: 'bg-blue-50 border-blue-200',
  '45day': 'bg-purple-50 border-purple-200',
  semiannual: 'bg-amber-50 border-amber-200',
  annual: 'bg-green-50 border-green-200',
}

export default async function ClientProfilePage({ params }: Props) {
  const { id } = await params
  const [{ data: client, error }, { data: formStatus }] = await Promise.all([
    getClientById(id),
    getClientFormStatus(id),
  ])

  if (error || !client) notFound()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/staff/clients" className="text-sm text-blue-600 hover:underline">
            ← Back to clients
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            {client.first_name} {client.last_name}
          </h1>
          <p className="text-sm text-gray-500">
            {client.programs?.name ?? 'No program assigned'} · <span className="capitalize">{client.status}</span>
          </p>
        </div>
      </div>

      <section className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Demographics</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-gray-500">Date of Birth</dt>
            <dd className="text-gray-900 font-medium">{client.date_of_birth ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Intake Date</dt>
            <dd className="text-gray-900 font-medium">{client.intake_date ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Phone</dt>
            <dd className="text-gray-900 font-medium">{client.phone ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Email</dt>
            <dd className="text-gray-900 font-medium">{client.email ?? '—'}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-gray-500">Address</dt>
            <dd className="text-gray-900 font-medium">
              {client.address
                ? `${client.address}, ${client.city ?? ''}, ${client.state} ${client.zip ?? ''}`
                : '—'}
            </dd>
          </div>
        </dl>
      </section>

      {client.guardian_name && (
        <section className="bg-white border border-gray-200 rounded-lg p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Guardian</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-gray-500">Name</dt>
              <dd className="text-gray-900 font-medium">{client.guardian_name}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Relationship</dt>
              <dd className="text-gray-900 font-medium">{client.guardian_relationship ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Phone</dt>
              <dd className="text-gray-900 font-medium">{client.guardian_phone ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Email</dt>
              <dd className="text-gray-900 font-medium">{client.guardian_email ?? '—'}</dd>
            </div>
          </dl>
        </section>
      )}

      <section className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Form Tracker</h2>
          <span className="text-xs text-gray-400">Form filling available in Plan 3</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {formStatus?.map((fs) => (
            <div
              key={fs.formSet}
              className={`border rounded-lg p-4 ${FORM_SET_COLORS[fs.formSet] ?? 'bg-gray-50 border-gray-200'}`}
            >
              <p className="font-medium text-gray-800 text-sm">{fs.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {fs.completed}
                <span className="text-sm font-normal text-gray-500">/{fs.total}</span>
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {fs.dueDate
                  ? `Due ${new Date(fs.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                  : 'Not scheduled'}
              </p>
              {fs.overdue > 0 && (
                <p className="text-xs text-red-600 font-medium mt-1">{fs.overdue} overdue</p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
