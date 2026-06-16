'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

/**
 * Second-factor challenge shown after password sign-in when the
 * account has a verified TOTP factor (AAL1 -> AAL2 step-up).
 */
export default function MfaChallengePage() {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [factorId, setFactorId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadFactor() {
      const { data } = await supabase.auth.mfa.listFactors()
      const totp = data?.totp?.find((f) => f.status === 'verified')
      if (!totp) {
        router.replace('/')
        return
      }
      setFactorId(totp.id)
    }
    loadFactor()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!factorId || code.length !== 6 || loading) return
    setLoading(true)
    setError(null)
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
    if (challengeError || !challenge) {
      setLoading(false)
      setError(challengeError?.message ?? 'Could not start verification.')
      return
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    })
    if (verifyError) {
      setLoading(false)
      setError('Invalid code. Try again.')
      return
    }
    router.push('/')
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-xs">
        <div className="mb-5 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-from to-brand-to">
            <ShieldCheck className="h-4 w-4 text-white" />
          </span>
          <div>
            <h1 className="text-lg font-bold leading-tight text-foreground">Two-factor check</h1>
            <p className="text-[12px] text-muted-foreground">Enter the code from your authenticator app</p>
          </div>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <input
            autoFocus
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replaceAll(/\D/g, ''))}
            placeholder="123456"
            className="w-full rounded-xl border border-input bg-card px-4 py-3 text-center font-mono text-xl tracking-[0.5em] text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/15"
          />
          {error && (
            <p className="rounded-lg bg-status-error-bg px-3 py-2 text-[12px] text-status-error">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full rounded-xl bg-gradient-to-br from-brand-from to-brand-to px-5 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Verifying…' : 'Verify'}
          </button>
        </form>
      </div>
    </main>
  )
}
