import { ROLES, type Role } from '@/types/app'

export { ROLES }

export const isStaff = (role: string): role is 'staff' =>
  role === ROLES.STAFF

export const isAdmin = (role: string): role is 'org_admin' =>
  role === ROLES.ORG_ADMIN

export const isSuperAdmin = (role: string): role is 'super_admin' =>
  role === ROLES.SUPER_ADMIN

export const isExternalSigner = (role: string): role is 'external_signer' =>
  role === ROLES.EXTERNAL_SIGNER

export const isPharmacy = (role: string): role is 'pharmacy_admin' | 'pharmacy_staff' =>
  role === ROLES.PHARMACY_ADMIN || role === ROLES.PHARMACY_STAFF

export const isPharmacyAdmin = (role: string): role is 'pharmacy_admin' =>
  role === ROLES.PHARMACY_ADMIN

const ROLE_PATHS: Record<Role, string> = {
  super_admin: '/super-admin',
  org_admin: '/dashboard',
  program_manager: '/dashboard',
  staff: '/dashboard',
  external_signer: '/client',
  pharmacy_admin: '/pharmacy',
  pharmacy_staff: '/pharmacy',
}

export const getRoleRedirectPath = (role: Role): string =>
  ROLE_PATHS[role]
