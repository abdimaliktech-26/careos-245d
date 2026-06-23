import Link from 'next/link'

function SparkIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.6 4.8L18 9l-4.4 3.2L15 17l-3-2.2L9 17l1.4-4.8L6 9l4.4-1.2L12 3z"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  )
}

function BadgeNew() {
  return (
    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
      New
    </span>
  )
}

export default function AIToolsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="bg-gradient-to-br from-[#EEF2FF] via-white to-white border-b border-border">
        <div className="mx-auto max-w-4xl px-5 py-16 sm:px-8 sm:py-20 text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-primary">
            <SparkIcon />
            HIPAA-compliant AI
          </div>
          <h1 className="text-4xl font-black leading-[1.1] tracking-tight text-foreground sm:text-5xl">
            Artificial Intelligence Tools Designed<br />
            for Human Services Providers
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            Higsi&rsquo;s HIPAA-compliant AI tools are tailored to think like human services professionals, helping users
            provide more effective supports. As compliance and documentation needs grow, these tools
            improve documentation efficiency while complementing the invaluable work of your agency.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-90"
              style={{ background: 'var(--gradient-primary)', boxShadow: '0 4px 24px rgba(67,97,238,0.3)' }}
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>

      {/* Feature cards grid */}
      <section className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {['Analyses', 'Fatal Five Detection', 'QA Assistant', 'AI Translation'].map((title) => (
            <a
              key={title}
              href={`#${title.toLowerCase().replace(/\s+/g, '-')}`}
              className="group rounded-2xl border border-border bg-card p-5 text-center shadow-sm transition hover:shadow-md hover:border-border"
            >
              <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{title}</h3>
            </a>
          ))}
        </div>
      </section>

      {/* Trust panels */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-4xl gap-6 px-5 py-12 sm:px-8 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-background p-6">
            <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <LockIcon />
              Securely Built
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Your data security is our highest priority, which is why our AI tools are HIPAA-compliant
              and built within our secure system. We never share your sensitive information with
              third-party AI models, ensuring that your documentation remains private and protected
              at all times.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-6">
            <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B99A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
              Responsibly Trained
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Our models are trained and tested using appropriately approved data, ensuring accuracy
              and reliability while maintaining the highest ethical standards for human services
              documentation.
            </p>
          </div>
        </div>
      </section>

      {/* Analyses */}
      <section id="analyses" className="mx-auto max-w-4xl px-5 py-16 sm:px-8">
        <div className="mb-3">
          <BadgeNew />
        </div>
        <h2 className="text-2xl font-black text-foreground">Analyses</h2>
        <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
          AI Analyses evaluate documentation to summarize data, identify trends, and generate actionable insights.
          By selecting specific Skills tailored for health, person-centered, and daily documentation, users can
          streamline the review process. AI Analyses allows your team to gain a comprehensive understanding of
          an individual&rsquo;s progress, leading to more informed decision-making and improved quality of care.
        </p>
        <p className="mt-6 text-sm font-bold text-foreground">AI Analyses helps your team:</p>
        <ul className="mt-3 space-y-2">
          {[
            'Generate summaries that provide historical context and recommendations for care.',
            'Identify trends and patterns within daily and health documentation that might otherwise be missed.',
            'Streamline service planning with AI-driven insights that translate complex data into clear, actionable goals and support strategies.',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm leading-6 text-muted-foreground">
              <span className="mt-0.5 shrink-0 text-primary"><CheckIcon /></span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* Fatal Five Detection */}
      <section id="fatal-five-detection" className="border-y border-border bg-card">
        <div className="mx-auto max-w-4xl px-5 py-16 sm:px-8">
          <div className="mb-3">
            <BadgeNew />
          </div>
          <h2 className="text-2xl font-black text-foreground">Fatal Five Detection</h2>
          <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
            AI-powered Fatal Five Dashboard transforms daily documentation into a proactive clinical tool.
            By aggregating high-risk indicators into a single, real-time view, the dashboard empowers nurses
            and administrators to intervene early for conditions like aspiration, bowel obstruction, dehydration,
            GERD, sepsis, and seizures.
          </p>
          <p className="mt-6 text-sm font-bold text-foreground">Fatal Five Dashboard provides:</p>
          <ul className="mt-3 space-y-2">
            {[
              'Automated Oversight: AI scans daily notes to surface Fatal Five patterns, acting as a continuous safety net for manual staff reviews.',
              'Consolidated Risk Data: Centralizes health data into one comprehensive interface for clinical clarity.',
              'Actionable Analyses: Provides concise data digests that highlight immediate risks, allowing teams to move from reactive tracking to informed, proactive care.',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm leading-6 text-muted-foreground">
                <span className="mt-0.5 shrink-0 text-primary"><CheckIcon /></span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* QA Assistant */}
      <section id="qa-assistant" className="mx-auto max-w-4xl px-5 py-16 sm:px-8">
        <div className="mb-3">
          <BadgeNew />
        </div>
        <h2 className="text-2xl font-black text-foreground">QA Assistant</h2>
        <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
          QA Assistant leverages AI to review submitted documentation. The assistant spots potential issues
          that require a closer look, such as a daily note that includes injury details better suited for an
          incident report. It issues timely, actionable alerts to staff and gives supervisors a comprehensive
          dashboard for reviewing these flagged entries.
        </p>
        <p className="mt-6 text-sm font-bold text-foreground">QA Assistant helps your team:</p>
        <ul className="mt-3 space-y-2">
          {[
            'Save time reviewing documents.',
            'Conduct more targeted audits and quality assurance follow-up.',
            'Prioritize critical documentation using AI triage.',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm leading-6 text-muted-foreground">
              <span className="mt-0.5 shrink-0 text-primary"><CheckIcon /></span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* AI Translation */}
      <section id="ai-translation" className="border-y border-border bg-card">
        <div className="mx-auto max-w-4xl px-5 py-16 sm:px-8">
          <div className="mb-3">
            <BadgeNew />
          </div>
          <h2 className="text-2xl font-black text-foreground">AI Translation</h2>
          <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
            The AI Translation tool, powered by Anthropic Claude, quickly converts PDF documentation into over
            100 languages. Specifically trained for the I/DD and HCBS fields, the tool interprets industry-specific
            language that standard translators often miss. It provides seamless, integrated translation to ensure
            each individual&rsquo;s circle of support understands their case notes, person-centered plans, and other
            documentation.
          </p>
          <p className="mt-6 text-sm font-bold text-foreground">AI Translation tool provides:</p>
          <ul className="mt-3 space-y-2">
            {[
              'Field-Specific Intelligence: Understands I/DD context, including industry-specific abbreviations and clinical terminology.',
              'Integrated Workflow: Operates directly within the browser interface, allowing teams to read and share translated documents with ease.',
              'HIPAA-Secure Translation: Built directly into the Higsi system to ensure document translations meet HIPAA security and data privacy standards.',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm leading-6 text-muted-foreground">
                <span className="mt-0.5 shrink-0 text-primary"><CheckIcon /></span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-gradient-to-br from-[#EEF2FF] to-white">
        <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8 text-center">
          <p className="text-lg leading-8 text-muted-foreground">
            AI tools help enhance documentation efficiency,<br />
            complementing the valuable work of human services professionals.
          </p>
          <Link
            href="/dashboard"
            className="mt-8 inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-90"
            style={{ background: 'var(--gradient-primary)', boxShadow: '0 4px 24px rgba(67,97,238,0.3)' }}
          >
            Get Started
          </Link>
        </div>
      </section>
    </div>
  )
}
