import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { MessageSquare } from 'lucide-react'

export const dynamic = 'force-dynamic'

type Row = {
  id: string
  body: string
  sender_role: string | null
  is_read: boolean
  created_at: string
  pharmacies: { name: string } | { name: string }[] | null
}
const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v)

export default async function PharmacyMessagesPage() {
  const { user, error } = await getSession()
  if (error || !user?.organizationId) redirect('/auth/login')
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('pharmacy_messages')
    .select('id, body, sender_role, is_read, created_at, pharmacies(name)')
    .order('created_at', { ascending: false })
    .limit(100)
  const rows = (data ?? []) as Row[]

  return (
    <div className="mx-auto max-w-4xl px-5 py-6 sm:px-8">
      <header className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-from to-brand-to text-white"><MessageSquare className="h-5 w-5" /></span>
        <div>
          <h1 className="text-xl font-bold text-foreground">Pharmacy Messages</h1>
          <p className="text-[13px] text-muted-foreground">Secure messages between your team and pharmacies.</p>
        </div>
      </header>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-[13px] text-muted-foreground">No messages yet.</div>
      ) : (
        <div className="space-y-2">
          {rows.map((m) => {
            const p = one(m.pharmacies)
            return (
              <div key={m.id} className="rounded-xl border border-border bg-card p-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[12px] font-semibold capitalize text-foreground">{m.sender_role?.replace('_', ' ') ?? 'User'} · {p?.name ?? 'Pharmacy'}</span>
                  <span className="text-[11px] text-muted-foreground">{new Date(m.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                </div>
                <p className="text-[13px] text-foreground">{m.body}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
