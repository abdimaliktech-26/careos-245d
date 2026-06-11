import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { getPublishedArticles, getCategories } from '@/lib/help-center/actions'
import { HelpSearchBar } from '@/components/help-center/search-bar'
import { CategoryCard } from '@/components/help-center/category-card'
import { ArticleCard } from '@/components/help-center/article-card'

function QuestionIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>
    </svg>
  )
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  )
}

export default async function HelpCenterPage() {
  const { error } = await getSession()
  if (error) redirect('/auth/login')

  const [articlesResult, categoriesResult] = await Promise.all([
    getPublishedArticles(),
    getCategories(),
  ])

  const articles = articlesResult.data ?? []
  const categories = categoriesResult.data ?? []

  const recentArticles = articles.slice(0, 5)

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-primary">
          <QuestionIcon />
        </div>
        <h1 className="text-3xl font-bold text-foreground">How can we help you?</h1>
        <p className="text-muted-foreground mt-2">Search the knowledge base or browse by category.</p>
      </div>

      {/* Search */}
      <div className="mb-10">
        <HelpSearchBar />
      </div>

      {/* Category Grid */}
      {categories.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-foreground mb-4">Browse by Category</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map((cat) => (
              <CategoryCard key={cat.category} category={cat.category} count={cat.count} />
            ))}
          </div>
        </section>
      )}

      {/* Recent Articles */}
      {recentArticles.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-foreground mb-4">Recent Articles</h2>
          <div className="space-y-3">
            {recentArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        </section>
      )}

      {/* Contact Support */}
      <section className="rounded-2xl border border-border bg-card p-6 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <h2 className="text-base font-semibold text-foreground mb-2">Still need help?</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Contact our support team for assistance.
        </p>
        <div className="flex items-center justify-center gap-3">
          <a
            href="mailto:support@careintake.com"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            <MailIcon />
            Email Support
          </a>
        </div>
      </section>
    </div>
  )
}
