export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  STAFF: 'staff',
  CLIENT: 'client',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export type UserProfile = {
  id: string
  tenantId: string | null
  role: Role
  firstName: string
  lastName: string
  email: string
  phone: string | null
  isActive: boolean
}

export type Tenant = {
  id: string
  name: string
  licenseNumber: string | null
  address: string | null
  city: string | null
  state: string
  zip: string | null
  contactEmail: string
  status: 'pending' | 'active' | 'suspended'
  createdAt: string
}
