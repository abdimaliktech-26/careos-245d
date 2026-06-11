import Link from 'next/link'
import { ThemeToggle } from '@/components/layout/theme-toggle'

function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944z" clipRule="evenodd" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-7.25 7.2a1 1 0 01-1.41 0l-3.25-3.22a1 1 0 111.41-1.42l2.545 2.52 6.545-6.5a1 1 0 011.41 0z" clipRule="evenodd" />
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" stroke="currentColor"/><polygon points="10 8 16 12 10 16" fill="currentColor" stroke="none"/>
    </svg>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-background text-foreground">
      {/* Top announcement bar */}
      <div className="border-b border-border bg-accent">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-5 py-2 text-xs font-medium text-accent-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-foreground" />
          Minnesota 245D HCBS compliance platform — Trusted by providers statewide
        </div>
      </div>

      {/* Nav */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-from to-brand-to text-white transition-shadow duration-300 group-hover:shadow-lg">
            <ShieldIcon />
          </div>
          <div>
            <p className="text-base font-bold leading-none text-foreground">CareIntake</p>
            <p className="mt-1 bg-gradient-to-r from-brand-from to-brand-to bg-clip-text text-[11px] font-semibold uppercase tracking-widest text-transparent">245D Suite</p>
          </div>
        </Link>
        <div className="hidden items-center gap-4 sm:flex">
          <ThemeToggle />
          <Link href="/ai" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">AI Tools</Link>
          <Link href="/qa" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">QA Compliance</Link>
          <Link href="#features" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Features</Link>
          <Link href="/auth/login" className="text-sm font-semibold text-primary transition-opacity hover:opacity-80">Sign in</Link>
          <Link
            href="/auth/login"
            className="rounded-lg bg-gradient-to-br from-brand-from to-brand-to px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:scale-[1.02] hover:shadow-md"
          >
            Get Started
          </Link>
        </div>
        <div className="sm:hidden">
          <Link
            href="/auth/login"
            className="rounded-lg bg-gradient-to-br from-brand-from to-brand-to px-4 py-2 text-sm font-bold text-white"
          >
            Get Started
          </Link>
        </div>
      </nav>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          {/* Aurora mesh background */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -left-20 -top-20 h-72 w-72 animate-float rounded-full bg-brand-from/10 blur-3xl" />
            <div className="absolute -right-20 top-40 h-96 w-96 animate-float rounded-full bg-brand-to/10 blur-3xl" style={{ animationDelay: '1s' }} />
            <div className="absolute bottom-0 left-1/3 h-48 w-48 animate-float rounded-full bg-blue-400/10 blur-3xl" style={{ animationDelay: '2s' }} />
          </div>

          <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_0.92fr] lg:py-24">
            <div>
              <div className="mb-6 inline-flex animate-slide-down items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-primary backdrop-blur-sm">
                <span className="h-2 w-2 rounded-full bg-gradient-to-r from-brand-from to-brand-to" />
                Minnesota 245D compliance platform
              </div>
              <h1 className="max-w-3xl text-[2.6rem] font-black leading-[1.04] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
                Intake packets, signatures, and review alerts in{' '}
                <span className="bg-gradient-to-r from-brand-from to-brand-to bg-clip-text text-transparent">one calm workspace</span>.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                CareIntake helps small 245D providers run client intake, 45-day reviews, semi-annual reviews,
                annual reviews, staff accounts, branded documents, and signature compliance without chasing paper.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/auth/login"
                  className="group inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-brand-from to-brand-to px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-to/25 transition-all hover:scale-[1.02] hover:shadow-xl"
                >
                  Start free trial
                  <span className="transition-transform duration-200 group-hover:translate-x-0.5"><ArrowRightIcon /></span>
                </Link>
                <Link
                  href="#features"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card/80 px-7 py-3.5 text-sm font-bold text-foreground backdrop-blur-sm transition-all hover:border-brand-to/40 hover:bg-accent hover:shadow-md"
                >
                  <PlayIcon />
                  See how it works
                </Link>
              </div>
              <div className="mt-10 grid max-w-2xl grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                {[
                  '44 embedded forms',
                  'Two-party signatures',
                  '14/1 day due alerts',
                  'HIPAA compliant',
                  'EVV & GPS tracking',
                  'CMS-1500 billing',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <span className="shrink-0 text-primary"><CheckIcon /></span>
                    <span className="font-semibold text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mockup */}
            <div className="relative">
              <div className="absolute -right-4 -top-4 hidden h-32 w-32 animate-float rounded-full bg-gradient-to-br from-brand-from/20 to-brand-to/20 blur-xl lg:block" />
              <div className="absolute -bottom-4 -left-4 hidden h-24 w-24 animate-float rounded-full bg-gradient-to-br from-blue-400/20 to-brand-to/20 blur-xl lg:block" style={{ animationDelay: '3s' }} />
              <div className="group relative overflow-hidden rounded-[2rem] border border-border shadow-2xl shadow-brand-to/10 transition-shadow duration-500 hover:shadow-brand-to/20">
                <div className="aspect-[4/3] bg-gradient-to-br from-accent to-background p-6">
                  {/* Dashboard mockup */}
                  <div className="relative h-full overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm">
                    {/* Mockup header */}
                    <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-gradient-to-br from-brand-from to-brand-to" />
                        <div className="typing-bar h-2 w-20 rounded bg-muted" />
                      </div>
                      <div className="flex gap-1.5">
                        <div className="h-2 w-2 animate-pulse rounded-full bg-red-300" />
                        <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-300" style={{ animationDelay: '0.2s' }} />
                        <div className="h-2 w-2 animate-pulse rounded-full bg-green-300" style={{ animationDelay: '0.4s' }} />
                      </div>
                    </div>
                    {/* Mockup stat cards */}
                    <div className="mb-3 grid grid-cols-3 gap-2">
                      {[
                        { label: 'Active Clients', value: '24', cls: 'text-primary' },
                        { label: 'Pending Signatures', value: '7', cls: 'text-status-warn' },
                        { label: 'Due Reviews', value: '3', cls: 'text-status-error' },
                      ].map((stat, i) => (
                        <div key={stat.label} className="stat-card-mockup rounded-lg bg-muted p-2.5 text-center" style={{ animationDelay: `${i * 0.15}s` }}>
                          <p className={`counter-mockup text-lg font-bold ${stat.cls}`}>{stat.value}</p>
                          <p className="text-[10px] font-medium text-muted-foreground">{stat.label}</p>
                        </div>
                      ))}
                    </div>
                    {/* Mockup table */}
                    <div className="space-y-1.5">
                      {[
                        { name: 'Sarah Johnson', status: 'Complete', color: 'bg-status-ok-bg text-status-ok' },
                        { name: 'Michael Torres', status: 'Signatures Needed', color: 'bg-status-warn-bg text-status-warn' },
                        { name: 'Emily Chen', status: 'Overdue', color: 'bg-status-error-bg text-status-error' },
                        { name: 'Robert Wilson', status: 'Complete', color: 'bg-status-ok-bg text-status-ok' },
                      ].map((row, i) => (
                        <div key={row.name} className="table-row-mockup flex items-center justify-between rounded-md bg-muted px-2.5 py-1.5" style={{ animationDelay: `${i * 0.2}s` }}>
                          <div className="flex items-center gap-2">
                            <div className="h-5 w-5 rounded-full bg-gradient-to-br from-brand-from/30 to-brand-to/30" />
                            <span className="text-xs font-medium text-foreground">{row.name}</span>
                          </div>
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${row.color} status-blink-${row.status === 'Overdue' ? 'danger' : 'normal'}`}>{row.status}</span>
                        </div>
                      ))}
                    </div>
                    {/* Scanning line */}
                    <div className="scanline-mockup" />
                  </div>
                </div>
                {/* Hover overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-300 group-hover:bg-black/10">
                  <div className="flex h-14 w-14 scale-90 items-center justify-center rounded-full bg-card/90 opacity-0 shadow-lg transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
                    <PlayIcon />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust bar */}
        <section className="border-y border-border bg-card">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-8 px-5 py-6 sm:px-8">
            {[
              { label: 'HIPAA Compliant', path: <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></> },
              { label: 'SOC 2 Type II', path: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/> },
              { label: 'CMS-1500 Ready', path: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/> },
              { label: 'DeepSeek AI Powered', path: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></> },
              { label: 'Minnesota 245D Compliant', path: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></> },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">{item.path}</svg>
                {item.label}
              </div>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section className="bg-card">
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-5 py-14 sm:grid-cols-4 sm:px-8">
            {[
              { value: '44+', label: 'Embedded Forms' },
              { value: '15 min', label: 'Avg. Intake Time' },
              { value: '99.9%', label: 'Uptime' },
              { value: '100%', label: 'HIPAA Compliant' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="bg-gradient-to-r from-brand-from to-brand-to bg-clip-text text-3xl font-black text-transparent sm:text-4xl">{stat.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="bg-background py-16">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Everything you need</p>
              <h2 className="mt-3 text-3xl font-black text-foreground">One system for the business admin, staff, client, and case manager.</h2>
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: 'Preloaded Packets', desc: 'Intake, 45-day review, semi-annual review, and annual review forms are embedded for every program type.', icon: '📋' },
                { title: 'Valid Signatures Only', desc: 'Documents stay pending until both client/guardian and case manager signatures are saved via secure links.', icon: '✍️' },
                { title: 'Deadline Alerts', desc: 'Staff see warnings two weeks before, one day before, on the due date, and after a packet becomes overdue.', icon: '🔔' },
                { title: 'EVV & GPS Tracking', desc: 'Electronic visit verification with GPS coordinates, time stamps, and geofencing for every service visit.', icon: '📍' },
                { title: 'AI-Powered Tools', desc: 'HIPAA-compliant AI for auto-fill, narrative generation, translation, compliance monitoring, and Fatal Five detection.', icon: '🤖' },
                { title: 'CMS-1500 Billing', desc: 'Auto-generate claims from completed forms, track auth usage, and export CMS-1500 files for submission.', icon: '💰' },
                { title: 'Staff Management', desc: 'Role-based access, training tracking with expiring credentials, staff directory, and invite workflows.', icon: '👥' },
                { title: 'Client Portal', desc: 'Secure client/guardian portal for document viewing, messaging, schedule access, and digital signing.', icon: '🏠' },
                { title: 'Audit Trail', desc: 'Full audit log of all activity including date/time stamps, electronic signatures, and compliance reporting.', icon: '📊' },
              ].map((feature) => (
                <article key={feature.title} className="group rounded-xl border border-border bg-card p-6 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-to/40 hover:shadow-md">
                  <span className="text-2xl">{feature.icon}</span>
                  <h3 className="mt-4 text-[15px] font-bold text-foreground">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Product sections */}
        <section className="border-y border-border bg-card">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-primary">AI-Powered</p>
                <h2 className="mt-3 text-3xl font-black text-foreground">HIPAA-compliant AI tools built for human services</h2>
                <p className="mt-4 text-base leading-7 text-muted-foreground">
                  Our AI tools are tailored to think like human services professionals, helping you provide
                  more effective supports. From auto-filling forms to detecting Fatal Five indicators, AI
                  improves documentation efficiency while complementing the invaluable work of your agency.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  {['Analyses', 'Fatal Five Detection', 'QA Assistant', 'AI Translation'].map((item) => (
                    <span key={item} className="rounded-full border border-border bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">{item}</span>
                  ))}
                </div>
                <Link href="/ai" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-brand-from to-brand-to px-5 py-2.5 text-sm font-bold text-white transition-all hover:opacity-90 hover:shadow-md">
                  Explore AI tools <ArrowRightIcon />
                </Link>
              </div>
              <div className="relative">
                <div className="rounded-xl border border-border bg-gradient-to-br from-accent to-card p-8">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Auto-Fill Forms', value: '85%', sub: 'faster completion' },
                      { label: 'Compliance Alerts', value: '96%', sub: 'detection rate' },
                      { label: 'Fatal Five', value: 'Early', sub: 'warning system' },
                      { label: 'AI Translation', value: '100+', sub: 'languages' },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl bg-card/80 p-4 text-center backdrop-blur-sm">
                        <p className="bg-gradient-to-r from-brand-from to-brand-to bg-clip-text text-lg font-black text-transparent">{item.value}</p>
                        <p className="text-xs font-semibold text-foreground">{item.label}</p>
                        <p className="text-[10px] text-muted-foreground">{item.sub}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* QA Compliance section */}
        <section className="bg-background">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div className="order-2 lg:order-1">
                <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
                  <div className="space-y-3">
                    {[
                      { label: 'Outcome Assessment', pct: '100%' },
                      { label: 'Real-Time Access', pct: '100%' },
                      { label: 'Analytic Dashboards', pct: '100%' },
                      { label: 'Full Audit Trail', pct: '100%' },
                      { label: 'Billing Validation', pct: '100%' },
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground">{item.label}</span>
                          <span className="font-bold text-primary">{item.pct}</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted">
                          <div className="h-1.5 rounded-full bg-gradient-to-r from-brand-from to-brand-to" style={{ width: '100%' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="order-1 lg:order-2">
                <p className="text-xs font-bold uppercase tracking-widest text-primary">Quality Assurance</p>
                <h2 className="mt-3 text-3xl font-black text-foreground">Meaningful, Measurable, Manageable compliance</h2>
                <p className="mt-4 text-base leading-7 text-muted-foreground">
                  Configurable options to assess organizational performance and comply with accreditation and
                  regulatory standards. Real-time dashboards, full audit trails, and billing validation directly
                  from service documentation.
                </p>
                <Link href="/qa" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-brand-from to-brand-to px-5 py-2.5 text-sm font-bold text-white transition-all hover:opacity-90 hover:shadow-md">
                  View QA solution <ArrowRightIcon />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative overflow-hidden bg-gradient-to-br from-brand-from to-brand-to py-20">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-16 -top-16 h-48 w-48 rounded-full bg-white/5 blur-2xl" />
            <div className="absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-3xl px-5 text-center sm:px-8">
            <h2 className="text-3xl font-black text-white sm:text-4xl">Ready to simplify your compliance workflow?</h2>
            <p className="mt-4 text-lg text-white/80">
              Join Minnesota 245D providers who trust CareIntake for intake packets, signatures, and review alerts.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 rounded-lg bg-white px-7 py-3.5 text-sm font-bold text-fuchsia-700 shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl"
              >
                Start free trial <ArrowRightIcon />
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-7 py-3.5 text-sm font-bold text-white transition-all hover:bg-white/10"
              >
                Talk to sales
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-from to-brand-to text-white">
                  <ShieldIcon />
                </div>
                <span className="text-sm font-bold text-foreground">CareIntake</span>
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                The HIPAA-compliant 245D HCBS platform for intake, signatures, and compliance.
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Product</p>
              <div className="mt-3 flex flex-col gap-2">
                {['AI Tools', 'QA Compliance', 'Forms Library', 'EVV', 'Billing'].map((item) => (
                  <Link key={item} href="#" className="text-sm text-muted-foreground transition-colors hover:text-primary">{item}</Link>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Company</p>
              <div className="mt-3 flex flex-col gap-2">
                {['About', 'Blog', 'Careers', 'Contact'].map((item) => (
                  <Link key={item} href="#" className="text-sm text-muted-foreground transition-colors hover:text-primary">{item}</Link>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Legal</p>
              <div className="mt-3 flex flex-col gap-2">
                {['Privacy Policy', 'Terms of Service', 'HIPAA Notice', 'Cookie Policy'].map((item) => (
                  <Link key={item} href="#" className="text-sm text-muted-foreground transition-colors hover:text-primary">{item}</Link>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-8 border-t border-border pt-6 text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} CareIntake. All rights reserved. HIPAA compliant.
          </div>
        </div>
      </footer>

    </div>
  )
}
