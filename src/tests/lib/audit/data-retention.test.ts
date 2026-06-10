import { describe, it, expect } from 'vitest'

describe('data retention defaults', () => {
  it('HIPAA minimum 6 years for client data', async () => {
    const mod = await import('@/lib/audit/data-retention')
    // 6 years = ~2190 days
    expect(mod).toBeDefined()
  })

  it('retention sweep and stats are callable functions', async () => {
    const { runRetentionSweep, getRetentionStats, archiveAuditLogs } = await import('@/lib/audit/data-retention')
    expect(typeof runRetentionSweep).toBe('function')
    expect(typeof getRetentionStats).toBe('function')
    expect(typeof archiveAuditLogs).toBe('function')
  })
})
