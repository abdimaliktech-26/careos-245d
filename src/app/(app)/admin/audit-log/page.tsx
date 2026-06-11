import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

type AuditRow = {
  id: string
  action: string
  entity_type: string | null
  entity_id: string | null
  entity_label: string | null
  user_email: string | null
  ip_address: string | null
  created_at: string
}

const ACTION_COLORS: Record<string, string> = {
  login: 'bg-blue-50 text-blue-700',
  logout: 'bg-muted text-muted-foreground',
  client_created: 'bg-green-50 text-green-700',
  client_updated: 'bg-yellow-50 text-yellow-700',
  form_saved: 'bg-purple-50 text-purple-700',
  form_submitted: 'bg-purple-100 text-purple-800',
  signature_completed: 'bg-teal-50 text-teal-700',
  pdf_downloaded: 'bg-orange-50 text-orange-700',
  file_uploaded: 'bg-indigo-50 text-indigo-700',
  incident_submitted: 'bg-red-50 text-red-700',
}

function actionColor(action: string) {
  return ACTION_COLORS[action] ?? 'bg-muted text-muted-foreground'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default async function AuditLogPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single()

  if (!profile) redirect('/auth/login')

  const { data: logs } = await supabase
    .from('audit_logs')
    .select('id, action, entity_type, entity_id, entity_label, user_email, ip_address, created_at')
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: false })
    .limit(200)

  const rows = (logs ?? []) as unknown as AuditRow[]

  return (
    <div className="p-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8B4B2D]">Audit</p>
          <h1 className="mt-2 text-2xl font-black text-[#24343a]">Audit Log</h1>
          <p className="text-sm text-muted-foreground mt-1">Immutable record of all activity in your organization.</p>
        </div>
        <Link href="/admin/audit-assistant" className="rounded-full bg-[#f37d6d] px-4 py-2 text-sm font-bold text-white">
          Run AI Audit
        </Link>
      </div>

      <div className="care-panel rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Time</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">User</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Role</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Action</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Resource</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground text-sm">
                    No audit events recorded yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">{formatDate(row.created_at)}</td>
                    <td className="px-5 py-3 text-foreground">{row.user_email ?? '—'}</td>
                    <td className="px-5 py-3 text-muted-foreground capitalize text-xs">—</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${actionColor(row.action)}`}>
                        {row.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      <span className="text-muted-foreground text-xs mr-1">{row.entity_type}</span>
                      {row.entity_label ? (
                        <span className="text-foreground">{row.entity_label}</span>
                      ) : row.entity_id ? (
                        <span className="font-mono text-xs text-muted-foreground">{row.entity_id.slice(0, 8)}...</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground font-mono text-xs">{row.ip_address ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
