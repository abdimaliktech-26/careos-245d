import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetAggregatorConfig = vi.hoisted(() => vi.fn())
const mockCreateAdminClient = vi.hoisted(() => vi.fn())

vi.mock('@/lib/evv/aggregator/config', () => ({ getAggregatorConfig: mockGetAggregatorConfig }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mockCreateAdminClient }))

import { enqueueVisitTransmission, processTransmissionQueue } from '@/lib/evv/aggregator/queue'

/** Chainable + awaitable mock resolving to `result` for any terminal. */
function makeChain(result: { data?: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {}
  for (const m of ['select', 'insert', 'update', 'upsert', 'delete', 'eq', 'in', 'is', 'lt', 'lte', 'gte', 'not', 'order', 'limit']) {
    chain[m] = () => chain
  }
  chain.single = () => Promise.resolve(result)
  chain.maybeSingle = () => Promise.resolve(result)
  chain.then = (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(onF, onR)
  return chain
}

beforeEach(() => vi.clearAllMocks())

describe('enqueueVisitTransmission', () => {
  it('writes via the service role and reports queued', async () => {
    mockGetAggregatorConfig.mockResolvedValue({ vendor: 'hhaexchange', enabled: true, providerId: 'p', apiBase: 'x', apiKey: 'k' })
    const adminFrom = vi.fn(() => makeChain({ error: null }))
    mockCreateAdminClient.mockReturnValue({ from: adminFrom })

    const result = await enqueueVisitTransmission('org-1', 'visit-1', {} as never)
    expect(result.queued).toBe(true)
    expect(mockCreateAdminClient).toHaveBeenCalled()
    expect(adminFrom).toHaveBeenCalledWith('evv_aggregator_transmissions')
  })

  it('reports not-queued on a write error', async () => {
    mockGetAggregatorConfig.mockResolvedValue(null)
    mockCreateAdminClient.mockReturnValue({ from: () => makeChain({ error: { message: 'boom' } }) })
    const result = await enqueueVisitTransmission('org-1', 'visit-1', {} as never)
    expect(result.queued).toBe(false)
  })

  it('re-queues a previously rejected transmission on re-approval', async () => {
    mockGetAggregatorConfig.mockResolvedValue({ vendor: 'hhaexchange', enabled: true, providerId: 'p', apiBase: 'x', apiKey: 'k' })
    mockCreateAdminClient.mockReturnValue({ from: () => makeChain({ data: { id: 'tx-1', status: 'rejected' }, error: null }) })
    const result = await enqueueVisitTransmission('org-1', 'visit-1', {} as never)
    expect(result.queued).toBe(true)
  })

  it('is an idempotent no-op when already accepted (no re-submit)', async () => {
    mockGetAggregatorConfig.mockResolvedValue(null)
    const insert = vi.fn(() => makeChain({ error: null }))
    const update = vi.fn(() => makeChain({ error: null }))
    const chain = makeChain({ data: { id: 'tx-1', status: 'accepted' }, error: null }) as Record<string, unknown>
    chain.insert = insert
    chain.update = update
    mockCreateAdminClient.mockReturnValue({ from: () => chain })
    const result = await enqueueVisitTransmission('org-1', 'visit-1', {} as never)
    expect(result.queued).toBe(true)
    expect(insert).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })
})

describe('processTransmissionQueue', () => {
  it('returns an empty summary when nothing is due', async () => {
    const supabase = { from: () => makeChain({ data: [], error: null }) }
    const summary = await processTransmissionQueue(supabase as never, { now: new Date('2026-06-12T12:00:00Z') })
    expect(summary).toEqual({ processed: 0, accepted: 0, rejected: 0, retried: 0, failed: 0, held: 0 })
  })

  it('holds a due row when the org has no aggregator configured', async () => {
    const row = { id: 't', organization_id: 'o', visit_id: 'v', vendor: 'none', status: 'queued', attempts: 0, max_attempts: 5 }
    // due-select and the atomic claim both resolve to a single row; config is null → not_configured → held.
    const supabase = { from: () => makeChain({ data: [row], error: null }) }
    mockGetAggregatorConfig.mockResolvedValue(null)

    const summary = await processTransmissionQueue(supabase as never, { now: new Date('2026-06-12T12:00:00Z') })
    expect(summary.processed).toBe(1)
    expect(summary.held).toBe(1)
    expect(summary.accepted).toBe(0)
  })
})
