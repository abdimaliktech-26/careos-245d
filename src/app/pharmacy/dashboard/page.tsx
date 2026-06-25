import Link from 'next/link'
import { createClient as createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function PharmacyDashboard() {
  const supabase = await createServerClient()

  const [clients, orders, refills, docs] = await Promise.all([
    supabase.from('client_pharmacy_assignments').select('id', { count: 'exact', head: true }),
    supabase.from('medication_orders').select('id', { count: 'exact', head: true }).in('status', ['submitted', 'pending_review', 'needs_clarification']),
    supabase.from('refill_requests').select('id', { count: 'exact', head: true }).not('status', 'in', '(filled,shipped,delivered,denied)'),
    supabase.from('pharmacy_documents').select('id', { count: 'exact', head: true }),
  ])

  const cards = [
    { label: 'Assigned clients', value: clients.count ?? 0, href: '/pharmacy/clients' },
    { label: 'Open orders', value: orders.count ?? 0, href: '/pharmacy/orders' },
    { label: 'Pending refills', value: refills.count ?? 0, href: '/pharmacy/refills' },
    { label: 'Documents', value: docs.count ?? 0, href: '/pharmacy/documents' },
  ]

  return (
    <div className="mx-auto max-w-5xl px-6 py-7">
      <h1 className="mb-1 text-xl font-bold text-foreground">Pharmacy Dashboard</h1>
      <p className="mb-6 text-[13px] text-muted-foreground">Orders, refills, and documents for your linked providers.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-sm">
            <p className="text-[12px] font-medium text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{c.value}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
