import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'

type TabKey = 'all' | 'pending' | 'signed' | 'expired'

function Tab({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`px-4 py-2 text-[13px] font-semibold rounded-lg transition-colors ${
        active
          ? 'bg-[#EEF2FF] text-[#E8799E]'
          : 'text-[#64748B] hover:text-[#334155] hover:bg-gray-50'
      }`}
    >
      {label}
    </Link>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="px-6 py-16 text-center">
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF2FF]">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E8799E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      </div>
      <p className="text-[13px] font-semibold text-[#3A2A4A]">{title}</p>
      <p className="mt-1 text-[12px] text-[#94A3B8]">{description}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; dot: string; label: string }> = {
    pending:   { bg: 'bg-amber-50 text-amber-700',   dot: 'bg-amber-500', label: 'Pending' },
    signed:    { bg: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', label: 'Signed' },
    expired:   { bg: 'bg-gray-100 text-gray-500',     dot: 'bg-gray-400', label: 'Expired' },
    revoked:   { bg: 'bg-red-50 text-red-700',        dot: 'bg-red-500', label: 'Revoked' },
  }
  const s = map[status] ?? { bg: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400', label: status }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${s.bg}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'signed', label: 'Signed' },
  { key: 'expired', label: 'Expired' },
]

export default async function ClientDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { user, error } = await getSession()
  if (error || !user || user.role !== 'external_signer') redirect('/auth/login')

  const { status } = await searchParams
  const activeTab: TabKey = (status as TabKey) && TABS.some((t) => t.key === status)
    ? (status as TabKey)
    : 'pending'

  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: links } = await supabase
    .from('signing_links')
    .select(`
      id, token, signer_name, signer_email, signer_role,
      created_at, completed_at, expires_at, is_revoked,
      packet_form_id,
      packet_forms!inner(
        status, form_templates!inner(code, name)
      )
    `)
    .eq('signer_email', user.email)
    .order('created_at', { ascending: false })

  const linkRows = (links ?? []) as Array<Record<string, unknown>>

  type SigningLinkRecord = {
    id: string
    token: string
    signer_name: string
    signer_role: string
    created_at: string
    completed_at: string | null
    expires_at: string
    is_revoked: boolean
    packet_form_id: string
    packet_forms: { status: string; form_templates: { code: string; name: string } } | null
    _status: 'pending' | 'signed' | 'expired' | 'revoked'
  }

  const now = new Date()
  const enriched = linkRows.map((l) => {
    let s: SigningLinkRecord['_status'] = 'pending'
    if (l.is_revoked) s = 'revoked'
    else if (l.completed_at) s = 'signed'
    else if (new Date(l.expires_at as string) <= now) s = 'expired'

    return { ...l, _status: s } as unknown as SigningLinkRecord
  })

  const filtered = activeTab === 'all' ? enriched : enriched.filter((l) => l._status === activeTab)

  // Build document lookup for signed links (for download buttons)
  const signedIds = enriched.filter((l) => l._status === 'signed').map((l) => l.packet_form_id)
  const documentByPacketFormId: Record<string, { id: string }> = {}

  if (signedIds.length > 0) {
    const { data: pfData } = await admin
      .from('packet_forms')
      .select('id, packet_id')
      .in('id', signedIds)

    const packetIds = [...new Set((pfData ?? []).map((pf) => pf.packet_id))]
    if (packetIds.length > 0) {
      const { data: docData } = await admin
        .from('documents')
        .select('id, packet_id')
        .in('packet_id', packetIds)
        .eq('category', 'completed_form')

      for (const pf of pfData ?? []) {
        const doc = (docData ?? []).find((d) => d.packet_id === pf.packet_id)
        if (doc) {
          documentByPacketFormId[pf.id] = { id: doc.id }
        }
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#3A2A4A]">Documents</h1>
        <p className="mt-1 text-[13px] text-[#64748B]">
          {enriched.length} document{enriched.length !== 1 ? 's' : ''} associated with your account
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
        {TABS.map(({ key, label }) => (
          <Tab
            key={key}
            href={key === 'pending' ? '/client/documents' : `/client/documents?status=${key}`}
            label={label}
            active={activeTab === key}
          />
        ))}
      </div>

      {/* Document count in tab */}
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]">
        {filtered.length} {activeTab === 'all' ? 'total' : activeTab} document{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Document list */}
      {filtered.length === 0 ? (
        <div className="care-panel rounded-2xl overflow-hidden">
          {activeTab === 'pending' && (
            <EmptyState title="No pending documents" description="You have no documents awaiting your signature." />
          )}
          {activeTab === 'signed' && (
            <EmptyState title="No signed documents" description="Documents you have signed will appear here." />
          )}
          {activeTab === 'expired' && (
            <EmptyState title="No expired documents" description="Expired signing requests will appear here." />
          )}
          {activeTab === 'all' && (
            <EmptyState title="No documents found" description="No signing links have been created for your account yet." />
          )}
        </div>
      ) : (
        <div className="care-panel rounded-2xl overflow-hidden">
          <div className="divide-y divide-gray-50">
            {filtered.map((link) => {
              const template = link.packet_forms?.form_templates
              const docId = documentByPacketFormId[link.packet_form_id]?.id

              return (
                <div key={link.id} className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-gray-50/60">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF2FF]">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E8799E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/client/documents/${link.id}`}
                        className="text-[13px] font-semibold text-[#3A2A4A] hover:text-[#E8799E] transition-colors truncate block"
                      >
                        {template?.name ?? 'Document'}
                      </Link>
                      <p className="text-[11px] text-[#64748B] mt-0.5">
                        {template?.code ?? 'Form'} · Role: {link.signer_role.replaceAll('_', ' ')}
                      </p>
                      <p className="text-[10px] text-[#94A3B8] mt-0.5">
                        Sent {new Date(link.created_at).toLocaleDateString('en-US')}
                        {link._status === 'signed' && link.completed_at
                          ? ` · Signed ${new Date(link.completed_at).toLocaleDateString('en-US')}`
                          : ` · Expires ${new Date(link.expires_at).toLocaleDateString('en-US')}`
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <StatusBadge status={link._status} />
                    {link._status === 'pending' && (
                      <Link
                        href={`/sign/${link.token}`}
                        className="rounded-lg bg-[#E8799E] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
                      >
                        Review & Sign
                      </Link>
                    )}
                    {link._status === 'signed' && docId && (
                      <>
                        <Link
                          href={`/api/documents/${docId}/download`}
                          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-[#64748B] hover:bg-gray-50 hover:text-[#334155] transition-colors"
                        >
                          Download
                        </Link>
                        <Link
                          href={`/api/documents/${docId}/pdf`}
                          target="_blank"
                          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-[#64748B] hover:bg-amber-50 hover:text-amber-600 transition-colors"
                        >
                          PDF
                        </Link>
                      </>
                    )}
                    {link._status === 'signed' && !docId && (
                      <Link
                        href={`/sign/${link.token}`}
                        className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-[#64748B] hover:bg-gray-50 hover:text-[#334155] transition-colors"
                      >
                        View
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
