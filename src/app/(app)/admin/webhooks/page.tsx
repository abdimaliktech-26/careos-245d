import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'

export default async function WebhookLogsPage() {
  const { user, error } = await getSession()
  if (error || !user || !['org_admin', 'super_admin'].includes(user.role)) redirect('/dashboard')

  const supabase = await createClient()
  const { data: logs } = await supabase
    .from('webhook_logs')
    .select('*')
    .eq('organization_id', user.organizationId)
    .order('sent_at', { ascending: false })
    .limit(100)

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase mb-2">Admin</p>
        <h1 className="text-3xl font-bold text-foreground">Webhook Delivery Log</h1>
        <p className="text-muted-foreground mt-1">Delivery history for all Slack and Teams webhook notifications.</p>
      </div>

      {(!logs || logs.length === 0) ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p className="text-sm text-muted-foreground">No webhook deliveries yet.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-50 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  <th className="px-5 py-3">Event</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Sent At</th>
                  <th className="px-5 py-3">Response</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {logs.map((log) => (
                  <tr key={log.id} className="text-sm">
                    <td className="px-5 py-3 font-medium text-foreground">{log.event_type}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {log.webhook_type}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${log.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {log.success ? 'Delivered' : 'Failed'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{new Date(log.sent_at).toLocaleString()}</td>
                    <td className="px-5 py-3">
                      {log.response_status && <span className="text-xs text-muted-foreground">{log.response_status}</span>}
                      {log.error_message && <span className="text-xs text-red-500 ml-1">{log.error_message}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
