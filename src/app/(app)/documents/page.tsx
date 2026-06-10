import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { DocumentUploadForm } from '@/components/document-vault/document-upload-form'
import { DocumentListClient } from '@/components/document-vault/document-list-client'
import { CategorySelect } from '@/components/document-vault/category-select'
import { getDocumentCategories } from '@/lib/document-vault/actions'

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; category?: string; search?: string }>
}) {
  const { user, error } = await getSession()
  if (error || !user) redirect('/auth/login')
  if (!user.organizationId) redirect('/dashboard')

  const params = await searchParams
  const tab = params.tab === 'forms' ? 'forms' : 'all'
  const categoryFilter = params.category ?? ''
  const searchQuery = params.search ?? ''

  const supabase = await createClient()

  const baseQuery = () => supabase
    .from('documents')
    .select('id, display_name, category, description, file_size, mime_type, created_at, clients(legal_name), staff_profiles(full_name)')
    .eq('organization_id', user.organizationId)
    .order('created_at', { ascending: false })

  const applyFilters = (q: ReturnType<typeof baseQuery>) => {
    let query = q
    if (categoryFilter) {
      query = query.eq('category', categoryFilter)
    }
    if (searchQuery) {
      query = query.ilike('display_name', `%${searchQuery}%`)
    }
    return query
  }

  const [
    { data: documents },
    { data: completedForms },
    { data: clients },
    { data: staff },
  ] = await Promise.all([
    applyFilters(baseQuery()).neq('category', 'completed_form').limit(150),
    tab === 'forms' ? applyFilters(baseQuery()).eq('category', 'completed_form').limit(150) : { data: [] },
    supabase.from('clients').select('id, legal_name').eq('organization_id', user.organizationId).order('legal_name'),
    supabase.from('staff_profiles').select('id, full_name').eq('organization_id', user.organizationId).order('full_name'),
  ])

  const activeList = tab === 'forms' ? (completedForms ?? []) : (documents ?? [])
  const categories = await getDocumentCategories()

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#E8799E]">Document Vault</p>
        <h1 className="mt-2 text-3xl font-black text-[#111827]">Documents</h1>
        <p className="mt-2 text-sm text-gray-500">
          Completed intake forms are auto-saved here after all signatures are captured. Upload additional files below.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        <Link
          href={categoryFilter || searchQuery ? `/documents?tab=all${categoryFilter ? `&category=${categoryFilter}` : ''}${searchQuery ? `&search=${searchQuery}` : ''}` : '/documents'}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === 'all'
            ? 'bg-white text-[#111827] shadow-sm'
            : 'text-gray-500 hover:text-gray-700'}`}
        >
          Uploaded Files
          {(documents?.length ?? 0) > 0 && (
            <span className="ml-2 rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] font-bold text-gray-600">
              {documents?.length}
            </span>
          )}
        </Link>
        <Link
          href={categoryFilter || searchQuery ? `/documents?tab=forms${categoryFilter ? `&category=${categoryFilter}` : ''}${searchQuery ? `&search=${searchQuery}` : ''}` : '/documents?tab=forms'}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === 'forms'
            ? 'bg-white text-[#111827] shadow-sm'
            : 'text-gray-500 hover:text-gray-700'}`}
        >
          Completed Forms
          {(completedForms?.length ?? 0) > 0 && (
            <span className="ml-2 rounded-full bg-[#EEF2FF] px-1.5 py-0.5 text-[10px] font-bold text-[#E8799E]">
              {completedForms?.length}
            </span>
          )}
        </Link>
      </div>

      {/* Search & filter bar */}
      <div className="mb-4 flex items-center gap-3">
        <form method="GET" action="/documents" className="flex-1 max-w-sm">
          <input type="hidden" name="tab" value={tab} />
          {categoryFilter && <input type="hidden" name="category" value={categoryFilter} />}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              name="search"
              defaultValue={searchQuery}
              placeholder="Search by filename..."
              className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-gray-400 focus:border-[#E8799E] focus:outline-none focus:ring-2 focus:ring-[#E8799E]/10"
            />
          </div>
        </form>
        <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
          <Link
            href={searchQuery ? `/documents?tab=${tab}&search=${searchQuery}` : `/documents?tab=${tab}`}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${!categoryFilter ? 'bg-white text-[#111827] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            All
          </Link>
          {categories.filter((c) => c.value !== 'completed_form').slice(0, 6).map((cat) => (
            <Link
              key={cat.value}
              href={`/documents?tab=${tab}&category=${cat.value}${searchQuery ? `&search=${searchQuery}` : ''}`}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${categoryFilter === cat.value ? 'bg-white text-[#111827] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {cat.label}
            </Link>
          ))}
          {categories.filter((c) => c.value !== 'completed_form').length > 6 && (
            <CategorySelect
              categories={categories}
              tab={tab}
              searchQuery={searchQuery}
            />
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        {/* Document list */}
        {activeList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden px-6 py-16 text-center">
            <p className="text-3xl mb-3">{tab === 'forms' ? '📋' : '📁'}</p>
            <p className="text-lg font-black text-[#111827]">
              {tab === 'forms'
                ? 'No completed forms yet'
                : searchQuery || categoryFilter
                  ? 'No matching documents'
                  : 'No documents uploaded'}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              {tab === 'forms'
                ? 'Forms are saved here automatically once all required signatures are captured on a client packet.'
                : searchQuery || categoryFilter
                  ? 'Try adjusting your search or filter.'
                  : 'Upload client documents, staff credentials, or incident attachments using the form.'}
            </p>
            {(searchQuery || categoryFilter) && (
              <Link href="/documents" className="mt-4 inline-block rounded-lg bg-[#E8799E] px-4 py-2 text-xs font-semibold text-white hover:opacity-90">
                Clear filters
              </Link>
            )}
          </div>
        ) : (
          <DocumentListClient documents={activeList as Array<Record<string, unknown>>} />
        )}

        {/* Upload form — only shown on uploaded files tab */}
        {tab === 'all' && (
          <DocumentUploadForm
            clients={(clients ?? []).map((c) => ({ id: c.id, label: c.legal_name }))}
            staff={(staff ?? []).map((m) => ({ id: m.id, label: m.full_name }))}
          />
        )}

        {/* Info panel on forms tab */}
        {tab === 'forms' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#E8799E] mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <h3 className="font-black text-[#111827] text-lg">Auto-saved on completion</h3>
            <p className="mt-2 text-sm text-gray-500 leading-6">
              Every time a packet form receives all required signatures (client/guardian + case manager), CareIntake automatically generates the branded document and stores it here.
            </p>
            <div className="mt-4 space-y-2.5 text-sm">
              {[
                'Signed by client or guardian',
                'Signed by case manager',
                'Organization branding applied',
                'Signature images embedded',
                'All form responses included',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-gray-600">
                  <span className="text-[#E8799E]">
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-7.25 7.2a1 1 0 01-1.41 0l-3.25-3.22a1 1 0 111.41-1.42l2.545 2.52 6.545-6.5a1 1 0 011.41 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 text-xs text-gray-500">
              To access a form before it has all signatures, go to <strong>Clients → [client name]</strong> and use the Download button on any completed form row.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
