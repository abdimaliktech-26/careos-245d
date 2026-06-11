'use client'

import { useState } from 'react'

type PacketFormItem = {
  id: string
  packet_id: string
  form_templates: { code: string; name: string } | null
  clients: { legal_name: string } | null
}

export function BatchSigningForm({ packetForms }: { packetForms: PacketFormItem[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [signerName, setSignerName] = useState('')
  const [signerEmail, setSignerEmail] = useState('')
  const [signerRole, setSignerRole] = useState<'client' | 'guardian'>('guardian')
  const [sendEmail, setSendEmail] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [links, setLinks] = useState<{ packetFormId: string; link: string; error?: string }[]>([])
  const [, setResultError] = useState<string | null>(null)

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === packetForms.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(packetForms.map(p => p.id)))
    }
  }

  const handleGenerate = async () => {
    if (selected.size === 0) return
    setGenerating(true)
    setResultError(null)
    setLinks([])

    const results: { packetFormId: string; link: string; error?: string }[] = []

    for (const pfId of selected) {
      const formData = new FormData()
      formData.set('packetFormId', pfId)
      formData.set('signerName', signerName)
      formData.set('signerEmail', signerEmail)
      formData.set('signerRole', signerRole)
      formData.set('sendEmail', sendEmail ? 'true' : 'false')

      try {
        const res = await fetch('/api/signing-links/create', {
          method: 'POST',
          body: formData,
        })
        const data = await res.json()
        if (data.link) {
          results.push({ packetFormId: pfId, link: data.link })
        } else {
          results.push({ packetFormId: pfId, link: '', error: data.error ?? 'Unknown error' })
        }
      } catch {
        results.push({ packetFormId: pfId, link: '', error: 'Network error' })
      }
    }

    setLinks(results)
    setGenerating(false)
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
          Batch Signing Links ({selected.size} selected)
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <select
            value={signerRole}
            onChange={e => setSignerRole(e.target.value as 'client' | 'guardian')}
            className="rounded-lg border border-border px-3 py-2 text-xs bg-card"
          >
            <option value="guardian">Guardian</option>
            <option value="client">Client</option>
          </select>
          <input
            value={signerName}
            onChange={e => setSignerName(e.target.value)}
            required
            className="rounded-lg border border-border px-3 py-2 text-xs"
            placeholder="Signer name"
          />
          <input
            value={signerEmail}
            onChange={e => setSignerEmail(e.target.value)}
            className="rounded-lg border border-border px-3 py-2 text-xs"
            placeholder="Email (optional)"
          />
        </div>

        <label className="flex cursor-pointer items-center gap-1.5">
          <input
            type="checkbox"
            checked={sendEmail}
            onChange={e => setSendEmail(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-gray-300 text-primary"
          />
          <span className="text-xs text-muted-foreground">Send email notification</span>
        </label>

        <button
          onClick={handleGenerate}
          disabled={selected.size === 0 || !signerName || generating}
          className="w-full rounded-lg bg-primary py-2.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-40"
        >
          {generating ? 'Generating...' : `Generate Links for ${selected.size} Form(s)`}
        </button>
      </div>

      {packetForms.length > 0 && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="px-4 py-3 flex items-center gap-2 border-b border-border">
            <input
              type="checkbox"
              checked={selected.size === packetForms.length}
              onChange={toggleAll}
              className="rounded border-gray-300"
            />
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Select All ({packetForms.length})
            </span>
          </div>
          <div className="divide-y divide-border/60 max-h-96 overflow-y-auto">
            {packetForms.map(pf => (
              <label key={pf.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.has(pf.id)}
                  onChange={() => toggle(pf.id)}
                  className="rounded border-gray-300"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {pf.form_templates?.name ?? 'Unknown Form'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {pf.form_templates?.code ?? ''} &middot; {pf.clients?.legal_name ?? '—'}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {links.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">Generated Links</p>
          <div className="space-y-2">
            {links.map(l => (
              <div key={l.packetFormId} className="rounded-lg bg-muted p-3">
                {l.error ? (
                  <p className="text-xs text-red-600">Error: {l.error}</p>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-xs text-primary break-all flex-1">{baseUrl}{l.link}</code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${baseUrl}${l.link}`)
                      }}
                      className="shrink-0 rounded-md bg-primary px-2.5 py-1 text-[10px] font-semibold text-white hover:opacity-90"
                    >
                      Copy
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
