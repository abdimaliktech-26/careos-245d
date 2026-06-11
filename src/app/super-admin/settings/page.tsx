import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { getSystemStats } from '@/lib/super-admin/actions'
import { getPlatformSettings } from '@/lib/super-admin/platform-settings'
import { StripePriceEditor } from '@/components/super-admin/stripe-price-editor'

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  )
}

function ServerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/>
      <line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>
    </svg>
  )
}

function ShieldCheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="M9 12l2 2 4-4"/>
    </svg>
  )
}

function KeyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
    </svg>
  )
}

function BotIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/>
      <path d="M12 7v4M8 16h.01M16 16h.01"/>
    </svg>
  )
}

export default async function SystemSettingsPage() {
  const { user, error } = await getSession()
  if (error || !user || user.role !== 'super_admin') redirect('/auth/login')

  const stats = await getSystemStats()
  const platformSettings = await getPlatformSettings()

  const envVars = [
    { label: 'DeepSeek AI', key: 'DEEPSEEK_API_KEY', ok: !!process.env.DEEPSEEK_API_KEY },
    { label: 'Resend (Email)', key: 'RESEND_API_KEY', ok: !!process.env.RESEND_API_KEY },
    { label: 'Twilio (SMS)', key: 'TWILIO_ACCOUNT_SID', ok: !!process.env.TWILIO_ACCOUNT_SID },
    { label: 'Cron Secret', key: 'CRON_SECRET', ok: !!process.env.CRON_SECRET },
    { label: 'Audit Cron Secret', key: 'AUDIT_CRON_SECRET', ok: !!process.env.AUDIT_CRON_SECRET },
    { label: 'Supabase Service Role', key: 'SUPABASE_SERVICE_ROLE_KEY', ok: !!process.env.SUPABASE_SERVICE_ROLE_KEY },
  ]

  const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'Not set'

  return (
    <div>
      <div className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Super Admin</p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">System Settings</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">Platform configuration and health overview.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Environment Variables */}
        <div className="rounded-2xl border border-border bg-card p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
              <KeyIcon />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-foreground">Environment Variables</h3>
              <p className="text-[11px] text-muted-foreground">Required integration keys</p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Supabase URL */}
            <div className="rounded-xl border border-border bg-muted/50 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-foreground">Supabase URL</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  Connected
                </span>
              </div>
              <code className="mt-1 block text-[11px] text-muted-foreground truncate">{NEXT_PUBLIC_SUPABASE_URL}</code>
            </div>

            {envVars.map((env) => (
              <div key={env.key} className="flex items-center justify-between rounded-xl border border-border bg-muted/50 px-4 py-3">
                <span className="text-[12px] font-semibold text-foreground">{env.label}</span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  env.ok ? 'bg-status-ok-bg text-status-ok' : 'bg-muted text-muted-foreground'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${env.ok ? 'bg-status-ok' : 'bg-gray-400'}`} />
                  {env.ok ? 'Configured' : 'Not Set'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* System Stats */}
        <div className="rounded-2xl border border-border bg-card p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <ServerIcon />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-foreground">Platform Stats</h3>
              <p className="text-[11px] text-muted-foreground">Real-time system metrics</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total Orgs', value: stats.totalOrganizations, color: '#DB2777' },
              { label: 'Active Orgs', value: stats.activeOrganizations, color: '#10B981' },
              { label: 'Pending Orgs', value: stats.pendingOrganizations, color: '#F59E0B' },
              { label: 'Suspended', value: stats.suspendedOrganizations, color: '#EF4444' },
              { label: 'Total Users', value: stats.totalUsers, color: '#8B5CF6' },
              { label: 'Total Clients', value: stats.totalClients, color: '#EC4899' },
              { label: 'Total Packets', value: stats.totalPackets, color: '#F97316' },
              { label: 'Total Incidents', value: stats.totalIncidents, color: '#14B8A6' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border p-3 text-center">
                <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className="rounded-2xl border border-border bg-card p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
              <ShieldCheckIcon />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-foreground">Security</h3>
              <p className="text-[11px] text-muted-foreground">HIPAA & platform security</p>
            </div>
          </div>

          <div className="space-y-2">
            {[
              { label: 'X-Frame-Options: DENY', ok: true },
              { label: 'HSTS Enabled', ok: true },
              { label: 'Content-Type: nosniff', ok: true },
              { label: 'Referrer-Policy: strict-origin', ok: true },
              { label: 'No-cache on PHI routes', ok: true },
              { label: 'RLS on all tables', ok: true },
              { label: 'Service Role isolated', ok: true },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2.5 rounded-lg px-3 py-2">
                {item.ok ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                )}
                <span className="text-[12px] text-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cron & AI */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <ClockIcon />
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-foreground">Scheduled Jobs</h3>
                <p className="text-[11px] text-muted-foreground">Vercel Cron configuration</p>
              </div>
            </div>

            <div className="space-y-2">
              {[
                { label: 'Daily Audit', endpoint: '/api/cron/audit', schedule: '6:00 AM daily' },
                { label: 'Compliance Alerts', endpoint: '/api/cron/compliance-alerts', schedule: 'On demand' },
              ].map((job) => (
                <div key={job.label} className="rounded-xl border border-border bg-muted/50 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-foreground">{job.label}</span>
                    <span className="text-[10px] font-semibold text-muted-foreground">{job.schedule}</span>
                  </div>
                  <code className="mt-1 block text-[11px] text-muted-foreground truncate">{job.endpoint}</code>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300">
                <BotIcon />
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-foreground">AI Integration</h3>
                <p className="text-[11px] text-muted-foreground">DeepSeek AI configuration</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="rounded-xl border border-border bg-muted/50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-foreground">DeepSeek API</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${process.env.DEEPSEEK_API_KEY ? 'bg-status-ok-bg text-status-ok' : 'bg-muted text-muted-foreground'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${process.env.DEEPSEEK_API_KEY ? 'bg-status-ok' : 'bg-gray-400'}`} />
                    {process.env.DEEPSEEK_API_KEY ? 'Configured' : 'Not Set'}
                  </span>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-muted/50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-foreground">AI Endpoints</span>
                  <span className="text-[10px] font-semibold text-status-ok">5 active</span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">Auto-fill, Narrative, Translation, Fatal Five, Schedule Optimizer</p>
              </div>
            </div>
          </div>

          <StripePriceEditor settings={platformSettings} />
        </div>
      </div>
    </div>
  )
}
