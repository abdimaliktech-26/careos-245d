'use client'

import { useState } from 'react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json()
    if (data.error) setError(data.error)
    else setSent(true)
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold text-[#3A2A4A]">Check Your Email</h1>
          <p className="text-sm text-gray-500 mt-2">If an account exists for {email}, you&rsquo;ll receive a password reset link.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#3A2A4A]">Reset Password</h1>
          <p className="text-sm text-gray-500 mt-1">Enter your email to receive a reset link.</p>
        </div>
        {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.org"
          required
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
        />
        <button type="submit" className="w-full rounded-xl bg-[#E8799E] py-3 text-sm font-bold text-white hover:opacity-90">Send Reset Link</button>
        <a href="/auth/login" className="block text-center text-xs text-[#E8799E] hover:underline">Back to login</a>
      </form>
    </div>
  )
}
