'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MfaEnrollment } from '@/components/auth/mfa-enrollment'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
        redirect: 'manual',
      })

      const contentType = res.headers.get('content-type') ?? ''
      if (!contentType.includes('application/json')) {
        setError(`Unexpected response (HTTP ${res.status}). Try signing in again.`)
        setLoading(false)
        return
      }

      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error ?? `Update failed (HTTP ${res.status}).`)
        setLoading(false)
        return
      }

      router.push('/')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <div className="w-full max-w-sm space-y-6">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Set New Password</h1>
          <p className="text-sm text-muted-foreground mt-1">Must be at least 8 characters.</p>
        </div>
        {error && <p className="text-xs text-status-error bg-status-error-bg px-3 py-2 rounded-lg">{error}</p>}
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password"
          minLength={8}
          autoComplete="new-password"
          required
          className="w-full rounded-xl border border-border px-4 py-3 text-sm"
        />
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm new password"
          minLength={8}
          autoComplete="new-password"
          required
          className="w-full rounded-xl border border-border px-4 py-3 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
        >
          {loading ? 'Updating…' : 'Update Password'}
        </button>
      </form>

      <MfaEnrollment />
      </div>
    </div>
  )
}
