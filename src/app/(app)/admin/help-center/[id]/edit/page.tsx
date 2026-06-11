import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { ArticleEditor } from '@/components/help-center/article-editor'
import type { HelpArticle } from '@/lib/help-center/actions'

type Props = {
  params: Promise<{ id: string }>
}

export default async function EditHelpArticlePage({ params }: Props) {
  const { user, error } = await getSession()
  if (error || !user || !['org_admin', 'super_admin'].includes(user.role))
    redirect('/dashboard')

  const { id } = await params
  const supabase = await createClient()

  const { data: article, error: articleError } = await supabase
    .from('help_articles')
    .select('*')
    .eq('id', id)
    .single()

  if (articleError || !article) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-red-500">{articleError?.message ?? 'Article not found'}</p>
        <Link href="/admin/help-center" className="text-sm text-primary hover:underline mt-2 inline-block">
          Back to help center
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase mb-2">Admin</p>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Edit: {article.title}</h1>
            <p className="text-muted-foreground mt-1">Update the article content and settings.</p>
          </div>
          <Link
            href="/admin/help-center"
            className="text-sm text-primary hover:underline"
          >
            &larr; Back
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <ArticleEditor article={article as HelpArticle} />
      </div>
    </div>
  )
}
