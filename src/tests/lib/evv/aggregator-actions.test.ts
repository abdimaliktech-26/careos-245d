import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetSession = vi.hoisted(() => vi.fn())
const mockCreateClient = vi.hoisted(() => vi.fn())
const mockCreateAdminClient = vi.hoisted(() => vi.fn())
const mockLogAuditEvent = vi.hoisted(() => vi.fn())
const mockEnqueue = vi.hoisted(() => vi.fn())

vi.mock('@/lib/auth/get-session', () => ({ getSession: mockGetSession }))
vi.mock('@/lib/supabase/server', () => ({ createClient: mockCreateClient }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mockCreateAdminClient }))
vi.mock('@/lib/audit/log', () => ({ logAuditEvent: mockLogAuditEvent }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/evv/aggregator/queue', () => ({ enqueueVisitTransmission: mockEnqueue }))

import { saveAggregatorConfig, requeueTransmission, enqueueVisit } from '@/lib/evv/aggregator/actions'

const UUID = '11111111-1111-4111-8111-111111111111'

function makeChain(result: { data?: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {}
  for (const m of ['select', 'insert', 'update', 'upsert', 'delete', 'eq', 'in']) chain[m] = () => chain
  chain.then = (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(onF, onR)
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
  mockLogAuditEvent.mockResolvedValue(undefined)
})

describe('saveAggregatorConfig', () => {
  const valid = { vendor: 'hhaexchange' as const, providerId: 'PRV-1', apiBase: 'https://api.example.com', credentialRef: 'HHA_KEY', enabled: true }

  it('rejects unauthenticated users', async () => {
    mockGetSession.mockResolvedValue({ user: null, error: 'no' })
    expect((await saveAggregatorConfig(valid)).error).toBe('Unauthorized')
  })

  it('requires an admin role', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u', organizationId: 'o', role: 'program_manager' }, error: null })
    expect((await saveAggregatorConfig(valid)).error).toMatch(/admin role/)
  })

  it('rejects an invalid API base URL', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u', organizationId: 'o', role: 'org_admin' }, error: null })
    expect((await saveAggregatorConfig({ ...valid, apiBase: 'not-a-url' })).error).toBeTruthy()
  })

  it('blocks enabling without the pieces needed to transmit', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u', organizationId: 'o', role: 'org_admin' }, error: null })
    const result = await saveAggregatorConfig({ vendor: 'hhaexchange', enabled: true, providerId: '', apiBase: '', credentialRef: '' })
    expect(result.error).toMatch(/required to enable/)
  })

  it('saves a valid config via the service role', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u', organizationId: 'o', role: 'org_admin', email: 'e' }, error: null })
    mockCreateAdminClient.mockReturnValue({ from: () => makeChain({ error: null }) })
    const result = await saveAggregatorConfig(valid)
    expect(result.error).toBeNull()
    expect(mockCreateAdminClient).toHaveBeenCalled()
  })
})

describe('requeueTransmission', () => {
  it('rejects unauthenticated users', async () => {
    mockGetSession.mockResolvedValue({ user: null, error: 'no' })
    expect((await requeueTransmission(UUID)).error).toBe('Unauthorized')
  })

  it('rejects staff role', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u', organizationId: 'o', role: 'staff' }, error: null })
    expect((await requeueTransmission(UUID)).error).toMatch(/Supervisor role/)
  })

  it('rejects an invalid visit id', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u', organizationId: 'o', role: 'org_admin' }, error: null })
    expect((await requeueTransmission('nope')).error).toBe('Invalid visit.')
  })

  it('re-queues via the service role', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u', organizationId: 'o', role: 'org_admin', email: 'e' }, error: null })
    mockCreateAdminClient.mockReturnValue({ from: () => makeChain({ error: null }) })
    const result = await requeueTransmission(UUID)
    expect(result.error).toBeNull()
    expect(mockCreateAdminClient).toHaveBeenCalled()
  })
})

describe('enqueueVisit', () => {
  it('rejects staff role', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u', organizationId: 'o', role: 'staff' }, error: null })
    expect((await enqueueVisit(UUID)).error).toMatch(/Supervisor role/)
  })

  it('rejects an invalid visit id', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u', organizationId: 'o', role: 'program_manager' }, error: null })
    expect((await enqueueVisit('nope')).error).toBe('Invalid visit.')
  })

  it('queues a valid visit', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u', organizationId: 'o', role: 'program_manager' }, error: null })
    mockCreateClient.mockResolvedValue({})
    mockEnqueue.mockResolvedValue({ queued: true })
    const result = await enqueueVisit(UUID)
    expect(result.success).toBeTruthy()
  })
})
