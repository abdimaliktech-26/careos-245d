import { describe, it, expect, vi, beforeEach } from 'vitest'
import { saveOrganizationSettings, inviteTeamMembers, createFirstClient, completeOnboarding } from '@/lib/onboarding/actions'

const mockGetSession = vi.hoisted(() => vi.fn())
const mockCreateServerClient = vi.hoisted(() => vi.fn())
const mockCreateAdminClient = vi.hoisted(() => vi.fn())
const mockRevalidatePath = vi.hoisted(() => vi.fn())

vi.mock('@/lib/auth/get-session', () => ({ getSession: mockGetSession }))
vi.mock('@/lib/supabase/server', () => ({ createClient: mockCreateServerClient }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mockCreateAdminClient }))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }))

function makeFormData(values: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(values)) {
    fd.append(key, value)
  }
  return fd
}

describe('saveOrganizationSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue({ user: { organizationId: 'org-1' }, error: null })
  })

  it('returns error when name is empty', async () => {
    const result = await saveOrganizationSettings({ error: null, success: false }, makeFormData({ name: '' }))
    expect(result.error).toBe('Organization name is required')
    expect(result.success).toBe(false)
  })

  it('returns error when name is whitespace', async () => {
    const result = await saveOrganizationSettings({ error: null, success: false }, makeFormData({ name: '   ' }))
    expect(result.error).toBe('Organization name is required')
  })

  it('returns unauthorized without session', async () => {
    mockGetSession.mockResolvedValue({ user: null, error: 'Not authenticated' })
    const result = await saveOrganizationSettings({ error: null, success: false }, makeFormData({ name: 'Test Org' }))
    expect(result.error).toBe('Unauthorized')
  })

  it('returns unauthorized without organizationId', async () => {
    mockGetSession.mockResolvedValue({ user: { organizationId: null }, error: null })
    const result = await saveOrganizationSettings({ error: null, success: false }, makeFormData({ name: 'Test Org' }))
    expect(result.error).toBe('No organization assigned')
  })

  it('saves with valid name and optional fields', async () => {
    const mockUpdate = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }))
    mockCreateServerClient.mockResolvedValue({ from: vi.fn(() => ({ update: mockUpdate })) })

    const result = await saveOrganizationSettings(
      { error: null, success: false },
      makeFormData({ name: 'Care Clinic', licenseNumber: 'LIC-123', phone: '612-555-0100' }),
    )
    expect(result.error).toBeNull()
    expect(result.success).toBe(true)
  })

  it('saves with just name and no optional fields', async () => {
    const mockUpdate = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }))
    mockCreateServerClient.mockResolvedValue({ from: vi.fn(() => ({ update: mockUpdate })) })

    const result = await saveOrganizationSettings(
      { error: null, success: false },
      makeFormData({ name: 'Care Clinic' }),
    )
    expect(result.success).toBe(true)
  })

  it('returns database error on failure', async () => {
    const mockUpdate = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: { message: 'DB error' } }) }))
    mockCreateServerClient.mockResolvedValue({ from: vi.fn(() => ({ update: mockUpdate })) })

    const result = await saveOrganizationSettings(
      { error: null, success: false },
      makeFormData({ name: 'Care Clinic' }),
    )
    expect(result.error).toBe('DB error')
    expect(result.success).toBe(false)
  })
})

describe('inviteTeamMembers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue({ user: { organizationId: 'org-1', id: 'user-1' }, error: null })
  })

  it('skips invitation when email is empty', async () => {
    const result = await inviteTeamMembers({ error: null, success: false }, makeFormData({ email: '' }))
    expect(result.success).toBe(true)
    expect(result.error).toBeNull()
  })

  it('returns unauthorized without session', async () => {
    mockGetSession.mockResolvedValue({ user: null, error: 'Not authenticated' })
    const result = await inviteTeamMembers({ error: null, success: false }, makeFormData({ email: 'test@example.com' }))
    expect(result.error).toBe('Unauthorized')
  })

  it('returns unauthorized without organizationId', async () => {
    mockGetSession.mockResolvedValue({ user: { organizationId: null }, error: null })
    const result = await inviteTeamMembers({ error: null, success: false }, makeFormData({ email: 'test@example.com' }))
    expect(result.error).toBe('No organization assigned')
  })

  it('invites existing user without creating a new auth account', async () => {
    const mockListUsers = vi.fn().mockResolvedValue({
      data: { users: [{ id: 'existing-user-id', email: 'existing@example.com' }] },
      error: null,
    })
    const mockInsert = vi.fn().mockResolvedValue({ error: null })
    mockCreateAdminClient.mockReturnValue({
      auth: { admin: { listUsers: mockListUsers } },
      from: vi.fn(() => ({ insert: mockInsert })),
    })

    const result = await inviteTeamMembers(
      { error: null, success: false },
      makeFormData({ email: 'existing@example.com', role: 'staff', name: 'Existing User' }),
    )
    expect(result.success).toBe(true)
    expect(mockInsert).toHaveBeenCalledOnce()
  })

  it('maps display role names to db roles', async () => {
    const mockListUsers = vi.fn().mockResolvedValue({
      data: { users: [{ id: 'user-id', email: 'pm@example.com' }] },
      error: null,
    })
    const mockInsert = vi.fn().mockResolvedValue({ error: null })
    mockCreateAdminClient.mockReturnValue({
      auth: { admin: { listUsers: mockListUsers } },
      from: vi.fn(() => ({ insert: mockInsert })),
    })

    const result = await inviteTeamMembers(
      { error: null, success: false },
      makeFormData({ email: 'pm@example.com', role: 'Program Manager' }),
    )
    expect(result.success).toBe(true)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'program_manager' }),
    )
  })

  it('defaults to staff role when role is unrecognized', async () => {
    const mockListUsers = vi.fn().mockResolvedValue({
      data: { users: [] },
      error: null,
    })
    const mockCreateUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'new-user-id' } },
      error: null,
    })
    const mockInsert = vi.fn().mockResolvedValue({ error: null })
    mockCreateAdminClient.mockReturnValue({
      auth: { admin: { listUsers: mockListUsers, createUser: mockCreateUser } },
      from: vi.fn(() => ({ insert: mockInsert })),
    })

    const result = await inviteTeamMembers(
      { error: null, success: false },
      makeFormData({ email: 'new@example.com', role: 'UnknownRole' }),
    )
    expect(result.success).toBe(true)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'staff' }),
    )
  })

  it('uses email as fallback name', async () => {
    const mockListUsers = vi.fn().mockResolvedValue({
      data: { users: [] },
      error: null,
    })
    const mockCreateUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'new-user-id' } },
      error: null,
    })
    const mockInsert = vi.fn().mockResolvedValue({ error: null })
    mockCreateAdminClient.mockReturnValue({
      auth: { admin: { listUsers: mockListUsers, createUser: mockCreateUser } },
      from: vi.fn(() => ({ insert: mockInsert })),
    })

    const result = await inviteTeamMembers(
      { error: null, success: false },
      makeFormData({ email: 'nameless@example.com' }),
    )
    expect(result.success).toBe(true)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ full_name: 'nameless@example.com' }),
    )
  })
})

describe('createFirstClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue({ user: { organizationId: 'org-1', id: 'user-1' }, error: null })
  })

  it('skips creation when firstName is empty', async () => {
    const result = await createFirstClient({ error: null, success: false }, makeFormData({ firstName: '' }))
    expect(result.success).toBe(true)
    expect(result.error).toBeNull()
  })

  it('skips creation when firstName is whitespace', async () => {
    const result = await createFirstClient({ error: null, success: false }, makeFormData({ firstName: '   ' }))
    expect(result.success).toBe(true)
  })

  it('returns unauthorized without session', async () => {
    mockGetSession.mockResolvedValue({ user: null, error: 'Not authenticated' })
    const result = await createFirstClient({ error: null, success: false }, makeFormData({ firstName: 'Jane' }))
    expect(result.error).toBe('Unauthorized')
  })

  it('creates client with required fields', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null })
    mockCreateServerClient.mockResolvedValue({ from: vi.fn(() => ({ insert: mockInsert })) })

    const result = await createFirstClient(
      { error: null, success: false },
      makeFormData({ firstName: 'Jane', lastName: 'Doe' }),
    )
    expect(result.success).toBe(true)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        legal_name: 'Jane Doe',
        program: 'ICS',
        status: 'active',
      }),
    )
  })

  it('defaults program to ICS', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null })
    mockCreateServerClient.mockResolvedValue({ from: vi.fn(() => ({ insert: mockInsert })) })

    await createFirstClient(
      { error: null, success: false },
      makeFormData({ firstName: 'Jane' }),
    )
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ program: 'ICS' }),
    )
  })

  it('uses provided program when specified', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null })
    mockCreateServerClient.mockResolvedValue({ from: vi.fn(() => ({ insert: mockInsert })) })

    await createFirstClient(
      { error: null, success: false },
      makeFormData({ firstName: 'Jane', lastName: 'Doe', program: 'IHS' }),
    )
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ program: 'IHS' }),
    )
  })
})

describe('completeOnboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue({ user: { organizationId: 'org-1' }, error: null })
  })

  it('returns unauthorized without session', async () => {
    mockGetSession.mockResolvedValue({ user: null, error: 'Not authenticated' })
    const result = await completeOnboarding({ error: null, success: false }, new FormData())
    expect(result.error).toBe('Unauthorized')
  })

  it('completes onboarding successfully', async () => {
    const mockUpdate = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }))
    mockCreateServerClient.mockResolvedValue({ from: vi.fn(() => ({ update: mockUpdate })) })

    const result = await completeOnboarding({ error: null, success: false }, new FormData())
    expect(result.success).toBe(true)
    expect(result.error).toBeNull()
  })

  it('handles database error', async () => {
    const mockUpdate = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } }) }))
    mockCreateServerClient.mockResolvedValue({ from: vi.fn(() => ({ update: mockUpdate })) })

    const result = await completeOnboarding({ error: null, success: false }, new FormData())
    expect(result.success).toBe(false)
    expect(result.error).toBe('Update failed')
  })
})
