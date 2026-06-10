import type { PortalMessage } from './types'

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffDays === 0) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function MessageList({
  messages,
  onMarkRead,
}: {
  messages: PortalMessage[]
  onMarkRead?: (id: string) => void
}) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF2FF]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8799E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <p className="text-sm font-semibold text-[#3A2A4A]">No messages yet</p>
        <p className="mt-1 text-xs text-[#94A3B8]">Send a message to start the conversation.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.is_from_staff ? 'justify-start' : 'justify-end'}`}
          onMouseEnter={() => !msg.is_read && onMarkRead?.(msg.id)}
        >
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              msg.is_from_staff
                ? 'bg-white border border-gray-100 rounded-tl-sm'
                : 'bg-[#E8799E] text-white rounded-tr-sm'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${msg.is_from_staff ? 'text-[#E8799E]' : 'text-blue-200'}`}>
                {msg.sender_name}
              </span>
              {!msg.is_read && msg.is_from_staff && (
                <span className="inline-flex h-2 w-2 rounded-full bg-[#E8799E]" />
              )}
            </div>
            <p className={`text-[13px] leading-relaxed ${msg.is_from_staff ? 'text-[#334155]' : 'text-white/90'}`}>
              {msg.message}
            </p>
            <p className={`text-[10px] mt-1 ${msg.is_from_staff ? 'text-[#94A3B8]' : 'text-blue-200'}`}>
              {formatTime(msg.created_at)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
