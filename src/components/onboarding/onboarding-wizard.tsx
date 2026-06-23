'use client'

import { useState, useEffect } from 'react'
import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import {
  saveOrganizationSettings,
  inviteTeamMembers,
  createFirstClient,
  completeOnboarding,
} from '@/lib/onboarding/actions'

const STEPS = [
  { id: 'welcome', title: 'Welcome to Higsi' },
  { id: 'profile', title: 'Complete Your Profile' },
  { id: 'team', title: 'Invite Your Team' },
  { id: 'clients', title: 'Add Clients' },
  { id: 'done', title: "You're All Set" },
]

const initialState = { error: null, success: false }

export function OnboardingWizard() {
  const [step, setStep] = useState(0)
  const router = useRouter()

  const [profileState, profileAction, profilePending] = useActionState(saveOrganizationSettings, initialState)
  const [teamState, teamAction, teamPending] = useActionState(inviteTeamMembers, initialState)
  const [clientState, clientAction, clientPending] = useActionState(createFirstClient, initialState)
  const [doneState, doneAction, donePending] = useActionState(completeOnboarding, initialState)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (profileState.success) setStep(2)
  }, [profileState.success])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (teamState.success) setStep(3)
  }, [teamState.success])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (clientState.success) setStep(4)
  }, [clientState.success])

  useEffect(() => {
    if (doneState.success) router.push('/dashboard')
  }, [doneState.success, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F8FAFC] to-[#EEF2FF] p-8">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                i <= step ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
              }`}>
                {i < step ? '\u2713' : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 transition-all ${i < step ? 'bg-primary' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="rounded-2xl border border-border bg-card p-8" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          {step === 0 && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#10B99A] to-[#A78BFA]">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
              </div>
              <h1 className="text-2xl font-bold text-foreground">Welcome to Higsi</h1>
              <p className="text-sm text-muted-foreground">Your 245D compliance management suite. Let&apos;s get you set up in a few steps.</p>
            </div>
          )}

          {step === 1 && (
            <form action={profileAction} className="space-y-4">
              <h2 className="text-lg font-bold text-foreground">Complete Your Profile</h2>

              {profileState.error && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {profileState.error}
                </p>
              )}

              <div>
                <label className="text-xs font-medium text-foreground">Organization Name</label>
                <input
                  name="name"
                  type="text"
                  required
                  className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/15 focus:border-ring"
                  placeholder="e.g. Stillwater Supports"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground">License Number</label>
                  <input
                    name="licenseNumber"
                    type="text"
                    className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/15 focus:border-ring"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Phone</label>
                  <input
                    name="phone"
                    type="tel"
                    className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/15 focus:border-ring"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <button type="button" onClick={() => setStep(0)} className="text-xs font-semibold text-muted-foreground hover:text-foreground">Back</button>
                <button
                  type="submit"
                  disabled={profilePending}
                  className="rounded-lg bg-primary px-6 py-2.5 text-xs font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {profilePending ? 'Saving...' : 'Continue'}
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <form action={teamAction} className="space-y-4">
              <h2 className="text-lg font-bold text-foreground">Invite Your Team</h2>
              <p className="text-sm text-muted-foreground">Add your first team members. They&apos;ll receive an email invitation. Leave blank to skip.</p>

              {teamState.error && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {teamState.error}
                </p>
              )}

              {teamState.success && (
                <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                  Team member invited.
                </p>
              )}

              <div>
                <label className="text-xs font-medium text-foreground">Email Address</label>
                <input
                  name="email"
                  type="email"
                  className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/15 focus:border-ring"
                  placeholder="colleague@example.org"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground">Role</label>
                  <select
                    name="role"
                    className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/15 focus:border-ring bg-card"
                  >
                    <option value="program_manager">Program Manager</option>
                    <option value="staff">Staff</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Name</label>
                  <input
                    name="name"
                    type="text"
                    className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/15 focus:border-ring"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <button type="button" onClick={() => setStep(1)} className="text-xs font-semibold text-muted-foreground hover:text-foreground">Back</button>
                <button
                  type="submit"
                  disabled={teamPending}
                  className="rounded-lg bg-primary px-6 py-2.5 text-xs font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {teamPending ? 'Saving...' : 'Continue'}
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form action={clientAction} className="space-y-4">
              <h2 className="text-lg font-bold text-foreground">Add Your First Client</h2>
              <p className="text-sm text-muted-foreground">Start tracking compliance for someone you support. Leave blank to skip.</p>

              {clientState.error && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {clientState.error}
                </p>
              )}

              {clientState.success && (
                <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                  Client added.
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground">First Name</label>
                  <input
                    name="firstName"
                    type="text"
                    className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/15 focus:border-ring"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Last Name</label>
                  <input
                    name="lastName"
                    type="text"
                    className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/15 focus:border-ring"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">Program</label>
                <select
                  name="program"
                  className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/15 focus:border-ring bg-card"
                >
                  <option value="ICS">ICS</option>
                  <option value="PCA">PCA</option>
                  <option value="CDCS">CDCS</option>
                  <option value="CFSS">CFSS</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <button type="button" onClick={() => setStep(2)} className="text-xs font-semibold text-muted-foreground hover:text-foreground">Back</button>
                <button
                  type="submit"
                  disabled={clientPending}
                  className="rounded-lg bg-primary px-6 py-2.5 text-xs font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {clientPending ? 'Saving...' : 'Continue'}
                </button>
              </div>
            </form>
          )}

          {step === 4 && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              </div>
              <h1 className="text-2xl font-bold text-foreground">You&apos;re All Set!</h1>
              <p className="text-sm text-muted-foreground">Your workspace is ready. Start managing compliance, schedules, and billing.</p>

              {doneState.error && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {doneState.error}
                </p>
              )}

              <form action={doneAction}>
                <button
                  type="submit"
                  disabled={donePending}
                  className="rounded-lg bg-primary px-6 py-2.5 text-xs font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {donePending ? 'Finishing...' : 'Go to Dashboard'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
