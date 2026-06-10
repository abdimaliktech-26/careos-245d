import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getArticle, getPublishedArticles } from '@/lib/help-center/actions'
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
      <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-6">
        <Link href="/help" className="hover:text-[#E8799E] transition-colors">Help Center</Link>
        <ChevronRight />
        <Link href={`/help/category/${article.category}`} className="hover:text-[#E8799E] transition-colors capitalize">
          {article.category.replace('-', ' ')}
        </Link>
        <ChevronRight />
        <span className="text-gray-600 truncate max-w-[200px]">{article.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
        {/* Main content */}
        <article>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">{article.title}</h1>

          {article.excerpt && (
            <p className="text-sm text-gray-500 mb-6">{article.excerpt}</p>
          )}

          {/* Meta */}
          <div className="flex items-center gap-3 text-xs text-gray-400 mb-8 pb-6 border-b border-gray-100">
            <span className="inline-flex items-center gap-1.5">
              <ClockIcon />
              Last updated {updated}
            </span>
            <span className="inline-flex items-center rounded-full bg-[#EEF2FF] px-2.5 py-0.5 text-[10px] font-medium text-[#E8799E] capitalize">
              {article.category.replace('-', ' ')}
            </span>
          </div>

          {/* Content */}
          <div
            className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-600 prose-a:text-[#E8799E] prose-code:text-gray-600 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-strong:text-gray-900 prose-li:text-gray-600 prose-img:rounded-xl"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="flex items-center gap-2 flex-wrap">
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600"
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
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                Related Articles
              </h3>
              <div className="space-y-2">
                {relatedArticles.map((ra) => (
                  <Link
                    key={ra.id}
                    href={`/help/${ra.slug}`}
                    className="block rounded-lg border border-gray-100 p-3 transition-colors hover:border-[#E8799E]/30 hover:bg-[#FAFBFF]"
                  >
                    <p className="text-xs font-medium text-gray-900 line-clamp-2">{ra.title}</p>
                    <p className="text-[10px] text-gray-400 mt-1 capitalize">{ra.category.replace('-', ' ')}</p>
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
