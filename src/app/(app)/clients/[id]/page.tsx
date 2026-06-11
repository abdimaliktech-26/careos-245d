import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getClientById, getClientFormStatus } from '@/lib/clients/actions'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { ClientSubNav } from '@/components/clients/client-subnav'
import { AiSummaryCard } from '@/components/clients/ai-summary-card'
import { validateRequiredSignatures } from '@/lib/forms/signature-validation'
import { SigningLinkForm } from '@/components/signing/signing-link-form'
import { getClientScorecardDetail } from '@/lib/audit/scorecards'
import { ScorecardBadge, ScoreGauge } from '@/components/audit/scorecard-badge'

type Props = { params: Promise<{ id: string }> }

const FORM_SET_COLORS: Record<string, string> = {
  intake: 'bg-blue-50 border-blue-200',
  '45_day_review': 'bg-purple-50 border-purple-200',
  semi_annual_review: 'bg-amber-50 border-amber-200',
  annual_review: 'bg-green-50 border-green-200',
}

const PACKET_LABELS: Record<string, string> = {
  intake: 'Intake',
  '45_day_review': '45-Day Review',
  semi_annual_review: 'Semi-Annual',
  annual_review: 'Annual',
}

const STATUS_CLASSES: Record<string, string> = {
  not_started: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-50 text-blue-700',
  needs_signature: 'bg-orange-50 text-orange-700',
  completed: 'bg-green-50 text-green-700',
  overdue: 'bg-red-50 text-red-700',
}

function getTemplate(form: Record<string, unknown>) {
  const raw = form.form_templates as { code: string; name: string; is_active?: boolean } | Array<{ code: string; name: string; is_active?: boolean }> | null
  return Array.isArray(raw) ? raw[0] : raw
}

function getSignatures(form: Record<string, unknown>) {
  return (form.signatures ?? []) as Array<{ signer_role: string }>
}

export default async function ClientProfilePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { user } = await getSession()
  const [{ data: client, error }, { data: formStatus }, { data: packets }, scorecardResult, { data: clientIncidents }] = await Promise.all([
    getClientById(id),
    getClientFormStatus(id),
    supabase
      .from('packets')
      .select('id, packet_type, due_date, status, packet_forms(id, status, sort_order, submitted_at, signatures(signer_role), form_templates(code, name, is_active))')
      .eq('client_id', id)
      .order('due_date', { ascending: true }),
    user?.organizationId ? getClientScorecardDetail(id, user.organizationId) : { card: null, packets: [] },
    supabase
      .from('incidents')
      .select('id, incident_number, category, status, occurred_at')
      .eq('client_id', id)
      .order('occurred_at', { ascending: false })
      .limit(10),
  ])
  const scorecard = scorecardResult?.card ?? null

  const packetRows = (packets ?? []) as Array<Record<string, unknown>>
  const completedForms = packetRows
    .flatMap((packet) =>
      ((packet.packet_forms ?? []) as Array<Record<string, unknown>>)
        .filter((form) => {
          const template = getTemplate(form)
          const validation = validateRequiredSignatures(getSignatures(form))
          return form.status === 'completed' && validation.isValid && template?.is_active
        })
        .map((form): Record<string, unknown> => ({ ...form, packet }))
    )
    .toSorted((a, b) =>
      String(b.submitted_at ?? '').localeCompare(String(a.submitted_at ?? ''))
    )

  if (error || !client) notFound()

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/clients" className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to clients
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900 mt-1">
            {client.legal_name}
          </h1>
          <p className="text-sm text-gray-500">
            {client.program} · <span className="capitalize">{client.status}</span>
          </p>
        </div>
      </div>

      <ClientSubNav clientId={id} activeTab="profile" />

      <AiSummaryCard clientId={id} />

      <section className="bg-white border border-gray-200 rounded-xl p-5">
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
              {client.home_address
                ? `${client.home_address}, ${client.city ?? ''}, ${client.state} ${client.zip ?? ''}`
                : '—'}
            </dd>
          </div>
        </dl>
      </section>

      {scorecard && (
        <section className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Compliance Scorecard</h2>
            <ScorecardBadge score={scorecard.packetScore} health={scorecard.overallHealth} size="sm" />
          </div>
          <div className="flex items-center gap-8">
            <ScoreGauge score={scorecard.packetScore} size="lg" />
            <div className="grid grid-cols-3 gap-6 text-sm">
              <div>
                <p className="text-2xl font-bold text-gray-900">{scorecard.completedPackets}/{scorecard.totalPackets}</p>
                <p className="text-xs text-gray-500">Packets Complete</p>
              </div>
              <div>
                <p className={`text-2xl font-bold ${scorecard.overduePackets > 0 ? 'text-red-600' : 'text-gray-900'}`}>{scorecard.overduePackets}</p>
                <p className="text-xs text-gray-500">Overdue</p>
              </div>
              <div>
                <p className={`text-2xl font-bold ${scorecard.inProgressPackets > 0 ? 'text-amber-600' : 'text-gray-900'}`}>{scorecard.inProgressPackets}</p>
                <p className="text-xs text-gray-500">In Progress</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {client.guardian_name && (
        <section className="bg-white border border-gray-200 rounded-xl p-5">
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

      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Form Tracker</h2>
        <div className="grid grid-cols-2 gap-3">
          {formStatus?.map((fs) => (
            <div
              key={fs.formSet}
              className={`border rounded-xl p-4 ${FORM_SET_COLORS[fs.formSet] ?? 'bg-gray-50 border-gray-200'}`}
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
              {fs.firstPendingAssignmentId && (
                <Link
                  href={`/clients/${id}/forms/${fs.firstPendingAssignmentId}`}
                  className="mt-2 inline-block text-xs font-medium hover:underline"
                  style={{ color: '#8B4B2D' }}
                >
                  Start next form →
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Packet Forms</h2>
        {packetRows.length === 0 ? (
          <p className="text-sm text-gray-500">No packets scheduled.</p>
        ) : (
          <div className="space-y-5">
            {packetRows.map((packet) => {
              const packetForms = ((packet.packet_forms ?? []) as Array<Record<string, unknown>>)
                .filter((form) => {
                  const template = getTemplate(form)
                  return template?.is_active
                })
                .toSorted((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))

              return (
                <div key={packet.id as string} className="rounded-lg border border-gray-100 overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {PACKET_LABELS[packet.packet_type as string] ?? String(packet.packet_type).replaceAll('_', ' ')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {packetForms.length} forms · Due {new Date(packet.due_date as string).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_CLASSES[packet.status as string] ?? 'bg-gray-100 text-gray-600'}`}>
                      {String(packet.status).replaceAll('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {packetForms.map((form) => {
                      const template = getTemplate(form)
                      const status = String(form.status ?? 'not_started')
                      const signatureValidation = validateRequiredSignatures(getSignatures(form))
                      const signatureAlert = status !== 'not_started' && !signatureValidation.isValid
                      const canDownload = status === 'completed' && signatureValidation.isValid
                      return (
                        <div key={form.id as string} className="px-4 py-3 flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {template?.code} · {template?.name}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <span className={`inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_CLASSES[status] ?? 'bg-gray-100 text-gray-600'}`}>
                                {status.replaceAll('_', ' ').toUpperCase()}
                              </span>
                              {signatureAlert && (
                                <span className="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700">
                                  AI ALERT: {signatureValidation.alert}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {canDownload && (
                              <a
                                href={`/api/forms/${form.id as string}/download`}
                                className="text-xs font-semibold px-3 py-1.5 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
                              >
                                Download
                              </a>
                            )}
                            {!canDownload && (
                              <Link
                                href={status === 'needs_signature' || status === 'completed'
                                  ? `/clients/${id}/forms/${form.id as string}/sign?submissionId=${form.id as string}`
                                  : `/clients/${id}/forms/${form.id as string}`}
                                className="text-xs font-semibold px-3 py-1.5 rounded-md text-white hover:opacity-90"
                                style={{ backgroundColor: '#8B4B2D' }}
                              >
                                {status === 'not_started' ? 'Start' : signatureAlert ? 'Collect Signatures' : 'Continue'}
                              </Link>
                            )}
                          </div>
                          {(status === 'needs_signature' || signatureAlert) && (
                            <div className="col-span-full">
                              <SigningLinkForm
                                packetFormId={form.id as string}
                                defaultName={client.guardian_name ?? client.legal_name}
                                defaultEmail={client.guardian_email ?? client.email}
                              />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Completed Documents</h2>
        {completedForms.length === 0 ? (
          <p className="text-sm text-gray-500">Completed forms will appear here for download and remain stored on the server.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {completedForms.map((form: Record<string, unknown>) => {
              const template = getTemplate(form)
              const packet = form.packet as { packet_type: string; due_date: string } | null
              return (
                <div key={form.id as string} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {template?.code} · {template?.name}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {packet?.packet_type?.replaceAll('_', ' ') ?? 'Packet'} · Completed {form.submitted_at ? new Date(form.submitted_at as string).toLocaleDateString('en-US') : '—'}
                    </p>
                  </div>
                  <a
                    href={`/api/forms/${form.id as string}/download`}
                    className="text-xs font-semibold px-3 py-1.5 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    Download
                  </a>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Service Goals */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Service Goals</h2>
          <Link href={`/clients/${id}/goals`} className="text-xs font-semibold text-[#E8799E] hover:underline">
            View All
          </Link>
        </div>
        <p className="text-sm text-gray-500">
          Track person-centered goals across 45-day, semi-annual, and annual review periods.
        </p>
      </section>

      {/* Client Incidents */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Incidents</h2>
          <Link href={`/clients/${id}/incidents`} className="text-xs font-semibold text-[#E8799E] hover:underline">
            View All
          </Link>
        </div>
        {(clientIncidents ?? []).length === 0 ? (
          <p className="text-sm text-gray-500">No incidents reported for this client.</p>
        ) : (
          <div className="space-y-2">
            {clientIncidents?.slice(0, 5).map((inc: Record<string, unknown>) => (
              <Link key={inc.id as string} href={`/incidents/${inc.id as string}`} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{inc.incident_number as string}</p>
                  <p className="text-xs text-gray-500">
                    {inc.category as string} · {new Date(inc.occurred_at as string).toLocaleDateString('en-US')}
                  </p>
                </div>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  inc.status === 'open' ? 'bg-blue-50 text-blue-700' :
                  inc.status === 'under_review' ? 'bg-amber-50 text-amber-700' :
                  inc.status === 'reported_to_state' ? 'bg-red-50 text-red-700' :
                  'bg-emerald-50 text-emerald-700'
                }`}>
                  {inc.status as string}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
