import { Check } from 'lucide-react'
import { AUDIT_PACKAGES, type AuditTier } from '@/lib/audit-readiness/packages'

const TIER_ACCENT: Record<AuditTier, string> = {
  bronze: '#B45309',
  silver: '#64748B',
  gold: '#D97706',
}

export function PackagesCard({ currentTier }: { currentTier: AuditTier }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6" style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
      <div className="mb-5">
        <h2 className="text-[15px] font-semibold text-foreground">Compliance-as-a-Service Packages</h2>
        <p className="text-[12.5px] text-muted-foreground">Offer audit readiness as a productized service.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {AUDIT_PACKAGES.map((pkg) => {
          const active = pkg.tier === currentTier
          return (
            <div
              key={pkg.tier}
              className={`rounded-xl border p-4 ${active ? 'border-primary bg-primary/[0.04]' : 'border-border'}`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: TIER_ACCENT[pkg.tier] }}>{pkg.tier}</span>
                {active && <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold uppercase text-white">Current</span>}
              </div>
              <p className="text-[14px] font-bold text-foreground">{pkg.name}</p>
              <p className="mt-0.5 text-[11.5px] text-muted-foreground">{pkg.tagline}</p>
              <ul className="mt-3 space-y-1.5">
                {pkg.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-[12px] text-foreground">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-ok" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
