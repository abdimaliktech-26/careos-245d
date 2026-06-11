import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

function StatCard({ value, label, icon }: { value: number; label: string; icon: React.ReactNode }) {
  return (
    <div className="care-panel rounded-2xl p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent">
          {icon}
        </div>
      </div>
      <p className="text-[30px] font-bold leading-none tracking-tight text-foreground">{value}</p>
      <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
    </div>
  )
}

function QuickActionLink({ href, label, description, icon }: { href: string; label: string; description: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="care-panel rounded-2xl p-4 flex items-center gap-4 transition-all duration-150 hover:shadow-md hover:border-brand-to/40"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </Link>
  )
}

function PendingIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#DB2777" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
}

function PenIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}

function UserCardIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
}

export default async function ClientPortalPage() {
  const { user, error } = await getSession()
  if (error || !user || user.role !== 'external_signer') redirect('/auth/login')

  const supabase = await createClient()

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
    .limit(50)

  const linkRows = (links ?? []) as Array<Record<string, unknown>>
  const pending = linkRows.filter((l) => !l.completed_at && !l.is_revoked && new Date(l.expires_at as string) > new Date())
  const completed = linkRows.filter((l) => l.completed_at)
  const expired = linkRows.filter((l) => !l.completed_at && !l.is_revoked && new Date(l.expires_at as string) <= new Date())

  const today = new Date()
  const headerDate = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Client Portal · {headerDate}
        </p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">
          Welcome, {user.fullName.split(' ')[0]}.
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Review and sign documents from your care provider.
          {pending.length > 0 && ` You have ${pending.length} document${pending.length !== 1 ? 's' : ''} awaiting your signature.`}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard value={pending.length} label="Awaiting Signature" icon={<PendingIcon />} />
        <StatCard value={completed.length} label="Signed" icon={<CheckIcon />} />
        <StatCard value={expired.length} label="Expired" icon={<AlertIcon />} />
      </div>

      {/* Quick Actions */}
      {pending.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-foreground mb-3">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <QuickActionLink
              href="/client/documents?status=pending"
              label="Review Pending"
              description={`${pending.length} document${pending.length !== 1 ? 's' : ''} need${pending.length === 1 ? 's' : ''} your signature`}
              icon={<PenIcon />}
            />
            <QuickActionLink
              href="/client/documents"
              label="All Documents"
              description="View your complete document history"
              icon={<SearchIcon />}
            />
            <QuickActionLink
              href="/client/profile"
              label="Your Profile"
              description="View your account details"
              icon={<UserCardIcon />}
            />
          </div>
        </section>
      )}

      {/* Pending signatures */}
      <section className="care-panel rounded-2xl overflow-hidden">
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">Documents Awaiting Your Signature</h2>
            <Link href="/client/documents?status=pending" className="text-[12px] font-medium text-primary hover:opacity-80 transition-opacity">
              View all →
            </Link>
          </div>
        </div>
        {pending.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-status-ok-bg">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p className="text-[13px] font-semibold text-foreground">All caught up</p>
            <p className="mt-1 text-[12px] text-muted-foreground">No documents need your signature right now.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {pending.slice(0, 5).map((link) => {
              const pf = link.packet_forms as { status: string; form_templates: { code: string; name: string } } | null
              const template = pf?.form_templates
              return (
                <div key={link.id as string} className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-muted/40">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DB2777" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-foreground truncate">{template?.name ?? 'Document'}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Role: {(link.signer_role as string)?.replaceAll('_', ' ') ?? 'Signer'}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Sent {new Date(link.created_at as string).toLocaleDateString('en-US')}
                        · Expires {new Date(link.expires_at as string).toLocaleDateString('en-US')}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/sign/${link.token as string}`}
                    className="shrink-0 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
                  >
                    Review & Sign
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Completed documents */}
      {completed.length > 0 && (
        <section className="care-panel rounded-2xl overflow-hidden">
          <div className="border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">Recently Signed</h2>
              <Link href="/client/documents?status=signed" className="text-[12px] font-medium text-primary hover:opacity-80 transition-opacity">
                View all →
              </Link>
            </div>
          </div>
          <div className="divide-y divide-border/60">
            {completed.slice(0, 5).map((link) => {
              const pf = link.packet_forms as { form_templates: { code: string; name: string } } | null
              const template = pf?.form_templates
              return (
                <div key={link.id as string} className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-muted/40">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-status-ok-bg">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-foreground truncate">{template?.name ?? 'Document'}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Signed {new Date(link.completed_at as string).toLocaleDateString('en-US')}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-status-ok-bg px-2.5 py-1 text-[10px] font-semibold text-status-ok shrink-0">
                    Signed ✓
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
