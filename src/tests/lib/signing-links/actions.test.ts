import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSigningLink, completeExternalSignature, resendSigningLink, revokeSigningLink, getSigningLinkStatus } from '@/lib/signing-links/actions'

const mockGetSession = vi.hoisted(() => vi.fn())
const mockCreateClient = vi.hoisted(() => vi.fn())
const mockCreateAdminClient = vi.hoisted(() => vi.fn())
const mockRevalidatePath = vi.hoisted(() => vi.fn())
const mockStoreCompletedFormDocument = vi.hoisted(() => vi.fn())
const mockValidateRequiredSignatures = vi.hoisted(() => vi.fn())

vi.mock('@/lib/auth/get-session', () => ({ getSession: mockGetSession }))
vi.mock('@/lib/supabase/server', () => ({ createClient: mockCreateClient }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mockCreateAdminClient }))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }))
vi.mock('@/lib/documents/form-documents', () => ({ storeCompletedFormDocument: mockStoreCompletedFormDocument }))
vi.mock('@/lib/forms/signature-validation', () => ({ validateRequiredSignatures: mockValidateRequiredSignatures }))

function makeFormData(values: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(values)) {
    fd.append(key, value)
  }
  return fd
}

function chainableMock(resolvedData: Record<string, unknown>) {
  const chain: Record<string, unknown> = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    single: vi.fn().mockResolvedValue(resolvedData),
  }
  return vi.fn(() => chain)
}

describe('createSigningLink', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns unauthorized when not authenticated', async () => {
    mockGetSession.mockResolvedValue({ user: null, error: 'Not authenticated' })
    const result = await createSigningLink({ error: null }, new FormData())
    expect(result.error).toBe('Unauthorized')
  })

  it('returns unauthorized when user has no organization', async () => {
    mockGetSession.mockResolvedValue({ user: { organizationId: null, role: 'staff' }, error: null })
    const result = await createSigningLink({ error: null }, new FormData())
    expect(result.error).toBe('Unauthorized')
  })

  it('returns unauthorized for external_signer role', async () => {
    mockGetSession.mockResolvedValue({ user: { organizationId: 'org-1', role: 'external_signer' }, error: null })
    const result = await createSigningLink({ error: null }, new FormData())
    expect(result.error).toBe('Unauthorized')
  })

  it('validates required fields', async () => {
    mockGetSession.mockResolvedValue({ user: { organizationId: 'org-1', role: 'staff', id: 'user-1' }, error: null })
    const result = await createSigningLink({ error: null }, new FormData())
    expect(result.error).toBeTruthy()
  })

  it('validates UUID format for packetFormId', async () => {
    mockGetSession.mockResolvedValue({ user: { organizationId: 'org-1', role: 'staff', id: 'user-1' }, error: null })
    const fd = makeFormData({ packetFormId: 'not-a-uuid', signerName: 'Alice', signerRole: 'client' })
    const result = await createSigningLink({ error: null }, fd)
    expect(result.error).toBeTruthy()
  })

  it('validates signerName min length', async () => {
    mockGetSession.mockResolvedValue({ user: { organizationId: 'org-1', role: 'staff', id: 'user-1' }, error: null })
    const fd = makeFormData({
      packetFormId: '11111111-1111-4111-8111-111111111111',
      signerName: 'A',
      signerRole: 'client',
    })
    const result = await createSigningLink({ error: null }, fd)
    expect(result.error).toBe('Signer name is required')
  })

  it('validates signerRole is client or guardian', async () => {
    mockGetSession.mockResolvedValue({ user: { organizationId: 'org-1', role: 'staff', id: 'user-1' }, error: null })
    const fd = makeFormData({
      packetFormId: '11111111-1111-4111-8111-111111111111',
      signerName: 'Alice',
      signerRole: 'staff',
    })
    const result = await createSigningLink({ error: null }, fd)
    expect(result.error).toBeTruthy()
  })

  it('validates email format when provided', async () => {
    mockGetSession.mockResolvedValue({ user: { organizationId: 'org-1', role: 'staff', id: 'user-1' }, error: null })
    const fd = makeFormData({
      packetFormId: '11111111-1111-4111-8111-111111111111',
      signerName: 'Alice',
      signerRole: 'client',
      signerEmail: 'not-an-email',
    })
    const result = await createSigningLink({ error: null }, fd)
    expect(result.error).toBeTruthy()
  })

  it('passes valid email format', async () => {
    mockGetSession.mockResolvedValue({ user: { organizationId: 'org-1', role: 'staff', id: 'user-1' }, error: null })

    mockCreateClient.mockResolvedValue({
      from: chainableMock({ data: { id: 'pf-1', packet_id: 'p-1', packets: { organization_id: 'org-1' } }, error: null }),
    })
    mockCreateAdminClient.mockReturnValue({
      from: chainableMock({ data: { token: 'test-token-123' }, error: null }),
    })

    const fd = makeFormData({
      packetFormId: '11111111-1111-4111-8111-111111111111',
      signerName: 'Alice Smith',
      signerRole: 'client',
      signerEmail: 'alice@example.com',
    })
    const result = await createSigningLink({ error: null }, fd)
    expect(result.error).toBeNull()
    expect(result.link).toBe('/sign/test-token-123')
  })

  it('accepts empty email', async () => {
    mockGetSession.mockResolvedValue({ user: { organizationId: 'org-1', role: 'staff', id: 'user-1' }, error: null })

    mockCreateClient.mockResolvedValue({
      from: chainableMock({ data: { id: 'pf-1', packet_id: 'p-1', packets: { organization_id: 'org-1' } }, error: null }),
    })
    mockCreateAdminClient.mockReturnValue({
      from: chainableMock({ data: { token: 'test-token-456' }, error: null }),
    })

    const fd = makeFormData({
      packetFormId: '11111111-1111-4111-8111-111111111111',
      signerName: 'Bob',
      signerRole: 'guardian',
    })
    const result = await createSigningLink({ error: null }, fd)
    expect(result.error).toBeNull()
    expect(result.link).toBe('/sign/test-token-456')
  })
})

describe('completeExternalSignature', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStoreCompletedFormDocument.mockResolvedValue(undefined)
  })

  it('validates token minimum length', async () => {
    const fd = makeFormData({ token: 'short', signerName: 'Alice Smith', signatureTyped: 'Alice Smith' })
    const result = await completeExternalSignature({ error: null }, fd)
    expect(result.error).toBeTruthy()
  })

  it('validates signerName min length', async () => {
    const fd = makeFormData({ token: 'a'.repeat(20), signerName: 'A', signatureTyped: 'Alice Smith' })
    const result = await completeExternalSignature({ error: null }, fd)
    expect(result.error).toBe('Signer name is required')
  })

  it('requires at least one signature type', async () => {
    const fd = makeFormData({ token: 'a'.repeat(20), signerName: 'Alice Smith' })
    const result = await completeExternalSignature({ error: null }, fd)
    expect(result.error).toBe('Please provide your signature (typed or drawn)')
  })

  it('accepts typed signature without drawn', async () => {
    mockCreateAdminClient.mockReturnValue({
      from: chainableMock({
        data: {
          id: 'link-1', organization_id: 'org-1', packet_id: 'p-1',
          packet_form_id: 'pf-1', signer_role: 'client',
          signer_email: 'alice@example.com',
          expires_at: '2099-12-31T00:00:00Z',
          completed_at: null, is_revoked: false,
        },
        error: null,
      }),
    })
    mockValidateRequiredSignatures.mockReturnValue({
      hasClientOrGuardian: true, hasCaseManager: true, isValid: true, missing: [], alert: null,
    })

    const fd = makeFormData({ token: 'a'.repeat(20), signerName: 'Alice Smith', signatureTyped: 'Alice Smith' })
    const result = await completeExternalSignature({ error: null }, fd)
    expect(result.error).toBeNull()
    expect(result.success).toContain('complete')
  })

  it('accepts drawn signature without typed', async () => {
    mockCreateAdminClient.mockReturnValue({
      from: chainableMock({
        data: {
          id: 'link-2', organization_id: 'org-1', packet_id: 'p-1',
          packet_form_id: 'pf-1', signer_role: 'guardian',
          signer_email: null,
          expires_at: '2099-12-31T00:00:00Z',
          completed_at: null, is_revoked: false,
        },
        error: null,
      }),
    })
    mockValidateRequiredSignatures.mockReturnValue({
      hasClientOrGuardian: true, hasCaseManager: true, isValid: true, missing: [], alert: null,
    })

    const fd = makeFormData({ token: 'a'.repeat(20), signerName: 'Bob Guardian', signatureDrawn: 'data:image/png;base64,abc123' })
    const result = await completeExternalSignature({ error: null }, fd)
    expect(result.error).toBeNull()
  })

  it('rejects when link is not found', async () => {
    mockCreateAdminClient.mockReturnValue({
      from: chainableMock({ data: null, error: { message: 'Not found' } }),
    })
    const fd = makeFormData({ token: 'a'.repeat(20), signerName: 'Alice Smith', signatureTyped: 'Alice Smith' })
    const result = await completeExternalSignature({ error: null }, fd)
    expect(result.error).toBe('Signing link not found')
  })

  it('rejects revoked links', async () => {
    mockCreateAdminClient.mockReturnValue({
      from: chainableMock({
        data: { id: 'link-3', is_revoked: true, completed_at: null, expires_at: '2099-12-31T00:00:00Z', packet_form_id: 'pf-1' },
        error: null,
      }),
    })
    const fd = makeFormData({ token: 'a'.repeat(20), signerName: 'Alice Smith', signatureTyped: 'Alice Smith' })
    const result = await completeExternalSignature({ error: null }, fd)
    expect(result.error).toBe('Signing link has been revoked')
  })

  it('rejects already completed links', async () => {
    mockCreateAdminClient.mockReturnValue({
      from: chainableMock({
        data: { id: 'link-4', is_revoked: false, completed_at: '2026-06-01T00:00:00Z', expires_at: '2099-12-31T00:00:00Z', packet_form_id: 'pf-1' },
        error: null,
      }),
    })
    const fd = makeFormData({ token: 'a'.repeat(20), signerName: 'Alice Smith', signatureTyped: 'Alice Smith' })
    const result = await completeExternalSignature({ error: null }, fd)
    expect(result.error).toBe('This signing link has already been completed')
  })

  it('rejects expired links', async () => {
    mockCreateAdminClient.mockReturnValue({
      from: chainableMock({
        data: { id: 'link-5', is_revoked: false, completed_at: null, expires_at: '2020-01-01T00:00:00Z', packet_form_id: 'pf-1' },
        error: null,
      }),
    })
    const fd = makeFormData({ token: 'a'.repeat(20), signerName: 'Alice Smith', signatureTyped: 'Alice Smith' })
    const result = await completeExternalSignature({ error: null }, fd)
    expect(result.error).toBe('Signing link has expired')
  })

  it('validates signatureTyped max length', async () => {
    const fd = makeFormData({ token: 'a'.repeat(20), signerName: 'Alice Smith', signatureTyped: 'x'.repeat(181) })
    const result = await completeExternalSignature({ error: null }, fd)
    expect(result.error).toBeTruthy()
  })

  it('calls storeCompletedFormDocument when all signatures present', async () => {
    mockCreateAdminClient.mockReturnValue({
      from: chainableMock({
        data: {
          id: 'link-6', organization_id: 'org-1', packet_id: 'p-1',
          packet_form_id: 'pf-1', signer_role: 'client',
          signer_email: 'alice@example.com',
          expires_at: '2099-12-31T00:00:00Z',
          completed_at: null, is_revoked: false,
        },
        error: null,
      }),
    })
    mockValidateRequiredSignatures.mockReturnValue({
      hasClientOrGuardian: true, hasCaseManager: true, isValid: true, missing: [], alert: null,
    })

    const fd = makeFormData({ token: 'a'.repeat(20), signerName: 'Alice Smith', signatureTyped: 'Alice Smith' })
    await completeExternalSignature({ error: null }, fd)
    expect(mockStoreCompletedFormDocument).toHaveBeenCalledWith('pf-1')
  })

  it('does not call storeCompletedFormDocument when signatures incomplete', async () => {
    mockCreateAdminClient.mockReturnValue({
      from: chainableMock({
        data: {
          id: 'link-7', organization_id: 'org-1', packet_id: 'p-1',
          packet_form_id: 'pf-1', signer_role: 'client',
          signer_email: 'alice@example.com',
          expires_at: '2099-12-31T00:00:00Z',
          completed_at: null, is_revoked: false,
        },
        error: null,
      }),
    })
    mockValidateRequiredSignatures.mockReturnValue({
      hasClientOrGuardian: true, hasCaseManager: false, isValid: false, missing: ['case manager signature'], alert: 'Missing case manager signature.',
    })

    const fd = makeFormData({ token: 'a'.repeat(20), signerName: 'Alice Smith', signatureTyped: 'Alice Smith' })
    await completeExternalSignature({ error: null }, fd)
    expect(mockStoreCompletedFormDocument).not.toHaveBeenCalled()
  })
})

describe('getSigningLinkStatus', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns pending for active link', async () => {
    mockCreateAdminClient.mockReturnValue({
      from: chainableMock({
        data: { expires_at: '2099-12-31T00:00:00Z', completed_at: null, is_revoked: false, created_at: '2026-06-01T00:00:00Z' },
        error: null,
      }),
    })
    const result = await getSigningLinkStatus('valid-token')
    expect(result.error).toBeNull()
    expect(result.data?.status).toBe('pending')
  })

  it('returns completed for completed link', async () => {
    mockCreateAdminClient.mockReturnValue({
      from: chainableMock({
        data: { expires_at: '2099-12-31T00:00:00Z', completed_at: '2026-06-15T00:00:00Z', is_revoked: false, created_at: '2026-06-01T00:00:00Z' },
        error: null,
      }),
    })
    const result = await getSigningLinkStatus('completed-token')
    expect(result.data?.status).toBe('completed')
    expect(result.data?.completedAt).toBe('2026-06-15T00:00:00Z')
  })

  it('returns revoked for revoked link', async () => {
    mockCreateAdminClient.mockReturnValue({
      from: chainableMock({
        data: { expires_at: '2099-12-31T00:00:00Z', completed_at: null, is_revoked: true, created_at: '2026-06-01T00:00:00Z' },
        error: null,
      }),
    })
    const result = await getSigningLinkStatus('revoked-token')
    expect(result.data?.status).toBe('revoked')
  })

  it('returns expired for past expires_at', async () => {
    mockCreateAdminClient.mockReturnValue({
      from: chainableMock({
        data: { expires_at: '2020-01-01T00:00:00Z', completed_at: null, is_revoked: false, created_at: '2019-12-01T00:00:00Z' },
        error: null,
      }),
    })
    const result = await getSigningLinkStatus('expired-token')
    expect(result.data?.status).toBe('expired')
  })

  it('returns error when link not found', async () => {
    mockCreateAdminClient.mockReturnValue({
      from: chainableMock({ data: null, error: { message: 'Not found' } }),
    })
    const result = await getSigningLinkStatus('nonexistent')
    expect(result.error).toBe('Signing link not found')
  })
})

describe('resendSigningLink', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns unauthorized without session', async () => {
    mockGetSession.mockResolvedValue({ user: null, error: 'Not authenticated' })
    const result = await resendSigningLink('link-1')
    expect(result.error).toBe('Unauthorized')
  })

  it('returns unauthorized for external_signer', async () => {
    mockGetSession.mockResolvedValue({ user: { organizationId: 'org-1', role: 'external_signer' }, error: null })
    const result = await resendSigningLink('link-1')
    expect(result.error).toBe('Unauthorized')
  })

  it('returns error when link is not found', async () => {
    mockGetSession.mockResolvedValue({ user: { organizationId: 'org-1', role: 'staff', id: 'user-1' }, error: null })
    mockCreateAdminClient.mockReturnValue({
      from: chainableMock({ data: null, error: { message: 'Not found' } }),
    })
    const result = await resendSigningLink('link-1')
    expect(result.error).toBe('Signing link not found')
  })
})

describe('revokeSigningLink', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns unauthorized without session', async () => {
    mockGetSession.mockResolvedValue({ user: null, error: 'Not authenticated' })
    const result = await revokeSigningLink('link-1')
    expect(result.error).toBe('Unauthorized')
  })

  it('returns unauthorized for external_signer', async () => {
    mockGetSession.mockResolvedValue({ user: { organizationId: 'org-1', role: 'external_signer' }, error: null })
    const result = await revokeSigningLink('link-1')
    expect(result.error).toBe('Unauthorized')
  })
})
