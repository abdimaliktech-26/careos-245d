import Link from 'next/link'

const TABS = [
  { key: 'profile', label: 'Profile' },
  { key: 'health', label: 'Health' },
  { key: 'incidents', label: 'Incidents' },
  { key: 'messages', label: 'Messages' },
  { key: 'activity', label: 'Activity' },
  { key: 'videos', label: 'Videos' },
] as const

export function ClientSubNav({
  clientId,
  activeTab,
}: {
  clientId: string
  activeTab: typeof TABS[number]['key']
}) {
  return (
    <nav className="flex gap-6 border-b border-gray-200 mb-6 overflow-x-auto scrollbar-thin">
      {TABS.map((tab) => {
        const href = tab.key === 'profile' ? `/clients/${clientId}` : `/clients/${clientId}/${tab.key}`
        const isActive = activeTab === tab.key

        return (
          <Link
            key={tab.key}
            href={href}
            className={`whitespace-nowrap text-sm font-semibold px-1 pb-3 border-b-2 transition-colors ${
              isActive
                ? 'text-[#E8799E] border-[#E8799E]'
                : 'text-[#64748B] border-transparent hover:text-[#334155]'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
