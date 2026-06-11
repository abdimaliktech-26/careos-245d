import { createAdminClient } from '@/lib/supabase/admin'
import { ExternalSignatureForm } from '@/components/signing/external-signature-form'

type Props = { params: Promise<{ token: string }> }

export default async function ExternalSignPage({ params }: Props) {
  const { token } = await params
  const admin = createAdminClient()
  const { data: link, error } = await admin
    .from('signing_links')
    .select(`
      token,
      signer_name,
      signer_role,
      expires_at,
      completed_at,
      is_revoked,
      packet_form_id,
      packet_forms(
        id,
        template_id,
        form_templates(code, name, description)
      ),
      packets(
        clients(legal_name),
        organizations(name, logo_url, phone, email)
      )
    `)
    .eq('token', token)
    .single()

  if (error || !link || link.is_revoked) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-5">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-xs">
          <h1 className="text-xl font-bold text-foreground">Signing link not found</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            This link is invalid, expired, or has been revoked. Please contact the care
            provider who sent it to request a new signing link.
          </p>
        </div>
      </main>
    )
  }

  const expired = new Date(link.expires_at as string) < new Date()
  const packet = Array.isArray(link.packets) ? link.packets[0] : link.packets
  const packetForm = Array.isArray(link.packet_forms) ? link.packet_forms[0] : link.packet_forms
  const template = Array.isArray(packetForm?.form_templates) ? packetForm?.form_templates[0] : packetForm?.form_templates
  const client = Array.isArray(packet?.clients) ? packet?.clients[0] : packet?.clients
  const organization = Array.isArray(packet?.organizations) ? packet?.organizations[0] : packet?.organizations

  const packetFormId = link.packet_form_id ?? packetForm?.id

  let fields: Array<{ field_key: string; label: string; field_type: string; section_label: string | null; sort_order: number }> = []
  let responses: Array<{ field_key: string; value: string | null; value_json: unknown }> = []
  let signatures: Array<{ signer_role: string; signer_name: string; signed_at: string }> = []

  if (packetFormId) {
    const templateId = packetForm?.template_id
    if (templateId) {
      const { data: f } = await admin
        .from('form_fields')
        .select('field_key, label, field_type, section_label, sort_order')
        .eq('template_id', templateId)
        .order('sort_order')
      if (f) fields = f
    }
    const { data: r } = await admin
      .from('form_responses')
      .select('field_key, value, value_json')
      .eq('packet_form_id', packetFormId)
    if (r) responses = r

    const { data: s } = await admin
      .from('signatures')
      .select('signer_role, signer_name, signed_at')
      .eq('packet_form_id', packetFormId)
      .order('signed_at')
    if (s) signatures = s
  }

  const signedRoles = new Set(signatures.map((s) => s.signer_role))
  const requiredRoles = [
    { role: 'client' as const, label: 'Client' },
    { role: 'guardian' as const, label: 'Guardian / Client' },
    { role: 'case_manager' as const, label: 'Case Manager' },
  ]

  const responsesByKey = new Map(
    responses.map((r) => {
      if (r.value_json !== null && r.value_json !== undefined) {
        const v = Array.isArray(r.value_json) ? r.value_json.join(', ') : String(r.value_json)
        return [r.field_key, v]
      }
      return [r.field_key, r.value ?? '']
    })
  )

  return (
    <main className="min-h-screen bg-[#fffaf6] px-4 py-8 sm:px-5 sm:py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-3 sm:mb-8">
          {organization?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={organization.logo_url} alt="" className="h-10 w-10 rounded-2xl object-cover sm:h-12 sm:w-12" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#24343a] text-sm font-black text-white sm:h-12 sm:w-12 sm:text-base">CI</div>
          )}
          <div>
            <p className="text-base font-black text-[#24343a] sm:text-lg">{organization?.name ?? 'CareIntake'}</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8B4B2D] sm:text-xs">Secure Signature</p>
          </div>
        </div>

        <section className="care-panel mb-4 rounded-2xl p-4 sm:mb-6 sm:p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8B4B2D] sm:text-xs">Document</p>
          <h1 className="mt-2 text-xl font-black text-[#24343a] sm:text-2xl">
            {template?.code && <>{template.code} · </>}{template?.name}
          </h1>
          {template?.description && (
            <p className="mt-1 text-xs text-[#667085] sm:text-sm">{template.description}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#667085] sm:text-sm">
            <span>Client: <strong className="text-[#24343a]">{client?.legal_name ?? 'Client'}</strong></span>
            <span>Role: <strong className="text-[#24343a]">{String(link.signer_role).replaceAll('_', ' ')}</strong></span>
          </div>
        </section>

        <section className="care-panel mb-4 rounded-2xl p-4 sm:mb-6 sm:p-6">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#8B4B2D] sm:text-xs">Signature Requirements</p>
          <div className="space-y-2">
            {requiredRoles.map((req) => {
              const isSigned = signedRoles.has(req.role)
              return (
                <div key={req.role} className="flex items-center gap-2 text-xs sm:text-sm">
                  <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold sm:h-5 sm:w-5 sm:text-xs ${
                    isSigned
                      ? 'bg-green-100 text-green-700'
                      : 'bg-[#f37d6d]/10 text-[#8B4B2D]'
                  }`}>
                    {isSigned ? '✓' : '·'}
                  </span>
                  <span className={isSigned ? 'text-green-700 line-through' : 'text-[#24343a]'}>
                    {req.label}
                  </span>
                  {isSigned && <span className="text-[10px] text-green-600 sm:text-xs">signed</span>}
                </div>
              )
            })}
          </div>
        </section>

        {signatures.length > 0 && (
          <section className="care-panel mb-4 rounded-2xl p-4 sm:mb-6 sm:p-6">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#8B4B2D] sm:text-xs">Signed By</p>
            <div className="space-y-2">
              {signatures.map((sig, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2">
                  <div>
                    <p className="text-xs font-semibold text-[#24343a] sm:text-sm">{sig.signer_name}</p>
                    <p className="text-[10px] capitalize text-[#667085] sm:text-xs">{sig.signer_role.replaceAll('_', ' ')}</p>
                  </div>
                  <p className="text-[10px] text-green-600 sm:text-xs">{new Date(sig.signed_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {fields.length > 0 && (
          <section className="care-panel mb-4 rounded-2xl p-4 sm:mb-6 sm:p-6">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#8B4B2D] sm:text-xs">Document Preview</p>
            <div className="scrollbar-thin max-h-80 space-y-2 overflow-y-auto">
              {fields.map((field) => {
                const val = responsesByKey.get(field.field_key)
                return (
                  <div key={field.field_key} className="flex items-start gap-2 rounded-lg border border-[#eadfd6] px-3 py-2">
                    <span className="min-w-0 flex-1 text-xs text-[#667085]">{field.label}</span>
                    <span className="max-w-[50%] break-words text-right text-xs font-medium text-[#24343a]">{val || '—'}</span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {link.completed_at ? (
          <div className="care-panel rounded-2xl p-6 text-center sm:p-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 sm:h-16 sm:w-16">
              <span className="text-2xl text-green-600 sm:text-3xl">✓</span>
            </div>
            <p className="text-lg font-black text-green-700 sm:text-xl">Signature Complete</p>
            <p className="mt-2 text-xs text-[#667085] sm:text-sm">This document has been fully signed.</p>
          </div>
        ) : expired ? (
          <div className="care-panel rounded-2xl p-6 text-center sm:p-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 sm:h-16 sm:w-16">
              <span className="text-2xl text-red-500 sm:text-3xl">!</span>
            </div>
            <p className="text-lg font-black text-red-700 sm:text-xl">Signing Link Expired</p>
            <p className="mt-2 text-xs text-[#667085] sm:text-sm">
              This secure signing link is no longer valid. Please contact{' '}
              <strong>{organization?.name ?? 'your provider'}</strong>
              {organization?.phone && (
                <> at <a href={`tel:${organization.phone}`} className="text-[#f37d6d] underline">{organization.phone}</a></>
              )}{' '}
              to request a new link.
            </p>
          </div>
        ) : (
          <ExternalSignatureForm token={token} signerName={link.signer_name as string} />
        )}
      </div>
    </main>
  )
}
