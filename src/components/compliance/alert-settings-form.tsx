'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Settings = {
  deadlineWarningDays: number
  remindIntervalHours: number
  criticalWebhookEnabled: boolean
  warningWebhookEnabled: boolean
}

export function AlertSettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter()
  const [settings, setSettings] = useState<Settings>(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/compliance/alerts/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
        router.refresh()
      }
    } catch {} finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-[12px] font-semibold text-foreground mb-1">
          Deadline Warning Days
        </label>
        <p className="text-[11px] text-muted-foreground mb-2">
          How many days before a deadline should an alert fire?
        </p>
        <input
          type="number"
          min={1}
          max={90}
          value={settings.deadlineWarningDays}
          onChange={(e) => setSettings((s) => ({ ...s, deadlineWarningDays: Number(e.target.value) }))}
          className="w-full rounded-xl border border-border px-3 py-2 text-[13px]"
        />
      </div>

      <div>
        <label className="block text-[12px] font-semibold text-foreground mb-1">
          Remind Interval (hours)
        </label>
        <p className="text-[11px] text-muted-foreground mb-2">
          How often to re-alert on still-active issues.
        </p>
        <input
          type="number"
          min={1}
          max={168}
          value={settings.remindIntervalHours}
          onChange={(e) => setSettings((s) => ({ ...s, remindIntervalHours: Number(e.target.value) }))}
          className="w-full rounded-xl border border-border px-3 py-2 text-[13px]"
        />
      </div>

      <div className="space-y-3">
        <p className="text-[12px] font-semibold text-foreground">Webhook Notifications</p>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.criticalWebhookEnabled}
            onChange={(e) => setSettings((s) => ({ ...s, criticalWebhookEnabled: e.target.checked }))}
            className="rounded border-gray-300"
          />
          <span className="text-[12px] text-muted-foreground">Send webhook for critical alerts</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.warningWebhookEnabled}
            onChange={(e) => setSettings((s) => ({ ...s, warningWebhookEnabled: e.target.checked }))}
            className="rounded border-gray-300"
          />
          <span className="text-[12px] text-muted-foreground">Send webhook for warning alerts</span>
        </label>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-xl bg-gradient-to-br from-brand-from to-brand-to py-2.5 text-[13px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save Settings'}
      </button>
    </div>
  )
}
