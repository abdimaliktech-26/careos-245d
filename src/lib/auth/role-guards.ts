import { ROLES, type Role } from '@/types/app'

export { ROLES }

export const isStaff = (role: string): role is 'staff' =>
  role === ROLES.STAFF

export const isAdmin = (role: string): role is 'admin' =>
  role === ROLES.ADMIN

export const isSuperAdmin = (role: string): role is 'super_admin' =>
  role === ROLES.SUPER_ADMIN

export const isClient = (role: string): role is 'client' =>
  role === ROLES.CLIENT

const ROLE_PATHS: Record<Role, string> = {
  super_admin: '/super-admin',
  admin: '/admin',
  staff: '/staff',
  client: '/client',
}

export const getRoleRedirectPath = (role: Role): string =>
  ROLE_PATHS[role]
