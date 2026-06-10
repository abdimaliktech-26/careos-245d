import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { MessageList } from '@/components/portal/message-list'
import { sendClientReply, markAsRead } from '@/lib/portal/actions'
import type { PortalMessage } from '@/components/portal/types'

async function sendWithClientId(clientId: string, formData: FormData) {
  'use server'
  formData.append('clientId', clientId)
  await sendClientReply(formData)
}

export default async function ClientMessagesPage() {
  const { user, error } = await getSession()
  if (error || !user || user.role !== 'external_signer') redirect('/auth/login')

  const supabase = await createClient()

  const { data: links } = await supabase
    .from('signing_links')
    .select('packet_id, packets!inner(client_id)')
    .eq('signer_email', user.email)
    .limit(1)

  const link = (links ?? [])[0] as unknown as { packets?: { client_id: string } } | undefined
  const clientId = link?.packets?.client_id

  if (!clientId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <p className="text-sm font-semibold text-[#3A2A4A]">No client record linked</p>
        <p className="mt-1 text-xs text-[#64748B]">Your account is not yet linked to a client record. Contact your provider.</p>
      </div>
    )
  }

  const { data: messages } = await supabase
    .from('portal_messages')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: true })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">
          Client Portal · Messages
        </p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-[#3A2A4A]">
          Messages
        </h1>
        <p className="mt-1 text-[13px] text-[#64748B]">
          Communicate with your care provider.
        </p>
      </div>

      <div className="care-panel rounded-2xl p-6 space-y-4">
        <MessageList
          messages={(messages ?? []) as PortalMessage[]}
          onMarkRead={async (id) => { await markAsRead(id) }}
        />
      </div>

      <div className="care-panel rounded-2xl p-4">
        <form action={sendWithClientId.bind(null, clientId)} className="flex items-end gap-2">
          <div className="flex-1">
            <textarea
              name="message"
              required
              rows={2}
              placeholder="Type your reply…"
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
