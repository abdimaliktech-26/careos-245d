import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

type Props = { params: Promise<{ id: string }> }

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-gray-50 last:border-0">
      <span className="text-[12px] font-medium text-muted-foreground">{label}</span>
      <span className="text-[12px] font-semibold text-foreground text-right">{value}</span>
    </div>
  )
}

function DetailPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="care-panel rounded-2xl overflow-hidden">
      {children}
    </div>
  )
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="border-b border-border px-6 py-4">
      <h2 className="text-sm font-bold text-foreground">{title}</h2>
      {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  )
}

export default async function DocumentDetailPage({ params }: Props) {
  const { user, error } = await getSession()
  if (error || !user || user.role !== 'external_signer') redirect('/auth/login')

  const { id } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: link, error: linkError } = await supabase
    .from('signing_links')
    .select(`
      id, token, signer_name, signer_email, signer_role,
      created_by, created_at, completed_at, expires_at, is_revoked,
      packet_form_id,
      packet_forms!inner(
        id, status, form_templates!inner(id, code, name, description)
      )
    `)
    .eq('id', id)
    .eq('signer_email', user.email)
    .single()

  if (linkError || !link) notFound()

  const pf = Array.isArray(link.packet_forms) ? link.packet_forms[0] : link.packet_forms
  const template = Array.isArray(pf?.form_templates) ? pf?.form_templates[0] : pf?.form_templates

  const expired = !link.completed_at && !link.is_revoked && new Date(link.expires_at) <= new Date()
  const isPending = !link.completed_at && !link.is_revoked && !expired
  const isSigned = !!link.completed_at

  // Look for a downloadable document
  let documentId: string | null = null
  if (isSigned && link.packet_form_id) {
    const { data: pfData } = await admin
      .from('packet_forms')
      .select('packet_id')
      .eq('id', link.packet_form_id)
      .single()

    if (pfData) {
      const { data: docData } = await admin
        .from('documents')
        .select('id')
        .eq('packet_id', pfData.packet_id)
        .eq('category', 'completed_form')
        .maybeSingle()

      if (docData) documentId = docData.id
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Back link */}
      <Link
        href="/client/documents"
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-[#334155] transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Back to documents
      </Link>

      {/* Status alert */}
      {isSigned && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 px-5 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <p className="text-[13px] font-semibold text-emerald-800">This document has been signed.</p>
        </div>
      )}
      {expired && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50/50 px-5 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <p className="text-[13px] font-semibold text-red-800">This signing link has expired.</p>
        </div>
      )}
      {link.is_revoked && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50/50 px-5 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <p className="text-[13px] font-semibold text-red-800">This signing link has been revoked.</p>
        </div>
      )}

      {/* Document info */}
      <DetailPanel>
        <SectionHeader title={template?.name ?? 'Document'} subtitle={template?.code ?? ''} />
        <div className="px-6 py-2">
          <InfoRow label="Template Code" value={template?.code ?? '—'} />
          <InfoRow label="Form Name" value={template?.name ?? '—'} />
          <InfoRow label="Signer Name" value={link.signer_name} />
          <InfoRow label="Signer Role" value={link.signer_role.replaceAll('_', ' ')} />
          <InfoRow label="Sent" value={new Date(link.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} />
          <InfoRow
            label="Expires"
            value={new Date(link.expires_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          />
          {link.completed_at && (
            <InfoRow
              label="Signed On"
              value={new Date(link.completed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            />
          )}
        </div>
      </DetailPanel>

      {/* Actions */}
      <DetailPanel>
        <SectionHeader title="Actions" />
        <div className="px-6 py-4 space-y-3">
          {isPending && (
            <Link
              href={`/sign/${link.token}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-[13px] font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
              style={{ background: 'var(--gradient-primary)' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
              Review & Sign
            </Link>
          )}
          {isSigned && documentId && (
            <Link
              href={`/api/documents/${documentId}/download`}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-[13px] font-semibold text-[#334155] hover:bg-muted/40 transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download Signed Document
            </Link>
          )}
          {isSigned && !documentId && (
            <div className="rounded-xl border border-border bg-muted px-5 py-4 text-center">
              <p className="text-[12px] text-muted-foreground">The signed document is being processed and will be available for download shortly.</p>
            </div>
          )}
          {expired && (
            <div className="rounded-xl border border-border bg-muted px-5 py-4 text-center">
              <p className="text-[12px] text-muted-foreground">This signing link has expired. Please contact your care provider to request a new one.</p>
            </div>
          )}
          {link.is_revoked && (
            <div className="rounded-xl border border-border bg-muted px-5 py-4 text-center">
              <p className="text-[12px] text-muted-foreground">This signing link has been revoked by your care provider.</p>
            </div>
          )}
        </div>
      </DetailPanel>
    </div>
  )
}
