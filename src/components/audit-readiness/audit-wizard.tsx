'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronLeft, ChevronRight, Loader2, Users, UserCog, AlertTriangle } from 'lucide-react'
import { createAuditReview } from '@/lib/audit-readiness/actions'

const PROGRAMS = ['ICS', 'IHS', 'ICLS', 'CRS', 'Employment Services'] as const

const STEPS = [
  'Organization Information',
  'Select Programs',
  'Review Client Files',
  'Review Staff Files',
  'Review Incident Reports',
  'Generate Audit Results',
] as const

interface AuditWizardProps {
  organizationName: string
  counts: { clients: number; staff: number; incidents: number }
}

export function AuditWizard({ organizationName, counts }: AuditWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [title, setTitle] = useState('Audit Readiness Review')
  const [orgName, setOrgName] = useState(organizationName)
  const [programs, setPrograms] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [pending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const toggleProgram = (p: string) =>
    setPrograms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]))

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1))
  const back = () => setStep((s) => Math.max(s - 1, 0))

  const generate = () => {
    setErrorMsg(null)
    startTransition(async () => {
      const res = await createAuditReview({ title, programs, notes })
      if (res.error || !res.data) {
        setErrorMsg(res.error ?? 'Failed to generate audit results.')
        return
      }
      router.push(`/audit-readiness/reports/${res.data.id}`)
    })
  }

  return (
    <div className="rounded-2xl border border-border bg-card" style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
      {/* Stepper */}
      <div className="flex flex-wrap gap-2 border-b border-border px-6 py-4">
        {STEPS.map((label, i) => {
          const done = i < step
          const active = i === step
          return (
            <div key={label} className="flex items-center gap-2">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                done ? 'bg-status-ok text-white' : active ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
              }`}>
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className={`text-[12px] font-medium ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
              {i < STEPS.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />}
            </div>
          )
        })}
      </div>

      <div className="px-6 py-8">
        {step === 0 && (
          <div className="max-w-xl space-y-4">
            <Field label="Review Title">
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Organization">
              <input value={orgName} onChange={(e) => setOrgName(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Notes (optional)">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass} />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="max-w-xl">
            <p className="mb-3 text-[13px] text-muted-foreground">Select the program types included in this audit.</p>
            <div className="flex flex-wrap gap-2">
              {PROGRAMS.map((p) => {
                const selected = programs.includes(p)
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => toggleProgram(p)}
                    className={`rounded-full border px-4 py-2 text-[13px] font-medium transition-colors ${
                      selected ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    {selected && <Check className="mr-1.5 inline h-3.5 w-3.5" />}
                    {p}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {step === 2 && <ReviewStep Icon={Users} label="Client Files" value={counts.clients} note="All client documentation will be analyzed for missing reviews, signatures, and support plans." />}
        {step === 3 && <ReviewStep Icon={UserCog} label="Staff Files" value={counts.staff} note="Staff training, certifications, background studies, and designated roles will be checked." />}
        {step === 4 && <ReviewStep Icon={AlertTriangle} label="Open Incidents" value={counts.incidents} note="Open incidents will be summarized in the audit results." />}

        {step === 5 && (
          <div className="max-w-xl">
            <h3 className="text-[15px] font-semibold text-foreground">Ready to generate</h3>
            <p className="mt-1 text-[13px] text-muted-foreground">
              The AI risk engine will analyze {counts.clients} client file(s) and {counts.staff} staff record(s), score
              compliance, and produce findings. This creates a saved audit you can review, export, and track.
            </p>
            {programs.length > 0 && (
              <p className="mt-3 text-[12px] text-muted-foreground">Programs: {programs.join(', ')}</p>
            )}
            {errorMsg && <p className="mt-3 text-[13px] text-status-error">{errorMsg}</p>}
            <button
              type="button"
              onClick={generate}
              disabled={pending}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-brand-from to-brand-to px-5 py-3 text-[13px] font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {pending ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</> : 'Generate Audit Results'}
            </button>
          </div>
        )}
      </div>

      {/* Footer nav */}
      <div className="flex items-center justify-between border-t border-border px-6 py-4">
        <button type="button" onClick={back} disabled={step === 0 || pending} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[12px] font-semibold text-foreground transition-colors hover:bg-muted/50 disabled:opacity-40">
          <ChevronLeft className="h-[14px] w-[14px]" /> Back
        </button>
        {step < STEPS.length - 1 && (
          <button type="button" onClick={next} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90">
            Next <ChevronRight className="h-[14px] w-[14px]" />
          </button>
        )}
      </div>
    </div>
  )
}

const inputClass = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none focus:border-primary'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold text-foreground">{label}</span>
      {children}
    </label>
  )
}

function ReviewStep({ Icon, label, value, note }: { Icon: typeof Users; label: string; value: number; note: string }) {
  return (
    <div className="flex max-w-xl items-start gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-[26px] font-bold leading-none text-foreground">{value}</p>
        <p className="mt-1 text-[13px] font-semibold text-foreground">{label} to review</p>
        <p className="mt-2 text-[12px] text-muted-foreground">{note}</p>
      </div>
    </div>
  )
}
