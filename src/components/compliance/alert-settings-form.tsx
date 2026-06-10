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
        <label className="block text-[12px] font-semibold text-gray-700 mb-1">
          Deadline Warning Days
        </label>
        <p className="text-[11px] text-gray-500 mb-2">
          How many days before a deadline should an alert fire?
        </p>
        <input
          type="number"
          min={1}
          max={90}
          value={settings.deadlineWarningDays}
          onChange={(e) => setSettings((s) => ({ ...s, deadlineWarningDays: Number(e.target.value) }))}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px]"
        />
      </div>

      <div>
        <label className="block text-[12px] font-semibold text-gray-700 mb-1">
          Remind Interval (hours)
        </label>
        <p className="text-[11px] text-gray-500 mb-2">
          How often to re-alert on still-active issues.
        </p>
        <input
          type="number"
          min={1}
          max={168}
          value={settings.remindIntervalHours}
          onChange={(e) => setSettings((s) => ({ ...s, remindIntervalHours: Number(e.target.value) }))}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px]"
        />
      </div>

      <div className="space-y-3">
        <p className="text-[12px] font-semibold text-gray-700">Webhook Notifications</p>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.criticalWebhookEnabled}
            onChange={(e) => setSettings((s) => ({ ...s, criticalWebhookEnabled: e.target.checked }))}
            className="rounded border-gray-300"
          />
          <span className="text-[12px] text-gray-600">Send webhook for critical alerts</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.warningWebhookEnabled}
            onChange={(e) => setSettings((s) => ({ ...s, warningWebhookEnabled: e.target.checked }))}
            className="rounded border-gray-300"
          />
          <span className="text-[12px] text-gray-600">Send webhook for warning alerts</span>
        </label>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-xl py-2.5 text-[13px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #E8799E, #C8A8E8)' }}
      >
        {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save Settings'}
      </button>
    </div>
  )
}
