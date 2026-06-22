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
import { EvvComplianceWidget } from '@/components/evv/evv-compliance-widget'

type Props = { params: Promise<{ id: string }> }

const FORM_SET_COLORS: Record<string, string> = {
  intake: 'bg-blue-50 border-blue-200',
  '45_day_review': 'bg-blue-50 border-blue-200',
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
  not_started: 'bg-muted text-muted-foreground',
  in_progress: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  needs_signature: 'bg-status-warn-bg text-status-warn',
  completed: 'bg-status-ok-bg text-status-ok',
  overdue: 'bg-status-error-bg text-status-error',
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
          <Link href="/clients" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to clients
          </Link>
          <h1 className="text-2xl font-semibold text-foreground mt-1">
            {client.legal_name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {client.program} · <span className="capitalize">{client.status}</span>
          </p>
        </div>
      </div>

      <ClientSubNav clientId={id} activeTab="profile" />

      <AiSummaryCard clientId={id} />

      {user?.organizationId && (
        <EvvComplianceWidget
          organizationId={user.organizationId}
          clientId={id}
          title="EVV Visits (30 days)"
        />
      )}

      <section className="bg-card border border-border rounded-xl p-5">
        <h2 className="font-semibold text-foreground mb-4">Demographics</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Date of Birth</dt>
            <dd className="text-foreground font-medium">{client.date_of_birth ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Intake Date</dt>
            <dd className="text-foreground font-medium">{client.intake_date ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Phone</dt>
            <dd className="text-foreground font-medium">{client.phone ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="text-foreground font-medium">{client.email ?? '—'}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-muted-foreground">Address</dt>
            <dd className="text-foreground font-medium">
              {client.home_address
                ? `${client.home_address}, ${client.city ?? ''}, ${client.state} ${client.zip ?? ''}`
                : '—'}
            </dd>
          </div>
        </dl>
      </section>

      {scorecard && (
        <section className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Compliance Scorecard</h2>
            <ScorecardBadge score={scorecard.packetScore} health={scorecard.overallHealth} size="sm" />
          </div>
          <div className="flex items-center gap-8">
            <ScoreGauge score={scorecard.packetScore} size="lg" />
            <div className="grid grid-cols-3 gap-6 text-sm">
              <div>
                <p className="text-2xl font-bold text-foreground">{scorecard.completedPackets}/{scorecard.totalPackets}</p>
                <p className="text-xs text-muted-foreground">Packets Complete</p>
              </div>
              <div>
                <p className={`text-2xl font-bold ${scorecard.overduePackets > 0 ? 'text-red-600' : 'text-foreground'}`}>{scorecard.overduePackets}</p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
              <div>
                <p className={`text-2xl font-bold ${scorecard.inProgressPackets > 0 ? 'text-amber-600' : 'text-foreground'}`}>{scorecard.inProgressPackets}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {client.guardian_name && (
        <section className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold text-foreground mb-4">Guardian</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Name</dt>
              <dd className="text-foreground font-medium">{client.guardian_name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Relationship</dt>
              <dd className="text-foreground font-medium">{client.guardian_relationship ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="text-foreground font-medium">{client.guardian_phone ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="text-foreground font-medium">{client.guardian_email ?? '—'}</dd>
            </div>
          </dl>
        </section>
      )}

      <section className="bg-card border border-border rounded-xl p-5">
        <h2 className="font-semibold text-foreground mb-4">Form Tracker</h2>
        <div className="grid grid-cols-2 gap-3">
          {formStatus?.map((fs) => (
            <div
              key={fs.formSet}
              className={`border rounded-xl p-4 ${FORM_SET_COLORS[fs.formSet] ?? 'bg-muted border-border'}`}
            >
              <p className="font-medium text-foreground text-sm">{fs.label}</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {fs.completed}
                <span className="text-sm font-normal text-muted-foreground">/{fs.total}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
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

      <section className="bg-card border border-border rounded-xl p-5">
        <h2 className="font-semibold text-foreground mb-4">Packet Forms</h2>
        {packetRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No packets scheduled.</p>
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
                <div key={packet.id as string} className="rounded-lg border border-border overflow-hidden">
                  <div className="bg-muted px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {PACKET_LABELS[packet.packet_type as string] ?? String(packet.packet_type).replaceAll('_', ' ')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {packetForms.length} forms · Due {new Date(packet.due_date as string).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_CLASSES[packet.status as string] ?? 'bg-muted text-muted-foreground'}`}>
                      {String(packet.status).replaceAll('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="divide-y divide-border/60">
                    {packetForms.map((form) => {
                      const template = getTemplate(form)
                      const status = String(form.status ?? 'not_started')
                      const signatureValidation = validateRequiredSignatures(getSignatures(form))
                      const signatureAlert = status !== 'not_started' && !signatureValidation.isValid
                      const canDownload = status === 'completed' && signatureValidation.isValid
                      return (
                        <div key={form.id as string} className="px-4 py-3 flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {template?.code} · {template?.name}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <span className={`inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_CLASSES[status] ?? 'bg-muted text-muted-foreground'}`}>
                                {status.replaceAll('_', ' ').toUpperCase()}
                              </span>
                              {signatureAlert && (
                                <span className="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-status-error-bg text-status-error">
                                  AI ALERT: {signatureValidation.alert}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {canDownload && (
                              <a
                                href={`/api/forms/${form.id as string}/download`}
                                className="text-xs font-semibold px-3 py-1.5 rounded-md border border-border text-foreground hover:bg-muted/40"
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

      <section className="bg-card border border-border rounded-xl p-5">
        <h2 className="font-semibold text-foreground mb-4">Completed Documents</h2>
        {completedForms.length === 0 ? (
          <p className="text-sm text-muted-foreground">Completed forms will appear here for download and remain stored on the server.</p>
        ) : (
          <div className="divide-y divide-border/60">
            {completedForms.map((form: Record<string, unknown>) => {
              const template = getTemplate(form)
              const packet = form.packet as { packet_type: string; due_date: string } | null
              return (
                <div key={form.id as string} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {template?.code} · {template?.name}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {packet?.packet_type?.replaceAll('_', ' ') ?? 'Packet'} · Completed {form.submitted_at ? new Date(form.submitted_at as string).toLocaleDateString('en-US') : '—'}
                    </p>
                  </div>
                  <a
                    href={`/api/forms/${form.id as string}/download`}
                    className="text-xs font-semibold px-3 py-1.5 rounded-md border border-border text-foreground hover:bg-muted/40"
                  >
                    Download
                  </a>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Service Plans (ISP) */}
      <section className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Service Plans</h2>
          <Link href={`/clients/${id}/isp`} className="text-xs font-semibold text-primary hover:underline">
            View All
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          The 245D coordinated service &amp; support plan: services, outcomes, risk management, and signatures.
        </p>
      </section>

      {/* Service Goals */}
      <section className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Service Goals</h2>
          <Link href={`/clients/${id}/goals`} className="text-xs font-semibold text-primary hover:underline">
            View All
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          Track person-centered goals across 45-day, semi-annual, and annual review periods.
        </p>
      </section>

      {/* Client Incidents */}
      <section className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Incidents</h2>
          <Link href={`/clients/${id}/incidents`} className="text-xs font-semibold text-primary hover:underline">
            View All
          </Link>
        </div>
        {(clientIncidents ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No incidents reported for this client.</p>
        ) : (
          <div className="space-y-2">
            {clientIncidents?.slice(0, 5).map((inc: Record<string, unknown>) => (
              <Link key={inc.id as string} href={`/incidents/${inc.id as string}`} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 hover:bg-muted/40 transition-colors">
                <div>
                  <p className="text-sm font-semibold text-foreground">{inc.incident_number as string}</p>
                  <p className="text-xs text-muted-foreground">
                    {inc.category as string} · {new Date(inc.occurred_at as string).toLocaleDateString('en-US')}
                  </p>
                </div>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  inc.status === 'open' ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' :
                  inc.status === 'under_review' ? 'bg-status-warn-bg text-status-warn' :
                  inc.status === 'reported_to_state' ? 'bg-status-error-bg text-status-error' :
                  'bg-status-ok-bg text-status-ok'
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
