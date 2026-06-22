import { describe, test, expect } from 'vitest'
import { buildMissingDocReport, missingDocCsvRows } from '../missing-docs'
import { toCsv } from '../export'
import { combineMetrics, type AuditCounts } from '../metrics'
import type { ClientRisk } from '../client-risk'

const CLIENT_RISKS: ClientRisk[] = [
  {
    clientId: 'c1', clientName: 'Jane Doe', program: 'ICS', status: 'active',
    gaps: [
      { code: 'missing_intake', label: 'Missing intake documentation', risk: 'high' },
      { code: 'missing_annual_review', label: 'Missing annual review', risk: 'high' },
      { code: 'missing_signatures', label: 'Missing required signatures', risk: 'high' },
    ],
    score: 40, riskLevel: 'high',
  },
  {
    clientId: 'c2', clientName: 'John Roe', program: 'IHS', status: 'active',
    gaps: [], score: 100, riskLevel: 'low',
  },
]

describe('buildMissingDocReport', () => {
  test('only includes clients with gaps in byClient', () => {
    const report = buildMissingDocReport(CLIENT_RISKS, { staff: [] })
    expect(report.byClient).toHaveLength(1)
    expect(report.byClient[0].clientName).toBe('Jane Doe')
  })

  test('aggregates org-level counts', () => {
    const report = buildMissingDocReport(CLIENT_RISKS, { staff: [] })
    expect(report.byOrg.missingIntakeForms).toBe(1)
    expect(report.byOrg.missingAnnualReviews).toBe(1)
    expect(report.byOrg.missingSignatures).toBe(1)
  })
})

describe('missingDocCsvRows + toCsv', () => {
  test('produces escaped CSV with a header row', () => {
    const report = buildMissingDocReport(CLIENT_RISKS, { staff: [] })
    const csv = toCsv(missingDocCsvRows(report))
    const lines = csv.split('\r\n')
    expect(lines[0]).toBe('Client,Program,Missing Documents,Overdue Reviews,Risk Level')
    expect(lines[1]).toContain('Jane Doe')
  })

  test('quotes values containing the delimiter', () => {
    const csv = toCsv([{ a: 'has, comma', b: 'plain' }])
    expect(csv.split('\r\n')[1]).toBe('"has, comma",plain')
  })
})

describe('combineMetrics', () => {
  test('derives missing/expired/alert counts', () => {
    const counts: AuditCounts = {
      totalClients: 2, activeClients: 2, filesReviewed: 5,
      upcomingReviewsDue: 1, openIncidents: 3, staffTrainingExpiring: 0,
    }
    const metrics = combineMetrics(counts, CLIENT_RISKS, { highRisk: [] })
    expect(metrics.missingDocuments).toBe(3)
    // one high-risk client + 0 high-risk staff + 3 open incidents
    expect(metrics.complianceAlerts).toBe(4)
  })
})
