import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth/get-session'
import { ArticleEditor } from '@/components/help-center/article-editor'

export default async function NewHelpArticlePage() {
  const { user, error } = await getSession()
  if (error || !user || !['org_admin', 'super_admin'].includes(user.role))
    redirect('/dashboard')

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-[0.16em] text-gray-400 uppercase mb-2">Admin</p>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">New Article</h1>
            <p className="text-gray-500 mt-1">Create a help center article for your organization.</p>
          </div>
          <Link
            href="/admin/help-center"
            className="text-sm text-[#E8799E] hover:underline"
          >
            &larr; Back
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <ArticleEditor />
      </div>
    </div>
  )
}
