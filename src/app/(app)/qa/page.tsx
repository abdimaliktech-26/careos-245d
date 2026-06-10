import Link from 'next/link'

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

function BarChartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  )
}

function ClipboardCheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  )
}

function DollarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  )
}

export default function QAPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Hero */}
      <section className="bg-gradient-to-br from-[#EEF2FF] via-white to-white border-b border-[#E5E7EB]">
        <div className="mx-auto max-w-4xl px-5 py-16 sm:px-8 sm:py-20 text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#C7D2FE] bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-[#E8799E]">
            <ClipboardCheckIcon />
            Quality Assurance
          </div>
          <h1 className="text-4xl font-black leading-[1.1] tracking-tight text-[#111827] sm:text-5xl">
            Quality Assurance Compliance<br />and Audit Solution
          </h1>
          <p className="mx-auto mt-4 text-lg font-semibold text-[#E8799E]">
            Meaningful, Measurable, Manageable.
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[#6B7280]">
            Configurable options to assess organizational performance and comply with
            accreditation and regulatory standards.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #E8799E 0%, #C8A8E8 100%)', boxShadow: '0 4px 24px rgba(67,97,238,0.3)' }}
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-5 py-16 sm:px-8">
        <h2 className="text-center text-xs font-bold uppercase tracking-widest text-[#E8799E]">
          Streamline documentation review, reporting, and compliance activities via:
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#E8799E]">
              <BarChartIcon />
            </div>
            <h3 className="mt-4 text-sm font-bold text-[#111827]">Outcome Assessment</h3>
            <p className="mt-2 text-xs leading-5 text-[#6B7280]">
              Assessment of outcomes at the individual, program, and provider level.
            </p>
          </div>
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#E8799E]">
              <UsersIcon />
            </div>
            <h3 className="mt-4 text-sm font-bold text-[#111827]">Real-Time Access</h3>
            <p className="mt-2 text-xs leading-5 text-[#6B7280]">
              Real-time access for managers, administrators, and agency-authorized third party reviewers.
            </p>
          </div>
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#E8799E]">
              <BarChartIcon />
            </div>
            <h3 className="mt-4 text-sm font-bold text-[#111827]">Analytic Dashboards</h3>
            <p className="mt-2 text-xs leading-5 text-[#6B7280]">
              Analytic Dashboards for Demographics, Incident Reports, Data-Driven Outcomes, Billing, and more.
            </p>
          </div>
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#E8799E]">
              <ClockIcon />
            </div>
            <h3 className="mt-4 text-sm font-bold text-[#111827]">Full Audit Trail</h3>
            <p className="mt-2 text-xs leading-5 text-[#6B7280]">
              Full audit trail of all activity including date/time stamp and electronic signature.
            </p>
          </div>
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#E8799E]">
              <DollarIcon />
            </div>
            <h3 className="mt-4 text-sm font-bold text-[#111827]">Billing Validation</h3>
            <p className="mt-2 text-xs leading-5 text-[#6B7280]">
              Generation and validation of billing data directly from service documentation.
            </p>
          </div>
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#E8799E]">
              <CheckIcon />
            </div>
            <h3 className="mt-4 text-sm font-bold text-[#111827]">Regulatory Compliance</h3>
            <p className="mt-2 text-xs leading-5 text-[#6B7280]">
              Configurable options to comply with accreditation and regulatory standards.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[#E5E7EB] bg-white">
        <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8 text-center">
          <p className="text-lg leading-8 text-[#6B7280]">
            Comprehensive quality assurance tools that help your agency maintain compliance
            and deliver better outcomes for the individuals you serve.
          </p>
          <Link
            href="/analytics"
            className="mt-8 inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #E8799E 0%, #C8A8E8 100%)', boxShadow: '0 4px 24px rgba(67,97,238,0.3)' }}
          >
            View Analytics
          </Link>
        </div>
      </section>
    </div>
  )
}
