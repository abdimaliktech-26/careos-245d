'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#3A2A4A]">Set New Password</h1>
          <p className="text-sm text-gray-500 mt-1">Must be at least 8 characters.</p>
        </div>
        {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password"
          minLength={8}
          autoComplete="new-password"
          required
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
        />
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm new password"
          minLength={8}
          autoComplete="new-password"
          required
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[#E8799E] py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
        >
          {loading ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </div>
  )
}
