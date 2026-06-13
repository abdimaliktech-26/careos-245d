'use client'

import { useState } from 'react'
import { Sparkles, RefreshCw } from 'lucide-react'

export function EvvAiInsightsCard() {
  const [insights, setInsights] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/evv-insights', { method: 'POST' })
      const data = (await res.json().catch(() => null)) as
        | { insights?: string; error?: string }
        | null
      if (!res.ok || !data?.insights) {
        setError(data?.error ?? 'Could not generate insights.')
        return
      }
      setInsights(data.insights)
    } catch {
      setError('Network error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-card" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-brand-from to-brand-to">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </span>
          <h2 className="text-[13px] font-bold text-foreground">Compliance insights</h2>
          <span className="rounded-full bg-accent px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent-foreground">
            AI-generated · advisory only
          </span>
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[11px] font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          {insights ? 'Refresh' : 'Analyze last 30 days'}
        </button>
      </div>
      {(insights || error || loading) && (
        <div className="border-t border-border px-5 py-3.5">
          {error ? (
            <p className="text-[12px] text-status-error">{error}</p>
          ) : insights ? (
            <p className="whitespace-pre-line text-[13px] leading-6 text-foreground">{insights}</p>
          ) : (
            <p className="text-[12px] text-muted-foreground">Reviewing visits, exceptions, and billing readiness…</p>
          )}
        </div>
      )}
    </div>
  )
}
