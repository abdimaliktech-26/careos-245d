import { createClient as createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
type Row = { id: string; body: string; sender_role: string | null; created_at: string }

export default async function PharmacyMessagesPage() {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('pharmacy_messages')
    .select('id, body, sender_role, created_at')
    .order('created_at', { ascending: false })
    .limit(100)
  const rows = (data ?? []) as Row[]

  return (
    <div className="mx-auto max-w-3xl px-6 py-7">
      <h1 className="mb-1 text-xl font-bold text-foreground">Messages</h1>
      <p className="mb-6 text-[13px] text-muted-foreground">Secure messages with your linked providers.</p>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-[13px] text-muted-foreground">No messages yet.</div>
      ) : (
        <div className="space-y-2">
          {rows.map((m) => (
            <div key={m.id} className="rounded-xl border border-border bg-card p-4">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[12px] font-semibold capitalize text-foreground">{m.sender_role?.replace(/_/g, ' ') ?? 'User'}</span>
                <span className="text-[11px] text-muted-foreground">{new Date(m.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
              </div>
              <p className="text-[13px] text-foreground">{m.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
