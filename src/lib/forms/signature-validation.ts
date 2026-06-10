export type SignatureRole = 'client' | 'guardian' | 'staff' | 'case_manager' | 'witness' | 'supervisor'

export type SignatureValidation = {
  hasClientOrGuardian: boolean
  hasCaseManager: boolean
  isValid: boolean
  missing: string[]
  alert: string | null
}

export function validateRequiredSignatures(signatures: Array<{ signer_role: SignatureRole | string }>): SignatureValidation {
  const roles = new Set(signatures.map((signature) => signature.signer_role))
  const hasClientOrGuardian = roles.has('client') || roles.has('guardian')
  const hasCaseManager = roles.has('case_manager')
  const missing = [
    !hasClientOrGuardian ? 'client/guardian signature' : null,
    !hasCaseManager ? 'case manager signature' : null,
  ].filter((item): item is string => Boolean(item))

  return {
    hasClientOrGuardian,
    hasCaseManager,
    isValid: missing.length === 0,
    missing,
    alert: missing.length > 0 ? `Missing ${missing.join(' and ')}.` : null,
  }
}
