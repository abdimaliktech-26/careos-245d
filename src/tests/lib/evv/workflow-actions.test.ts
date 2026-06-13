import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetSession = vi.hoisted(() => vi.fn())
const mockCreateClient = vi.hoisted(() => vi.fn())
const mockLogAuditEvent = vi.hoisted(() => vi.fn())
const mockEnqueue = vi.hoisted(() => vi.fn())
const mockSyncScheduledVisits = vi.hoisted(() => vi.fn())

vi.mock('@/lib/auth/get-session', () => ({ getSession: mockGetSession }))
vi.mock('@/lib/supabase/server', () => ({ createClient: mockCreateClient }))
vi.mock('@/lib/audit/log', () => ({ logAuditEvent: mockLogAuditEvent }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/evv/aggregator/queue', () => ({ enqueueVisitTransmission: mockEnqueue }))
vi.mock('@/lib/evv/schedule-sync', () => ({ syncScheduledVisits: mockSyncScheduledVisits }))

import {
  saveProgressNote,
  supervisorReview,
  billingDecision,
  resolveException,
  syncVisitsFromSchedule,
} from '@/lib/evv/workflow-actions'

const UUID = '11111111-1111-4111-8111-111111111111'

/** Chain that is both a query builder and awaitable, resolving to `result`. */
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

beforeEach(() => {
  vi.clearAllMocks()
  mockLogAuditEvent.mockResolvedValue(undefined)
  mockEnqueue.mockResolvedValue({ queued: true })
})

describe('saveProgressNote', () => {
  it('rejects unauthenticated users', async () => {
    mockGetSession.mockResolvedValue({ user: null, error: 'no' })
    expect((await saveProgressNote(UUID, 'a note long enough here', 'manual')).error).toBe('Unauthorized')
  })

  it('rejects roles without staff access', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u', organizationId: 'o', role: 'external_signer' }, error: null })
    expect((await saveProgressNote(UUID, 'a note long enough here', 'manual')).error).toBe('Unauthorized')
  })

  it('validates note length', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u', organizationId: 'o', role: 'staff' }, error: null })
    expect((await saveProgressNote(UUID, 'too short', 'manual')).error).toMatch(/at least 20/)
  })

  it('saves a valid note', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u', organizationId: 'o', role: 'staff', email: 'e' }, error: null })
    mockCreateClient.mockResolvedValue({ from: () => makeChain({ error: null }) })
    const result = await saveProgressNote(UUID, 'This is a sufficiently long progress note.', 'ai')
    expect(result.error).toBeNull()
    expect(result.success).toMatch(/supervisor review/)
  })
})

describe('supervisorReview', () => {
  it('requires a supervisor role', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u', organizationId: 'o', role: 'staff' }, error: null })
    expect((await supervisorReview(UUID, 'approved')).error).toMatch(/Supervisor role/)
  })

  it('approves and moves to billing queue', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u', organizationId: 'o', role: 'program_manager', email: 'e' }, error: null })
    mockCreateClient.mockResolvedValue({ from: () => makeChain({ error: null }) })
    const result = await supervisorReview(UUID, 'approved')
    expect(result.error).toBeNull()
    expect(result.success).toMatch(/billing queue/)
  })
})

describe('billingDecision', () => {
  it('requires a supervisor role', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u', organizationId: 'o', role: 'staff' }, error: null })
    expect((await billingDecision(UUID, 'approved')).error).toMatch(/Supervisor role/)
  })

  it('blocks approval of a non-completed visit', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u', organizationId: 'o', role: 'org_admin' }, error: null })
    mockCreateClient.mockResolvedValue({
      from: () => makeChain({ data: { status: 'in_progress', review_status: 'approved', actual_start: 't', actual_end: 't' }, error: null }),
    })
    expect((await billingDecision(UUID, 'approved')).error).toMatch(/completed visits/)
    expect(mockEnqueue).not.toHaveBeenCalled()
  })

  it('blocks approval without supervisor sign-off', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u', organizationId: 'o', role: 'org_admin' }, error: null })
    mockCreateClient.mockResolvedValue({
      from: () => makeChain({ data: { status: 'completed', review_status: 'pending', actual_start: 't', actual_end: 't' }, error: null }),
    })
    expect((await billingDecision(UUID, 'approved')).error).toMatch(/review must be approved/)
  })

  it('approves a valid visit and enqueues transmission', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u', organizationId: 'o', role: 'org_admin', email: 'e' }, error: null })
    mockCreateClient.mockResolvedValue({
      from: () => makeChain({ data: { status: 'completed', review_status: 'approved', actual_start: 't', actual_end: 't' }, error: null }),
    })
    const result = await billingDecision(UUID, 'approved')
    expect(result.error).toBeNull()
    expect(mockEnqueue).toHaveBeenCalledWith('o', UUID, expect.anything())
  })

  it('does not enqueue on rejection', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u', organizationId: 'o', role: 'org_admin', email: 'e' }, error: null })
    mockCreateClient.mockResolvedValue({
      from: () => makeChain({ data: { status: 'completed', review_status: 'approved', actual_start: 't', actual_end: 't' }, error: null }),
    })
    await billingDecision(UUID, 'rejected')
    expect(mockEnqueue).not.toHaveBeenCalled()
  })
})

describe('resolveException', () => {
  it('requires a supervisor role', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u', organizationId: 'o', role: 'staff' }, error: null })
    expect((await resolveException(UUID, 'device_issue', 'fixed it')).error).toMatch(/Supervisor role/)
  })

  it('requires an explanation note', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u', organizationId: 'o', role: 'org_admin' }, error: null })
    expect((await resolveException(UUID, 'device_issue', 'x')).error).toBeTruthy()
  })
})

describe('syncVisitsFromSchedule', () => {
  it('requires a supervisor role', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u', organizationId: 'o', role: 'staff' }, error: null })
    expect((await syncVisitsFromSchedule('2026-06-01', '2026-06-30')).error).toMatch(/Supervisor role/)
  })

  it('rejects malformed dates', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u', organizationId: 'o', role: 'org_admin' }, error: null })
    expect((await syncVisitsFromSchedule('June', 'July')).error).toBeTruthy()
  })

  it('reports the number of visits created', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u', organizationId: 'o', role: 'org_admin', email: 'e' }, error: null })
    mockCreateClient.mockResolvedValue({})
    mockSyncScheduledVisits.mockResolvedValue({ created: 3 })
    const result = await syncVisitsFromSchedule('2026-06-01', '2026-06-30')
    expect(result.success).toMatch(/Created 3/)
  })
})
