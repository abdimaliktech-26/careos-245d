import { WORKFLOW_STAGES } from '@/lib/evv/compliance'

/**
 * Visual pipeline for a visit:
 * Clock In → Service Delivery → Progress Note → Supervisor Review →
 * EVV Verification → Billing Approval → Compliance Tracking
 */
export function EvvWorkflowStepper({ currentIndex }: { currentIndex: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-y-2">
      {WORKFLOW_STAGES.map((stage, index) => {
        const isDone = index < currentIndex
        const isCurrent = index === currentIndex
        return (
          <li key={stage.key} className="flex items-center">
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                isDone
                  ? 'bg-status-ok text-white'
                  : isCurrent
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {isDone ? '✓' : index + 1}
            </span>
            <span
              className={`ml-1.5 text-[10px] font-semibold ${
                isCurrent ? 'text-foreground' : isDone ? 'text-status-ok' : 'text-muted-foreground'
              }`}
            >
              {stage.label}
            </span>
            {index < WORKFLOW_STAGES.length - 1 && (
              <span className={`mx-2 h-px w-4 ${isDone ? 'bg-status-ok' : 'bg-border'}`} />
            )}
          </li>
        )
      })}
    </ol>
  )
}
