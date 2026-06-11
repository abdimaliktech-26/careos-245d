import Link from 'next/link'
import type { HelpArticle } from '@/lib/help-center/actions'

interface ArticleCardProps {
  article: Pick<HelpArticle, 'title' | 'slug' | 'excerpt' | 'category' | 'tags' | 'created_at' | 'updated_at'>
}

export function ArticleCard({ article }: ArticleCardProps) {
  const updated = new Date(article.updated_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <Link
      href={`/help/${article.slug}`}
      className="block rounded-xl border border-border bg-card p-5 transition-all hover:border-brand-to/40 hover:shadow-sm"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">{article.title}</h3>
          {article.excerpt && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{article.excerpt}</p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-primary capitalize">
              {article.category.replace('-', ' ')}
            </span>
            <span className="text-[10px] text-muted-foreground">{updated}</span>
          </div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-1 shrink-0 text-gray-300">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </div>
    </Link>
  )
}
