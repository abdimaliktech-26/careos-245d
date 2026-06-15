'use client'

import dynamic from 'next/dynamic'
import type { LiveVisit } from './evv-live-map'

// Leaflet references `window` at import time, so the map must never render on
// the server. Load it client-only.
const EvvLiveMap = dynamic(() => import('./evv-live-map').then((m) => m.EvvLiveMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-[540px] items-center justify-center rounded-2xl border border-border bg-muted/30 text-sm text-muted-foreground">
      Loading map…
    </div>
  ),
})

export function EvvLiveBoard({ orgId, initialVisits }: { orgId: string; initialVisits: LiveVisit[] }) {
  if (initialVisits.length === 0) {
    return (
      <div className="flex h-[540px] flex-col items-center justify-center rounded-2xl border border-border bg-muted/20 text-center">
        <p className="text-sm font-semibold text-foreground">No active visits right now</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Caregiver locations appear here live while a visit is in progress.
        </p>
      </div>
    )
  }
  return <EvvLiveMap orgId={orgId} initialVisits={initialVisits} />
}
