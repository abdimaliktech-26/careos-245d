import { createAdminClient } from '@/lib/supabase/admin'

type OrgRow = {
  id: string
  name: string
  license_number: string | null
  address: string | null
  city: string | null
  state: string
  zip: string | null
  phone: string | null
  email: string | null
  website: string | null
  plan: string | null
  plan_expires_at: string | null
  subscription_price: number | null
  stripe_customer_id: string | null
  logo_url: string | null
  brand_primary: string | null
  brand_accent: string | null
  status: string
  onboarding_completed: boolean | null
  created_at: string
  updated_at: string
  member_count?: number
  client_count?: number
}

export type OrgListItem = {
  id: string
  name: string
  status: 'pending' | 'active' | 'suspended'
  plan: string | null
  planExpiresAt: string | null
  memberCount: number
  clientCount: number
  createdAt: string
}

export type OrgDetail = {
  id: string
  name: string
  licenseNumber: string | null
  address: string | null
  city: string | null
  state: string
  zip: string | null
  phone: string | null
  email: string | null
  website: string | null
  plan: string | null
  planExpiresAt: string | null
  subscriptionPrice: number | null
  stripeCustomerId: string | null
  logoUrl: string | null
  brandPrimary: string
  brandAccent: string
  status: 'pending' | 'active' | 'suspended'
  onboardingCompleted: boolean
  createdAt: string
  members: Array<{
    id: string
    userId: string
    fullName: string | null
    email: string | null
    role: string
    isActive: boolean
    joinedAt: string
  }>
  stats: {
    clientCount: number
    activeClientCount: number
    packetCount: number
    formCount: number
    incidentCount: number
  }
}

export type UserListItem = {
  id: string
  userId: string
  fullName: string | null
  email: string | null
  role: string
  isActive: boolean
  organizationId: string
  organizationName: string | null
  joinedAt: string
}

export type AuditLogEntry = {
  id: string
  action: string
  entityType: string | null
  entityId: string | null
  entityLabel: string | null
  userEmail: string | null
  organizationId: string | null
  organizationName: string | null
  details: Record<string, unknown> | null
  ipAddress: string | null
  createdAt: string
}

export type SystemStats = {
  totalOrganizations: number
  activeOrganizations: number
  pendingOrganizations: number
  suspendedOrganizations: number
  totalUsers: number
  totalClients: number
  totalPackets: number
  totalIncidents: number
}

export async function getSystemStats(): Promise<SystemStats> {
  const admin = createAdminClient()

  const [
    { count: totalOrganizations },
    { count: activeOrganizations },
    { count: pendingOrganizations },
    { count: suspendedOrganizations },
    { count: totalUsers },
    { count: totalClients },
    { count: totalPackets },
    { count: totalIncidents },
  ] = await Promise.all([
    admin.from('organizations').select('*', { count: 'exact', head: true }),
    admin.from('organizations').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    admin.from('organizations').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('organizations').select('*', { count: 'exact', head: true }).eq('status', 'suspended'),
    admin.from('organization_members').select('*', { count: 'exact', head: true }).eq('is_active', true),
    admin.from('clients').select('*', { count: 'exact', head: true }),
    admin.from('packets').select('*', { count: 'exact', head: true }),
    admin.from('incidents').select('*', { count: 'exact', head: true }),
  ])

  return {
    totalOrganizations: totalOrganizations ?? 0,
    activeOrganizations: activeOrganizations ?? 0,
    pendingOrganizations: pendingOrganizations ?? 0,
    suspendedOrganizations: suspendedOrganizations ?? 0,
    totalUsers: totalUsers ?? 0,
    totalClients: totalClients ?? 0,
    totalPackets: totalPackets ?? 0,
    totalIncidents: totalIncidents ?? 0,
  }
}

export async function getAllOrganizations(search?: string): Promise<OrgListItem[]> {
  const admin = createAdminClient()

  let query = admin
    .from('organizations')
    .select('id, name, status, plan, plan_expires_at, created_at')
    .order('created_at', { ascending: false })

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }

  const { data: orgs } = await query
  if (!orgs) return []

  const rows = orgs as Array<{ id: string; name: string; status: string; plan: string | null; plan_expires_at: string | null; created_at: string }>

  const items: OrgListItem[] = await Promise.all(
    rows.map(async (org) => {
      const [{ count: memberCount }, { count: clientCount }] = await Promise.all([
        admin.from('organization_members').select('*', { count: 'exact', head: true }).eq('organization_id', org.id),
        admin.from('clients').select('*', { count: 'exact', head: true }).eq('organization_id', org.id),
      ])
      return {
        id: org.id,
        name: org.name,
        status: (org.status as 'pending' | 'active' | 'suspended') || 'active',
        plan: org.plan,
        planExpiresAt: org.plan_expires_at,
        memberCount: memberCount ?? 0,
        clientCount: clientCount ?? 0,
        createdAt: org.created_at,
      }
    })
  )

  return items
}

export async function getOrganizationDetail(id: string): Promise<OrgDetail | null> {
  const admin = createAdminClient()

  const { data: org } = await admin
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single()

  if (!org) return null

  const orgRow = org as OrgRow

  const { data: members } = await admin
    .from('organization_members')
    .select('id, user_id, full_name, email, role, is_active, joined_at')
    .eq('organization_id', id)
    .order('joined_at', { ascending: false })

  const [
    { count: clientCount },
    { count: activeClientCount },
    { count: packetCount },
    { count: formCount },
    { count: incidentCount },
  ] = await Promise.all([
    admin.from('clients').select('*', { count: 'exact', head: true }).eq('organization_id', id),
    admin.from('clients').select('*', { count: 'exact', head: true }).eq('organization_id', id).eq('status', 'active'),
    admin.from('packets').select('*', { count: 'exact', head: true }).eq('organization_id', id),
    admin.from('packet_forms').select('*', { count: 'exact', head: true }).eq('organization_id', id),
    admin.from('incidents').select('*', { count: 'exact', head: true }).eq('organization_id', id),
  ])

  return {
    id: orgRow.id,
    name: orgRow.name,
    licenseNumber: orgRow.license_number,
    address: orgRow.address,
    city: orgRow.city,
    state: orgRow.state,
    zip: orgRow.zip,
    phone: orgRow.phone,
    email: orgRow.email,
    website: orgRow.website,
    plan: orgRow.plan,
    planExpiresAt: orgRow.plan_expires_at,
    subscriptionPrice: orgRow.subscription_price,
    stripeCustomerId: orgRow.stripe_customer_id ?? null,
    logoUrl: orgRow.logo_url,
    brandPrimary: orgRow.brand_primary ?? '#10B99A',
    brandAccent: orgRow.brand_accent ?? '#0E9E86',
    status: (orgRow.status as 'pending' | 'active' | 'suspended') || 'active',
    onboardingCompleted: orgRow.onboarding_completed ?? false,
    createdAt: orgRow.created_at,
    members: (members ?? []).map((m: Record<string, unknown>) => ({
      id: m.id as string,
      userId: m.user_id as string,
      fullName: m.full_name as string | null,
      email: m.email as string | null,
      role: m.role as string,
      isActive: m.is_active as boolean,
      joinedAt: m.joined_at as string,
    })),
    stats: {
      clientCount: clientCount ?? 0,
      activeClientCount: activeClientCount ?? 0,
      packetCount: packetCount ?? 0,
      formCount: formCount ?? 0,
      incidentCount: incidentCount ?? 0,
    },
  }
}

export async function createOrganization(data: {
  name: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip?: string
}): Promise<{ id: string } | { error: string }> {
  const admin = createAdminClient()

  const { data: org, error } = await admin
    .from('organizations')
    .insert({
      name: data.name,
      email: data.email ?? null,
      phone: data.phone ?? null,
      address: data.address ?? null,
      city: data.city ?? null,
      state: data.state ?? 'MN',
      zip: data.zip ?? null,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error) return { error: error.message }
  return { id: org!.id }
}

export async function updateOrganizationStatus(
  id: string,
  status: 'active' | 'suspended' | 'pending'
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient()

  const { error } = await admin
    .from('organizations')
    .update({ status })
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function deleteOrganization(id: string): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient()

  const { error } = await admin
    .from('organizations')
    .delete()
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function getAllUsers(search?: string, roleFilter?: string): Promise<UserListItem[]> {
  const admin = createAdminClient()

  let query = admin
    .from('organization_members')
    .select('id, user_id, full_name, email, role, is_active, organization_id, joined_at, organizations(name)')
    .order('joined_at', { ascending: false })

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
  }

  if (roleFilter) {
    query = query.eq('role', roleFilter)
  }

  const { data: rows } = await query
  if (!rows) return []

  return (rows as Array<Record<string, unknown>>).map((r) => {
    const orgRef = r.organizations as { name: string } | null
    return {
      id: r.id as string,
      userId: r.user_id as string,
      fullName: r.full_name as string | null,
      email: r.email as string | null,
      role: r.role as string,
      isActive: r.is_active as boolean,
      organizationId: r.organization_id as string,
      organizationName: orgRef?.name ?? null,
      joinedAt: r.joined_at as string,
    }
  })
}

export interface AuditLogFilters {
  action?: string
  search?: string
  orgId?: string
  fromDate?: string
  toDate?: string
  page?: number
  pageSize?: number
}

export async function getAuditLog(filters: AuditLogFilters = {}): Promise<{
  entries: AuditLogEntry[]
  total: number
  page: number
  pageSize: number
}> {
  const admin = createAdminClient()
  const page = filters.page ?? 1
  const pageSize = Math.min(filters.pageSize ?? 50, 200)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let countQuery = admin
    .from('audit_logs')
    .select('*', { count: 'exact', head: true })

  let dataQuery = admin
    .from('audit_logs')
    .select('id, action, entity_type, entity_id, entity_label, user_email, organization_id, details, ip_address, created_at')
    .order('created_at', { ascending: false })
    .range(from, to)

  if (filters.action) {
    countQuery = countQuery.eq('action', filters.action)
    dataQuery = dataQuery.eq('action', filters.action)
  }

  if (filters.orgId) {
    countQuery = countQuery.eq('organization_id', filters.orgId)
    dataQuery = dataQuery.eq('organization_id', filters.orgId)
  }

  if (filters.fromDate) {
    countQuery = countQuery.gte('created_at', filters.fromDate)
    dataQuery = dataQuery.gte('created_at', filters.fromDate)
  }

  if (filters.toDate) {
    countQuery = countQuery.lte('created_at', filters.toDate)
    dataQuery = dataQuery.lte('created_at', filters.toDate)
  }

  if (filters.search) {
    const term = `%${filters.search}%`
    countQuery = countQuery.or(`user_email.ilike.${term},entity_label.ilike.${term}`)
    dataQuery = dataQuery.or(`user_email.ilike.${term},entity_label.ilike.${term}`)
  }

  const { count: total } = await countQuery
  const { data: rows } = await dataQuery

  const entries: AuditLogEntry[] = (rows ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    action: r.action as string,
    entityType: r.entity_type as string | null,
    entityId: r.entity_id as string | null,
    entityLabel: r.entity_label as string | null,
    userEmail: r.user_email as string | null,
    organizationId: r.organization_id as string | null,
    organizationName: null,
    details: r.details as Record<string, unknown> | null,
    ipAddress: r.ip_address as string | null,
    createdAt: r.created_at as string,
  }))

  return {
    entries,
    total: total ?? 0,
    page,
    pageSize,
  }
}

export async function getRecentOrganizations(limit = 10): Promise<OrgListItem[]> {
  const all = await getAllOrganizations()
  return all.slice(0, limit)
}
