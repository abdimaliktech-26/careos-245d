import Link from 'next/link'
import type { ClientSummary } from '@/types/clients'

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-status-ok-bg text-status-ok',
  inactive: 'bg-status-warn-bg text-status-warn',
  discharged: 'bg-muted text-muted-foreground',
  on_hold: 'bg-orange-100 text-orange-700',
}

export function ClientCard({ client }: { client: ClientSummary }) {
  return (
    <Link
      href={`/staff/clients/${client.id}`}
      className="block bg-card border border-border rounded-lg p-4 hover:border-blue-400 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-foreground">
            {client.legal_name}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {client.program}
          </p>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[client.status]}`}>
          {client.status}
        </span>
      </div>
      {client.intake_date && (
        <p className="text-xs text-muted-foreground mt-2">
          Intake:{' '}
          {new Date(client.intake_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </p>
      )}
    </Link>
  )
}
