'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { setOrgState } from '@/lib/evv/states/actions'

type StateOption = { code: string; name: string; defaultVendor: string }

export function EvvStateSelector({ options, current }: { options: StateOption[]; current: string }) {
  const router = useRouter()
  const [err, setErr] = useState('')
  const [saved, setSaved] = useState(false)

  return (
    <section className="mb-6 rounded-2xl border border-border bg-card p-5">
      <h2 className="text-[14px] font-semibold text-foreground">Operating state</h2>
      <p className="mt-0.5 mb-3 text-[12px] text-muted-foreground">
        Sets the EVV rules (geofence, grace periods) and the default aggregator for this organization.
      </p>
      <form
        action={async (fd: FormData) => {
          setErr(''); setSaved(false)
          const r = await setOrgState(String(fd.get('state') || ''))
          if (r.error) { setErr(r.error); return }
          setSaved(true); router.refresh()
        }}
        className="flex items-center gap-2"
      >
        <select name="state" defaultValue={current} className="rounded-lg border border-input bg-card px-3 py-1.5 text-[13px]">
          {options.map((o) => (
            <option key={o.code} value={o.code}>{o.name} ({o.code}) — {o.defaultVendor}</option>
          ))}
        </select>
        <button type="submit" className="rounded-lg border border-border px-3 py-1.5 text-[12px] font-semibold hover:bg-muted">Save</button>
        {saved && <span className="text-[12px] text-status-ok">Saved</span>}
      </form>
      {err && <p className="mt-2 text-[12px] text-status-error">{err}</p>}
    </section>
  )
}
