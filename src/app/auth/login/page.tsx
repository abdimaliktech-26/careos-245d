'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      // Step up to second factor when the account has verified MFA
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aal?.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel) {
        router.push('/auth/mfa')
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
      setLoading(false)
    }
  }

  return (
    <main className="grid min-h-screen grid-cols-1 bg-background lg:grid-cols-[0.95fr_1.05fr]">
      {/* Left panel — image */}
      <section className="relative hidden overflow-hidden lg:block rounded-r-3xl">
        <Image
          src="/homecare-tablet.jpg"
          alt="Caregiver helping an older adult with digital care documentation"
          fill
          priority
          sizes="(min-width: 1024px) 48vw, 100vw"
          className="object-cover"
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(124,58,237,0.85) 0%, rgba(124,58,237,0.2) 50%, transparent 100%)' }} />
        <div className="absolute bottom-10 left-10 right-10 rounded-3xl bg-card/95 p-6 shadow-2xl backdrop-blur">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">CareIntake 245D</p>
          <h1 className="mt-2 text-2xl font-black text-foreground">Audit-ready client packets without paper chasing.</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Track review deadlines, required signatures, branded documents, and staff activity from one secure workspace.
          </p>
        </div>
      </section>

      {/* Right panel — form */}
      <section className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-10 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-from to-brand-to text-white">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-black leading-none text-foreground">CareIntake</p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-primary">245D Suite</p>
            </div>
          </Link>

          <div className="rounded-3xl bg-card p-8 shadow-sm border border-border">
            <div className="mb-7">
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Secure sign in</p>
              <h2 className="mt-2 text-3xl font-black text-foreground">Welcome back</h2>
              <p className="mt-2 text-sm text-muted-foreground">Use your organization account to access clients, packets, signatures, and audits.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-foreground">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/15 transition"
                  placeholder="you@organization.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-foreground">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/15 transition"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-br from-brand-from to-brand-to px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-to/25 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"

              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
              <div className="text-center">
                <Link href="/auth/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
              </div>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link href="/" className="font-semibold hover:text-primary transition-colors">Back to home</Link>
          </p>
        </div>
      </section>
    </main>
  )
}
