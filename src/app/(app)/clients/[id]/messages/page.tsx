import { notFound } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { ClientSubNav } from '@/components/clients/client-subnav'
import { MessageList } from '@/components/portal/message-list'
import { sendMessage, markAsRead } from '@/lib/portal/actions'
import type { PortalMessage } from '@/components/portal/types'

async function handleSendMessage(formData: FormData) {
  'use server'
  await sendMessage(formData)
}

type Props = { params: Promise<{ id: string }> }

export default async function ClientMessagesPage({ params }: Props) {
  const { id } = await params
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user) notFound()

  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('legal_name')
    .eq('id', id)
    .single()

  if (!client) notFound()

  const { data: messages } = await supabase
    .from('portal_messages')
    .select('*')
    .eq('client_id', id)
    .order('created_at', { ascending: true })

  const unreadCount = (messages ?? []).filter((m: PortalMessage) => m.is_from_staff && !m.is_read).length

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#3A2A4A]">{client.legal_name}</h1>
          <p className="text-sm text-[#64748B] mt-0.5">Client messaging</p>
        </div>
        {unreadCount > 0 && (
          <span className="inline-flex items-center rounded-full bg-[#E8799E] px-2.5 py-1 text-[10px] font-bold text-white">
            {unreadCount} unread
          </span>
        )}
      </div>

      <ClientSubNav clientId={id} activeTab="messages" />

      <div className="care-panel rounded-2xl p-6 space-y-4">
        <MessageList
          messages={(messages ?? []) as PortalMessage[]}
          onMarkRead={async (msgId) => { await markAsRead(msgId) }}
        />
      </div>

      <div className="care-panel rounded-2xl p-4">
        <form action={handleSendMessage} className="flex items-end gap-2">
          <input type="hidden" name="clientId" value={id} />
          <div className="flex-1">
            <textarea
              name="message"
              required
              rows={2}
              placeholder="Type your message…"
              className="care-input w-full rounded-xl border px-3 py-2.5 text-sm resize-none"
            />
          </div>
          <button
            type="submit"
            className="shrink-0 rounded-xl bg-[#E8799E] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
