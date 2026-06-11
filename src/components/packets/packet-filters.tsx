'use client'

type FilterOption = [string, string]

export function PacketFilters({
  filters,
}: {
  filters: Array<{ name: string; defaultLabel: string; options: FilterOption[] }>
}) {
  return (
    <form method="GET" action="/packets" className="flex flex-wrap items-center gap-2">
      {filters.map(({ name, defaultLabel, options }) => (
        <select
          key={name}
          name={name}
          className="care-input rounded-xl border px-3 py-2 text-[12px] text-foreground bg-card cursor-pointer"
          defaultValue=""
          onChange={(e) => { (e.target as HTMLSelectElement).form?.submit() }}
        >
          <option value="">{defaultLabel}</option>
          {options.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      ))}
    </form>
  )
}
