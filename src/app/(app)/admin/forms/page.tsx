import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth/get-session'
import { loadAllTemplates } from '@/lib/forms/builder-actions'
import { DeleteTemplateButton } from './delete-button'

export default async function FormLibraryPage() {
  const { user, error } = await getSession()
  if (error || !user || !['org_admin', 'super_admin', 'program_manager'].includes(user.role))
    redirect('/dashboard')

  const result = await loadAllTemplates()
  const templates = result.data ?? []

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-gray-400 uppercase mb-2">Admin</p>
          <h1 className="text-3xl font-bold text-gray-900">Form Templates</h1>
          <p className="text-gray-500 mt-1">Manage form templates used across client packets.</p>
        </div>
        <Link
          href="/admin/forms/new"
          className="rounded-lg bg-[#E8799E] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
        >
          New Template
        </Link>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        {templates.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-gray-400">No form templates yet.</p>
            <Link href="/admin/forms/new" className="text-sm text-[#E8799E] hover:underline mt-2 inline-block">
              Create your first template
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {templates.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-6 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                    {t.is_system && (
                      <span className="inline-flex items-center rounded-full bg-[#E8799E]/10 px-2 py-0.5 text-[10px] font-semibold text-[#E8799E]">
                        System
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    <code className="text-[10px] bg-gray-100 px-1 py-0.5 rounded">{t.code}</code>
                    <span className="mx-1.5">·</span>
                    {t.field_count} field{t.field_count !== 1 ? 's' : ''}
                  </p>
                  {t.description && (
                    <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{t.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/admin/forms/${encodeURIComponent(t.id)}/edit`}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Edit
                  </Link>
                  {!t.is_system && <DeleteTemplateButton id={t.id} />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
