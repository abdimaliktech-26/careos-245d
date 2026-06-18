'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function CreateOrgForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: 'MN',
    zip: '',
  })
  const [plan, setPlan] = useState('trial')
  const [trialDays, setTrialDays] = useState(30)
  const [createAdmin, setCreateAdmin] = useState(true)
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState(form.email)
  const [result, setResult] = useState<{ orgId: string; adminEmail?: string; adminPassword?: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const body = JSON.stringify({
        ...form,
        plan,
        trialDays: plan === 'trial' ? trialDays : undefined,
        createAdmin,
        adminName: createAdmin ? adminName.trim() : undefined,
        adminEmail: createAdmin ? adminEmail.trim() : undefined,
      })

      const res = await fetch('/super-admin/api/create-organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to create organization')
        return
      }
      if (createAdmin && data.adminPassword) {
        setResult({ orgId: data.id, adminEmail: adminEmail.trim(), adminPassword: data.adminPassword })
      } else if (createAdmin && data.adminError) {
        // Org was created but the admin account failed — don't navigate away silently.
        setError(`Organization created, but the admin login failed: ${data.adminError}. Create the admin from the Users page.`)
      } else {
        router.push(`/super-admin/organizations/${data.id}`)
        router.refresh()
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const showAdminFields = createAdmin

  if (result) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-[14px] font-bold text-emerald-800">Organization created</p>
          {result.adminPassword && (
            <div className="mt-3 space-y-2 text-[13px] text-emerald-700">
              <p><span className="font-semibold">Admin Email:</span> {result.adminEmail}</p>
              <p>
                <span className="font-semibold">Temporary Password:</span>{' '}
                <code className="rounded-md bg-emerald-100 px-2 py-0.5 text-[12px] font-mono text-emerald-900 select-all">
                  {result.adminPassword}
                </code>
              </p>
            </div>
          )}
          <p className="mt-3 text-[11px] text-emerald-600">
            Copy this password — it won&apos;t be shown again. The admin will be prompted to change it on first login.
          </p>
        </div>
        <button
          onClick={() => router.push(`/super-admin/organizations/${result.orgId}`)}
          className="w-full rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: 'var(--gradient-primary)' }}
        >
          View Organization
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-[12px] font-semibold text-foreground mb-1">Organization Name *</label>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          placeholder="e.g. Stillwater Supports"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[12px] font-semibold text-foreground mb-1">Org Email</label>
          <Input type="email" value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); if (!adminEmail) setAdminEmail(e.target.value) }} placeholder="admin@org.com" />
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-foreground mb-1">Phone</label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(612) 555-0100" />
        </div>
      </div>
      <div>
        <label className="block text-[12px] font-semibold text-foreground mb-1">Address</label>
        <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Main St" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-[12px] font-semibold text-foreground mb-1">City</label>
          <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Minneapolis" />
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-foreground mb-1">State</label>
          <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="MN" />
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-foreground mb-1">ZIP</label>
          <Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} placeholder="55401" />
        </div>
      </div>

      {/* Subscription */}
      <div className="rounded-xl border border-border bg-muted/40 p-4">
        <p className="mb-3 text-[12px] font-semibold text-foreground">Subscription</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground mb-1">Plan</label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/15"
            >
              <option value="trial">Trial (no card)</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          {plan === 'trial' && (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground mb-1">Trial length (days)</label>
              <Input
                type="number"
                min={1}
                max={120}
                value={trialDays}
                onChange={(e) => setTrialDays(Number(e.target.value) || 30)}
              />
            </div>
          )}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {plan === 'trial'
            ? 'Org starts on a free trial; they subscribe via Stripe from Admin → Settings before it expires.'
            : 'Paid plan is provisioned manually — Stripe billing must be set up by the org admin in Admin → Settings (their checkout will sync the plan).'}
        </p>
      </div>

      {/* Admin user creation */}
      <div className="rounded-xl border border-border bg-muted/40 p-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={createAdmin}
            onChange={(e) => setCreateAdmin(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-ring"
          />
          <span className="text-[12px] font-semibold text-foreground">Create admin account for this organization</span>
        </label>

        {showAdminFields && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground mb-1">Admin Name</label>
              <Input
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="Jane Doe"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground mb-1">Admin Email</label>
              <Input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="jane@org.com"
              />
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-[12px] text-red-600">{error}</p>}
      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading}>{createAdmin ? 'Create Organization & Admin' : 'Create Organization'}</Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  )
}
