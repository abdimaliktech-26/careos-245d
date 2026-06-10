import { createAdminClient } from '@/lib/supabase/admin'
import { validateRequiredSignatures } from '@/lib/forms/signature-validation'

const DOCUMENTS_BUCKET = 'documents'

type Organization = {
  id: string
  name: string
  license_number: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  phone: string | null
  email: string | null
  website: string | null
  logo_url: string | null
  ein: string | null
  npi: string | null
  brand_primary: string | null
  brand_accent: string | null
}

type Client = {
  id: string
  legal_name: string
  preferred_name: string | null
  date_of_birth: string | null
  program: string
}

type Packet = {
  id: string
  organization_id: string
  client_id: string
  packet_type: string
  due_date: string
  status: string
}

type Template = {
  id: string
  code: string
  name: string
  description: string | null
}

type Field = {
  field_key: string
  label: string
  field_type: string
  section_label: string | null
  sort_order: number
}

type ResponseRow = {
  field_key: string
  value: string | null
  value_json: unknown
}

type SignatureRow = {
  signer_role: string
  signer_name: string
  signature_data: string | null
  signed_at: string
}

export type GeneratedFormDocument = {
  html: string
  fileName: string
  storagePath: string
  displayName: string
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function valueToText(response: ResponseRow | undefined) {
  if (!response) return ''
  if (response.value_json !== null && response.value_json !== undefined) {
    if (Array.isArray(response.value_json)) return response.value_json.join(', ')
    if (typeof response.value_json === 'object') return JSON.stringify(response.value_json)
    return String(response.value_json)
  }
  return response.value ?? ''
}

function safeFilePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function packetLabel(packetType: string) {
  return packetType
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

async function ensureDocumentsBucket() {
  const admin = createAdminClient()
  const { data: buckets, error } = await admin.storage.listBuckets()
  if (error) throw error
  if (buckets?.some((bucket) => bucket.name === DOCUMENTS_BUCKET)) return

  const { error: createError } = await admin.storage.createBucket(DOCUMENTS_BUCKET, {
    public: false,
    fileSizeLimit: 10 * 1024 * 1024,
  })
  if (createError) throw createError
}

export async function generateCompletedFormDocument(
  packetFormId: string
): Promise<GeneratedFormDocument> {
  const admin = createAdminClient()
  const { data: packetForm, error: packetFormError } = await admin
    .from('packet_forms')
    .select('id, packet_id, template_id, status, submitted_at')
    .eq('id', packetFormId)
    .single()
  if (packetFormError || !packetForm) throw new Error(packetFormError?.message ?? 'Form not found')
  if (packetForm.status !== 'completed') throw new Error('Form must be completed before download')

  const [
    { data: packet, error: packetError },
    { data: template, error: templateError },
    { data: fields, error: fieldsError },
    { data: responses, error: responsesError },
  ] = await Promise.all([
    admin.from('packets').select('*').eq('id', packetForm.packet_id).single(),
    admin.from('form_templates').select('id, code, name, description').eq('id', packetForm.template_id).single(),
    admin.from('form_fields').select('field_key, label, field_type, section_label, sort_order').eq('template_id', packetForm.template_id).order('sort_order'),
    admin.from('form_responses').select('field_key, value, value_json').eq('packet_form_id', packetFormId),
  ])
  if (packetError || !packet) throw new Error(packetError?.message ?? 'Packet not found')
  if (templateError || !template) throw new Error(templateError?.message ?? 'Template not found')
  if (fieldsError) throw fieldsError
  if (responsesError) throw responsesError

  const [
    { data: organization, error: organizationError },
    { data: client, error: clientError },
    { data: signatures, error: signaturesError },
  ] = await Promise.all([
    admin.from('organizations').select('*').eq('id', packet.organization_id).single(),
    admin.from('clients').select('id, legal_name, preferred_name, date_of_birth, program').eq('id', packet.client_id).single(),
    admin.from('signatures').select('signer_role, signer_name, signature_data, signed_at').eq('packet_form_id', packetFormId).order('signed_at'),
  ])
  if (organizationError || !organization) throw new Error(organizationError?.message ?? 'Organization not found')
  if (clientError || !client) throw new Error(clientError?.message ?? 'Client not found')
  if (signaturesError) throw signaturesError
  const signatureValidation = validateRequiredSignatures(signatures ?? [])
  if (!signatureValidation.isValid) {
    throw new Error(`Document is not valid for download. ${signatureValidation.alert}`)
  }

  const html = renderFormDocumentHtml({
    organization: organization as Organization,
    client: client as Client,
    packet: packet as Packet,
    template: template as Template,
    fields: (fields ?? []) as Field[],
    responses: (responses ?? []) as ResponseRow[],
    signatures: (signatures ?? []) as SignatureRow[],
    completedAt: packetForm.submitted_at ?? new Date().toISOString(),
  })

  const displayName = `${template.code} - ${template.name} - ${client.legal_name}`
  const fileName = `${safeFilePart(client.legal_name)}-${safeFilePart(template.code)}-${packetFormId.slice(0, 8)}.html`
  const storagePath = `${packet.organization_id}/${packet.client_id}/${packet.id}/${packetFormId}/${fileName}`

  return { html, fileName, storagePath, displayName }
}

export async function storeCompletedFormDocument(packetFormId: string) {
  await ensureDocumentsBucket()
  const admin = createAdminClient()
  const document = await generateCompletedFormDocument(packetFormId)
  const { data: packetForm, error: packetFormError } = await admin
    .from('packet_forms')
    .select('packet_id, packets(organization_id, client_id)')
    .eq('id', packetFormId)
    .single()
  if (packetFormError || !packetForm) throw new Error(packetFormError?.message ?? 'Form not found')

  const packet = Array.isArray(packetForm.packets) ? packetForm.packets[0] : packetForm.packets
  if (!packet) throw new Error('Packet metadata not found')

  const bytes = Buffer.byteLength(document.html, 'utf8')
  const { error: uploadError } = await admin.storage
    .from(DOCUMENTS_BUCKET)
    .upload(document.storagePath, document.html, {
      contentType: 'text/html; charset=utf-8',
      upsert: true,
    })
  if (uploadError) throw uploadError

  const { data: existing, error: existingError } = await admin
    .from('documents')
    .select('id')
    .eq('storage_bucket', DOCUMENTS_BUCKET)
    .eq('storage_path', document.storagePath)
    .maybeSingle()
  if (existingError) throw existingError

  if (!existing) {
    const { error: insertError } = await admin.from('documents').insert({
      organization_id: packet.organization_id,
      client_id: packet.client_id,
      packet_id: packetForm.packet_id,
      category: 'completed_form',
      display_name: document.displayName,
      description: 'Auto-generated on signature completion. Contains all responses and signature images.',
      storage_bucket: DOCUMENTS_BUCKET,
      storage_path: document.storagePath,
      file_size: bytes,
      mime_type: 'text/html',
    })
    if (insertError) throw insertError
  }

  return document
}

function renderFormDocumentHtml({
  organization,
  client,
  packet,
  template,
  fields,
  responses,
  signatures,
  completedAt,
}: {
  organization: Organization
  client: Client
  packet: Packet
  template: Template
  fields: Field[]
  responses: ResponseRow[]
  signatures: SignatureRow[]
  completedAt: string
}) {
  const responsesByKey = new Map(responses.map((response) => [response.field_key, response]))
  const fieldsBySection = fields.reduce<Record<string, Field[]>>((acc, field) => {
    const section = field.section_label ?? 'General'
    return { ...acc, [section]: [...(acc[section] ?? []), field] }
  }, {})
  const address = [organization.address, organization.city, organization.state, organization.zip]
    .filter(Boolean)
    .join(', ')
  const generatedAt = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(template.name)}</title>
  <style>
    :root { color-scheme: light; }
    body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; margin: 32px; line-height: 1.45; }
    header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #111827; padding-bottom: 18px; margin-bottom: 24px; }
    .brand { display: flex; gap: 14px; align-items: flex-start; }
    .logo { width: 72px; height: 72px; object-fit: contain; border: 1px solid #e5e7eb; }
    h1 { font-size: 24px; margin: 0 0 4px; }
    h2 { font-size: 17px; margin: 28px 0 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
    .muted { color: #6b7280; font-size: 12px; }
    .meta { text-align: right; font-size: 12px; color: #374151; }
    .summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 20px; background: #f9fafb; border: 1px solid #e5e7eb; padding: 12px; margin-bottom: 20px; }
    .field { break-inside: avoid; display: grid; grid-template-columns: 220px 1fr; gap: 12px; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
    .label { font-weight: 700; font-size: 12px; color: #374151; }
    .value { white-space: pre-wrap; min-height: 18px; }
    .signature { border: 1px solid #e5e7eb; padding: 12px; margin-top: 10px; break-inside: avoid; }
    .signature img { display: block; max-width: 320px; max-height: 120px; margin-top: 8px; }
    footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #6b7280; }
    @media print { body { margin: 0.5in; } .no-print { display: none; } }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      ${organization.logo_url ? `<img class="logo" src="${escapeHtml(organization.logo_url)}" alt="${escapeHtml(organization.name)} logo" />` : ''}
      <div>
        <h1>${escapeHtml(organization.name)}</h1>
        <div class="muted">${organization.license_number ? `License: ${escapeHtml(organization.license_number)}<br />` : ''}${escapeHtml(address)}</div>
        <div class="muted">${escapeHtml([organization.phone, organization.email, organization.website].filter(Boolean).join(' · '))}</div>
      </div>
    </div>
    <div class="meta">
      <strong>${escapeHtml(template.code)}</strong><br />
      ${escapeHtml(packetLabel(packet.packet_type))}<br />
      Due: ${escapeHtml(packet.due_date)}<br />
      Generated: ${escapeHtml(generatedAt)}
    </div>
  </header>

  <h1>${escapeHtml(template.name)}</h1>
  ${template.description ? `<p class="muted">${escapeHtml(template.description)}</p>` : ''}

  <section class="summary">
    <div><strong>Client:</strong> ${escapeHtml(client.legal_name)}</div>
    <div><strong>Preferred Name:</strong> ${escapeHtml(client.preferred_name ?? '—')}</div>
    <div><strong>Date of Birth:</strong> ${escapeHtml(client.date_of_birth ?? '—')}</div>
    <div><strong>Program:</strong> ${escapeHtml(client.program)}</div>
    <div><strong>Packet:</strong> ${escapeHtml(packetLabel(packet.packet_type))}</div>
    <div><strong>Completed:</strong> ${escapeHtml(new Date(completedAt).toLocaleDateString('en-US'))}</div>
  </section>

  ${Object.entries(fieldsBySection).map(([section, sectionFields]) => `
    <section>
      <h2>${escapeHtml(section)}</h2>
      ${sectionFields.map((field) => {
        const response = responsesByKey.get(field.field_key)
        return `
          <div class="field">
            <div class="label">${escapeHtml(field.label)}</div>
            <div class="value">${escapeHtml(valueToText(response) || '—')}</div>
          </div>
        `
      }).join('')}
    </section>
  `).join('')}

  <section>
    <h2>Signatures</h2>
    ${signatures.length === 0 ? '<p class="muted">No signatures captured.</p>' : signatures.map((signature) => `
      <div class="signature">
        <strong>${escapeHtml(signature.signer_name)}</strong>
        <span class="muted">(${escapeHtml(signature.signer_role.replaceAll('_', ' '))}) · ${escapeHtml(new Date(signature.signed_at).toLocaleString('en-US'))}</span>
        ${signature.signature_data ? `<img src="${escapeHtml(signature.signature_data)}" alt="Signature for ${escapeHtml(signature.signer_name)}" />` : ''}
      </div>
    `).join('')}
  </section>

  <footer>
    <div>${escapeHtml(organization.name)}${organization.license_number ? ` · License: ${escapeHtml(organization.license_number)}` : ''}${organization.ein ? ` · EIN: ${escapeHtml(organization.ein)}` : ''}${organization.npi ? ` · NPI: ${escapeHtml(organization.npi)}` : ''}</div>
    <div>${escapeHtml(address)}${organization.phone ? ` · ${escapeHtml(organization.phone)}` : ''}${organization.email ? ` · ${escapeHtml(organization.email)}` : ''}${organization.website ? ` · ${escapeHtml(organization.website)}` : ''}</div>
    <div style="margin-top:4px;">This document is generated from server-side saved responses and signature audit data.</div>
  </footer>
</body>
</html>`
}
