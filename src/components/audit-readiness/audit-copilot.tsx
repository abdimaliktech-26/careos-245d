'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useMemo, useRef, useState, useEffect } from 'react'
import { Sparkles, Send, Loader2 } from 'lucide-react'

const SUGGESTIONS = [
  'What documents are missing?',
  'Which clients are highest risk?',
  'Which staff trainings expire next month?',
  'What should I fix before a licensing review?',
  'Show all overdue reviews.',
]

export function AuditCopilot() {
  const chatId = useMemo(() => crypto.randomUUID(), [])
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status, error } = useChat({
    id: chatId,
    transport: new DefaultChatTransport({ api: '/api/audit-copilot' }),
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const ask = (text: string) => {
    if (!text.trim() || isLoading) return
    sendMessage({ text: text.trim() })
    setDraft('')
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card" style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-from to-brand-to text-white">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-[14px] font-semibold text-foreground">Audit Copilot</h2>
          <p className="text-[11px] text-muted-foreground">Ask about your real compliance data</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4" style={{ minHeight: 220, maxHeight: 360 }}>
        {messages.length === 0 ? (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => ask(s)}
                className="rounded-full border border-border px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
        ) : (
          messages.map((m) => {
            const text = m.parts
              ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
              .map((p) => p.text)
              .join('') ?? ''
            const isUser = m.role === 'user'
            return (
              <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-[13px] ${
                  isUser ? 'bg-primary text-white' : 'bg-muted text-foreground'
                }`}>
                  {text}
                </div>
              </div>
            )
          })
        )}
        {error && <p className="text-[12px] text-status-error">Copilot is unavailable. {error.message}</p>}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); ask(draft) }}
        className="flex items-center gap-2 border-t border-border px-4 py-3"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask the Audit Copilot…"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={isLoading || !draft.trim()}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-from to-brand-to text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  )
}
