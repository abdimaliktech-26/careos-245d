import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getArticle, getPublishedArticles } from '@/lib/help-center/actions'
import { sanitizeArticleHtml } from '@/lib/help-center/sanitize'
import { ArticleFeedback } from './feedback'

function ChevronRight() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6"/>
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  )
}

type Props = {
  params: Promise<{ slug: string }>
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params
  const result = await getArticle(slug)

  if (!result.data || result.error) {
    notFound()
  }

  const article = result.data
  const relatedResult = await getPublishedArticles(article.category)
  const relatedArticles = (relatedResult.data ?? []).filter((a) => a.slug !== slug).slice(0, 4)

  const updated = new Date(article.updated_at).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6">
        <Link href="/help" className="hover:text-primary transition-colors">Help Center</Link>
        <ChevronRight />
        <Link href={`/help/category/${article.category}`} className="hover:text-primary transition-colors capitalize">
          {article.category.replace('-', ' ')}
        </Link>
        <ChevronRight />
        <span className="text-muted-foreground truncate max-w-[200px]">{article.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
        {/* Main content */}
        <article>
          <h1 className="text-2xl font-bold text-foreground mb-3">{article.title}</h1>

          {article.excerpt && (
            <p className="text-sm text-muted-foreground mb-6">{article.excerpt}</p>
          )}

          {/* Meta */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-8 pb-6 border-b border-border">
            <span className="inline-flex items-center gap-1.5">
              <ClockIcon />
              Last updated {updated}
            </span>
            <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-medium text-primary capitalize">
              {article.category.replace('-', ' ')}
            </span>
          </div>

          {/* Content */}
          <div
            className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary prose-code:text-muted-foreground prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-strong:text-foreground prose-li:text-muted-foreground prose-img:rounded-xl"
            dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(article.content) }}
          />

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="mt-8 pt-6 border-t border-border">
              <div className="flex items-center gap-2 flex-wrap">
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Feedback */}
          <ArticleFeedback />
        </article>

        {/* Sidebar */}
        <aside className="hidden lg:block">
          {relatedArticles.length > 0 && (
            <div className="sticky top-8">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Related Articles
              </h3>
              <div className="space-y-2">
                {relatedArticles.map((ra) => (
                  <Link
                    key={ra.id}
                    href={`/help/${ra.slug}`}
                    className="block rounded-lg border border-border p-3 transition-colors hover:border-brand-to/40 hover:bg-muted/40"
                  >
                    <p className="text-xs font-medium text-foreground line-clamp-2">{ra.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 capitalize">{ra.category.replace('-', ' ')}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
