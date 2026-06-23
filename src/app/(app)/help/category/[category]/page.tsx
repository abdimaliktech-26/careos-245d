import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPublishedArticles } from '@/lib/help-center/actions'
import { HelpSearchBar } from '@/components/help-center/search-bar'
import { ArticleCard } from '@/components/help-center/article-card'

function ChevronRight() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6"/>
    </svg>
  )
}

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'getting-started': 'Learn the basics of navigating Higsi, setting up your account, and getting started with daily tasks.',
  'forms-packets': 'Everything about form templates, packet creation, managing documents, and completing reviews.',
  'clients-staff': 'Managing client records, staff accounts, permissions, and team coordination.',
  billing: 'Understanding billing readiness, claims management, authorizations, and reimbursement.',
  incidents: 'How to report, track, and manage incidents in compliance with 245D requirements.',
  evv: 'Electronic Visit Verification — check-in/check-out procedures, GPS tracking, and visit logs.',
  schedule: 'Creating and managing staff schedules, shift assignments, and calendar views.',
  faq: 'Frequently asked questions about Higsi features, compliance, and troubleshooting.',
  general: 'General information and reference materials.',
}

const CATEGORY_LABELS: Record<string, string> = {
  'getting-started': 'Getting Started',
  'forms-packets': 'Forms & Packets',
  'clients-staff': 'Clients & Staff',
  billing: 'Billing',
  incidents: 'Incidents',
  evv: 'EVV',
  schedule: 'Schedule',
  faq: 'FAQ',
  general: 'General',
}

type Props = {
  params: Promise<{ category: string }>
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params

  const validCategories = ['getting-started', 'forms-packets', 'clients-staff', 'billing', 'incidents', 'evv', 'schedule', 'faq', 'general']
  if (!validCategories.includes(category)) notFound()

  const result = await getPublishedArticles(category)
  const articles = result.data ?? []
  const label = CATEGORY_LABELS[category] ?? category
  const description = CATEGORY_DESCRIPTIONS[category] ?? ''

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6">
        <Link href="/help" className="hover:text-primary transition-colors">Help Center</Link>
        <ChevronRight />
        <span className="text-muted-foreground capitalize">{label}</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground capitalize">{label}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>

      {/* Search within category */}
      <div className="mb-8">
        <HelpSearchBar />
      </div>

      {/* Articles */}
      {articles.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <p className="text-sm text-muted-foreground">No articles in this category yet.</p>
          <Link href="/help" className="text-sm text-primary hover:underline mt-2 inline-block">
            Browse all categories
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">{articles.length} article{articles.length !== 1 ? 's' : ''}</p>
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  )
}
