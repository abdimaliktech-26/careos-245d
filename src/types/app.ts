export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ORG_ADMIN: 'org_admin',
  PROGRAM_MANAGER: 'program_manager',
  STAFF: 'staff',
  EXTERNAL_SIGNER: 'external_signer',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export type UserProfile = {
  id: string
  organizationId: string | null
  role: Role
  fullName: string
  email: string
  isActive: boolean
  impersonating?: { orgId: string; orgName: string; expiresAt: string } | null
  /** Branding for the user's own org, joined in getSession to avoid a second
   *  query in the app layout. Null for users without an org. During super_admin
   *  impersonation the layout re-resolves branding for the impersonated org. */
  branding?: OrgBranding | null
}

export type OrgBranding = {
  name: string
  logo_url: string | null
  brand_primary: string
  brand_accent: string
}

export type Organization = {
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
  logo_url: string | null
  brand_primary: string
  brand_accent: string
  plan: string | null
  plan_expires_at: string | null
  subscription_price: number | null
}
