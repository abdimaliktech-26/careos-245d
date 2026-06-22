'use client'

import { useCallback, useEffect, useState } from 'react'
import { ShieldCheck, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface TotpFactor {
  id: string
  friendly_name?: string
  status: string
}

/**
 * TOTP two-factor enrollment card (Supabase Auth MFA).
 * Enroll → scan QR → verify 6-digit code → factor active.
 */
export function MfaEnrollment() {
  const [factors, setFactors] = useState<TotpFactor[]>([])
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const refreshFactors = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase.auth.mfa.listFactors()
    setFactors((data?.totp ?? []) as TotpFactor[])
  }, [])

  useEffect(() => {
    // async — state update happens after the await, not synchronously in the effect
    void Promise.resolve().then(refreshFactors)
  }, [refreshFactors])

  async function startEnrollment() {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: `Authenticator ${new Date().toISOString().slice(0, 10)}`,
    })
    setLoading(false)
    if (enrollError || !data) {
      setError(enrollError?.message ?? 'Could not start enrollment.')
      return
    }
    setFactorId(data.id)
    setQrCode(data.totp.qr_code)
    setSecret(data.totp.secret)
  }

  async function verifyEnrollment() {
    if (!factorId || code.length !== 6) return
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
    if (challengeError || !challenge) {
      setLoading(false)
      setError(challengeError?.message ?? 'Challenge failed.')
      return
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    })
    setLoading(false)
    if (verifyError) {
      setError('Invalid code. Check your authenticator app and try again.')
      return
    }
    setQrCode(null)
    setSecret(null)
    setFactorId(null)
    setCode('')
    await refreshFactors()
  }

  async function removeFactor(id: string) {
    setError(null)
    const supabase = createClient()
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: id })
    if (unenrollError) {
      setError(unenrollError.message)
      return
    }
    await refreshFactors()
  }

  const activeFactors = factors.filter((f) => f.status === 'verified')

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
      <div className="mb-4 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <h2 className="text-[15px] font-bold text-foreground">Two-factor authentication</h2>
        {activeFactors.length > 0 && (
          <span className="rounded-full bg-status-ok-bg px-2 py-0.5 text-[10px] font-bold text-status-ok">
            Enabled
          </span>
        )}
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-status-error-bg px-3 py-2 text-[12px] text-status-error">{error}</p>
      )}

      {activeFactors.map((factor) => (
        <div key={factor.id} className="mb-2 flex items-center justify-between rounded-lg bg-muted px-3 py-2">
          <span className="text-[12px] font-medium text-foreground">
            {factor.friendly_name ?? 'Authenticator app'}
          </span>
          <button
            type="button"
            onClick={() => removeFactor(factor.id)}
            title="Remove this authenticator"
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-status-error-bg hover:text-status-error"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      {qrCode ? (
        <div className="space-y-3">
          <p className="text-[12px] text-muted-foreground">
            Scan with your authenticator app (Google Authenticator, 1Password, Authy…), then enter the 6-digit code.
          </p>
          {/* qr_code is an SVG data string from Supabase */}
          <div
            className="mx-auto w-44 rounded-lg bg-white p-2"
            dangerouslySetInnerHTML={{ __html: qrCode }}
          />
          {secret && (
            <p className="break-all text-center text-[10px] text-muted-foreground">
              Manual key: <code className="font-mono">{secret}</code>
            </p>
          )}
          <div className="flex gap-2">
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replaceAll(/\D/g, ''))}
              placeholder="123456"
              className="w-28 rounded-lg border border-input bg-card px-3 py-2 text-center font-mono text-sm tracking-widest text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/15"
            />
            <button
              type="button"
              onClick={verifyEnrollment}
              disabled={loading || code.length !== 6}
              className="rounded-lg bg-gradient-to-br from-brand-from to-brand-to px-4 py-2 text-[13px] font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Verify
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={startEnrollment}
          disabled={loading}
          className="rounded-lg border border-border px-4 py-2 text-[13px] font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          {activeFactors.length > 0 ? 'Add another authenticator' : 'Enable two-factor authentication'}
        </button>
      )}

      <p className="mt-3 text-[11px] text-muted-foreground">
        Recommended for all accounts handling client data (HIPAA access control).
      </p>
    </div>
  )
}
