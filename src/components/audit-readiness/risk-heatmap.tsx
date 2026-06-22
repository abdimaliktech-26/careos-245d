import Link from 'next/link'
import type { ClientRisk } from '@/lib/audit-readiness/client-risk'
import { riskCellClass } from './risk-badge'

interface RiskHeatmapProps {
  clients: ReadonlyArray<ClientRisk>
}

/**
 * Color-banded grid: one cell per client, colored by risk level. Hover shows the
 * client name + score; clicking opens the client record.
 */
export function RiskHeatmap({ clients }: RiskHeatmapProps) {
  if (clients.length === 0) {
    return <p className="text-[13px] text-muted-foreground">No client data to map yet.</p>
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {clients.map((c) => (
          <Link
            key={c.clientId}
            href={`/clients/${c.clientId}`}
            title={`${c.clientName} · ${c.program} · score ${c.score}`}
            className={`h-7 w-7 rounded-md ${riskCellClass(c.riskLevel)} opacity-90 transition-transform hover:scale-110 hover:opacity-100`}
          />
        ))}
      </div>
      <div className="mt-4 flex items-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Low</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> Moderate</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-red-500" /> High</span>
      </div>
    </div>
  )
}
