import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth/get-session'
import { getAllArticles } from '@/lib/help-center/actions'
import { DeleteArticleButton } from './delete-button'

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  )
}

export default async function AdminHelpCenterPage() {
  const { user, error } = await getSession()
  if (error || !user || !['org_admin', 'super_admin'].includes(user.role))
    redirect('/dashboard')

  const result = await getAllArticles()
  const articles = result.data ?? []

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-gray-400 uppercase mb-2">Admin</p>
          <h1 className="text-3xl font-bold text-gray-900">Help Center</h1>
          <p className="text-gray-500 mt-1">Manage knowledge base articles for your organization.</p>
        </div>
        <Link
          href="/admin/help-center/new"
          className="rounded-lg bg-[#E8799E] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
        >
          New Article
        </Link>
      </div>

      {articles.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white px-6 py-12 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p className="text-sm text-gray-400">No articles yet.</p>
          <Link href="/admin/help-center/new" className="text-sm text-[#E8799E] hover:underline mt-2 inline-block">
            Create your first article
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['TITLE', 'CATEGORY', 'STATUS', 'UPDATED', ''].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-400 tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {articles.map((article) => {
                const updated = new Date(article.updated_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
                return (
                  <tr key={article.id} className="border-b border-gray-50">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{article.title}</p>
                      {article.excerpt && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{article.excerpt}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-[#EEF2FF] px-2.5 py-0.5 text-[10px] font-medium text-[#E8799E] capitalize">
                        {article.category.replace('-', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {article.is_published ? (
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-[10px] font-medium text-green-700">
                          Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-yellow-50 px-2.5 py-0.5 text-[10px] font-medium text-yellow-700">
                          Draft
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">{updated}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/help-center/${article.id}/edit`}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors inline-flex items-center gap-1.5"
                        >
                          <EditIcon />
                          Edit
                        </Link>
                        <DeleteArticleButton id={article.id} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Preview link */}
      <div className="mt-6 text-center">
        <Link
          href="/help"
          className="text-xs text-gray-400 hover:text-[#E8799E] transition-colors"
        >
          View live help center &rarr;
        </Link>
      </div>
    </div>
  )
}
