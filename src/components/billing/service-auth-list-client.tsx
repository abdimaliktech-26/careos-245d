'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ServiceAuthEditForm } from '@/components/billing/service-auth-edit-form'

export function ServiceAuthListClient({
  auths,
  statusStyles,
  statusBg,
}: {
  auths: Array<Record<string, unknown>>
  statusStyles: Record<string, string>
  statusBg: Record<string, string>
}) {
  const [editingAuth, setEditingAuth] = useState<Record<string, unknown> | null>(null)

  return (
    <>
      <div className="rounded-2xl border border-border bg-card overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-50 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                <th className="px-5 py-3">Client</th>
                <th className="px-5 py-3">Auth #</th>
                <th className="px-5 py-3">Payer</th>
                <th className="px-5 py-3">CPT</th>
                <th className="px-5 py-3">Period</th>
                <th className="px-5 py-3">Units</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {auths.map((a) => {
                const status = (a.status as string) ?? 'active'
                const isOver = (a.used_units as number) > (a.authorized_units as number)

                return (
                  <tr key={a.id as string} className="text-sm hover:bg-muted/40/80 transition-colors group">
                    <td className="px-5 py-3 font-medium text-foreground">
                      {(a.clients as { legal_name?: string } | null)?.legal_name ?? '—'}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs">{a.auth_number as string}</td>
                    <td className="px-5 py-3 text-muted-foreground">{a.payer as string}</td>
                    <td className="px-5 py-3 font-mono text-xs">{a.cpt_code as string}</td>
                    <td className="px-5 py-3 text-muted-foreground text-[12px]">
                      {new Date(a.start_date as string).toLocaleDateString()} – {new Date(a.end_date as string).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">
                      <span className={isOver ? 'text-red-600 font-semibold' : ''}>
                        {a.used_units as number} / {a.authorized_units as number}
                      </span>
                      {isOver && (
                        <span className="ml-1.5 text-[10px] text-red-500 font-semibold">Over</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${statusStyles[status] ?? ''}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${statusBg[status] ?? 'bg-gray-400'}`} />
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditingAuth(a)}
                          className="rounded-lg border border-border px-2.5 py-1 text-[10px] font-semibold text-muted-foreground hover:bg-muted/40 transition-colors"
                        >
                          Edit
                        </button>
                        <Link
                          href={`/billing-readiness/claims?search=${a.auth_number as string}`}
                          className="rounded-lg border border-border px-2.5 py-1 text-[10px] font-semibold text-primary hover:bg-accent transition-colors"
                        >
                          Claims
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editingAuth && (
        <ServiceAuthEditForm
          auth={editingAuth}
          onClose={() => setEditingAuth(null)}
        />
      )}
    </>
  )
}
