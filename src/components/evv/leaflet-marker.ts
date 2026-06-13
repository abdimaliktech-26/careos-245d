import L from 'leaflet'

/**
 * Colored pin built from a divIcon so we never depend on Leaflet's default
 * marker image assets (which break under bundlers). Shared by the per-visit
 * and live maps for a consistent look.
 */
export function pinIcon(color: string, pulse = false): L.DivIcon {
  const ring = pulse
    ? `<span style="position:absolute;inset:-6px;border-radius:9999px;background:${color};opacity:.25;animation:ci-pulse 1.6s ease-out infinite"></span>`
    : ''
  return L.divIcon({
    className: 'ci-pin',
    html: `<span style="position:relative;display:block;width:18px;height:18px">
      ${ring}
      <span style="position:absolute;inset:0;border-radius:9999px;background:${color};border:2.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></span>
    </span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

export const MARKER_COLORS = {
  checkIn: '#10B981', // emerald — clocked in
  checkOut: '#DB2777', // brand pink — clocked out
  clientHome: '#7C3AED', // violet — service address
  liveOk: '#2563EB', // blue — live, within geofence
  liveOut: '#DC2626', // red — live, outside geofence
} as const
