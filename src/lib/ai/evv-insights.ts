import type { ComplianceSummary } from '@/lib/evv/compliance'

/**
 * Prompt construction for the EVV compliance insights narrative.
 * The model summarizes and prioritizes — humans make all decisions.
 */

export const EVV_INSIGHTS_SYSTEM_PROMPT = `You are a compliance analyst for a Minnesota 245D Medicaid waiver provider.
You are given aggregate Electronic Visit Verification (EVV) metrics and a list of detected exceptions.

Write a short operational briefing for the program manager:
1. One-sentence overall assessment of EVV compliance health.
2. The 2-4 highest-risk items, each with WHY it matters for Medicaid billing or a DHS 245D audit and what to do next.
3. One sentence on billing readiness (verified visits and billable hours).

Rules:
- Be specific and use the numbers provided. Never invent data.
- Flag potential fraud indicators (overlapping visits, impossible travel) as top priority.
- Recommendations are suggestions for human review — never state that something "is" fraud, only that it warrants review.
- Plain text, no markdown. 120 words max.`

export function buildEvvInsightsPrompt(
  summary: ComplianceSummary,
  rangeLabel: string
): string {
  const exceptionLines = summary.exceptions
    .slice(0, 30)
    .map(
      (e) =>
        `- [${e.severity}] ${e.type} on ${e.serviceDate}${e.staffName ? ` (staff: ${e.staffName})` : ''}: ${e.message}`
    )

  return [
    `Reporting period: ${rangeLabel}`,
    `Scheduled: ${summary.scheduledCount}, Active: ${summary.activeCount}, Completed: ${summary.completedCount}, Missed: ${summary.missedCount}`,
    `Late check-ins: ${summary.lateCheckInCount}, GPS exceptions: ${summary.gpsExceptionCount}`,
    `Compliance score: ${summary.complianceRate}% (${summary.verifiedCount}/${summary.completedCount} completed visits fully verified)`,
    `Billable hours: ${summary.billableHours}`,
    '',
    exceptionLines.length > 0 ? 'Detected exceptions:' : 'No open exceptions.',
    ...exceptionLines,
  ].join('\n')
}
