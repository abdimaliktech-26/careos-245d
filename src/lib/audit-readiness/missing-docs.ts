import type { ClientRisk } from './client-risk'
import type { StaffComplianceResult } from './staff-risk'

export interface MissingDocClientRow {
  clientId: string
  clientName: string
  program: string
  missingDocuments: string[]
  overdueReviews: number
  riskLevel: ClientRisk['riskLevel']
}

export interface MissingDocOrgSummary {
  missingIntakeForms: number
  missingAnnualReviews: number
  missingSignatures: number
  missingStaffDocuments: number
}

export interface MissingDocReport {
  byClient: MissingDocClientRow[]
  byOrg: MissingDocOrgSummary
}

const REVIEW_CODES = new Set([
  'missing_annual_review',
  'missing_semi_annual_review',
  'missing_45_day_review',
])

/** Pure: build the gap report from already-analyzed risk data. */
export function buildMissingDocReport(
  clientRisks: ReadonlyArray<ClientRisk>,
  staff: Pick<StaffComplianceResult, 'staff'>,
): MissingDocReport {
  const byClient: MissingDocClientRow[] = clientRisks
    .filter((c) => c.gaps.length > 0)
    .map((c) => ({
      clientId: c.clientId,
      clientName: c.clientName,
      program: c.program,
      missingDocuments: c.gaps.filter((g) => g.code.startsWith('missing_')).map((g) => g.label),
      overdueReviews: c.gaps.filter((g) => REVIEW_CODES.has(g.code)).length,
      riskLevel: c.riskLevel,
    }))

  const byOrg: MissingDocOrgSummary = {
    missingIntakeForms: count(clientRisks, 'missing_intake'),
    missingAnnualReviews: count(clientRisks, 'missing_annual_review'),
    missingSignatures: count(clientRisks, 'missing_signatures'),
    missingStaffDocuments: staff.staff.reduce(
      (sum, s) => sum + s.gaps.filter((g) => g.code.includes('background') || g.code.startsWith('missing_')).length,
      0,
    ),
  }

  return { byClient, byOrg }
}

function count(clientRisks: ReadonlyArray<ClientRisk>, code: string): number {
  return clientRisks.reduce((sum, c) => sum + (c.gaps.some((g) => g.code === code) ? 1 : 0), 0)
}

/** Flatten the by-client report into CSV-ready rows. */
export function missingDocCsvRows(report: MissingDocReport): Array<Record<string, string | number>> {
  return report.byClient.map((row) => ({
    Client: row.clientName,
    Program: row.program,
    'Missing Documents': row.missingDocuments.join('; '),
    'Overdue Reviews': row.overdueReviews,
    'Risk Level': row.riskLevel,
  }))
}
