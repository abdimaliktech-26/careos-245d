'use client'

type CatOption = { value: string; label: string }

export function CategorySelect({
  categories,
  tab,
  searchQuery,
}: {
  categories: CatOption[]
  tab: string
  searchQuery: string
}) {
  return (
    <form method="GET" action="/documents" className="inline">
      <input type="hidden" name="tab" value={tab} />
      {searchQuery && <input type="hidden" name="search" value={searchQuery} />}
      <select
        name="category"
        className="rounded-lg px-2 py-1.5 text-xs font-semibold bg-transparent text-muted-foreground hover:text-foreground border-0 cursor-pointer"
        defaultValue=""
        onChange={(e) => { (e.target as HTMLSelectElement).form?.submit() }}
      >
        <option value="">More...</option>
        {categories.filter((c) => c.value !== 'completed_form').slice(6).map((cat) => (
          <option key={cat.value} value={cat.value}>{cat.label}</option>
        ))}
      </select>
    </form>
  )
}
