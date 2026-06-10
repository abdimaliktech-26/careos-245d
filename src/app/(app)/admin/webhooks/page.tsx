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
        <p className="text-xs font-semibold tracking-[0.16em] text-gray-400 uppercase mb-2">Admin</p>
        <h1 className="text-3xl font-bold text-[#3A2A4A]">Webhook Delivery Log</h1>
        <p className="text-gray-500 mt-1">Delivery history for all Slack and Teams webhook notifications.</p>
      </div>

      {(!logs || logs.length === 0) ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p className="text-sm text-gray-400">No webhook deliveries yet.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-50 text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400">
                  <th className="px-5 py-3">Event</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Sent At</th>
                  <th className="px-5 py-3">Response</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log) => (
                  <tr key={log.id} className="text-sm">
                    <td className="px-5 py-3 font-medium text-[#3A2A4A]">{log.event_type}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                        {log.webhook_type}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${log.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {log.success ? 'Delivered' : 'Failed'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{new Date(log.sent_at).toLocaleString()}</td>
                    <td className="px-5 py-3">
                      {log.response_status && <span className="text-xs text-gray-500">{log.response_status}</span>}
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
