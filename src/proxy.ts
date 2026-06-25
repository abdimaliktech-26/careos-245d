import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getRoleRedirectPath } from '@/lib/auth/role-guards'
import type { Role } from '@/types/app'

const PUBLIC_PATHS = [
  '/', '/auth/login', '/auth/callback',
  '/auth/forgot-password', '/auth/reset-password',
  '/api/auth/forgot-password', '/api/auth/reset-password',
  '/sign', '/api/chat',
  '/api/cron',
  '/manifest.webmanifest',
]

/**
 * Route prefixes that require a specific role.
 * A user whose role does NOT match is redirected to their role home.
 * Note: /admin/organizations and /admin/audit-log are also guarded at
 * page level (super_admin check) so we only need the coarse splits here.
 */
const PROVIDER_ROLES: Role[] = ['staff', 'program_manager', 'org_admin', 'super_admin']

const ROLE_REQUIRED_PREFIXES: Array<{ prefix: string; roles: Role[] }> = [
  { prefix: '/super-admin', roles: ['super_admin'] },
  { prefix: '/client',      roles: ['external_signer'] },
  { prefix: '/pharmacy',    roles: ['pharmacy_admin', 'pharmacy_staff'] },
  { prefix: '/medications',          roles: PROVIDER_ROLES },
  { prefix: '/medication-pass',      roles: PROVIDER_ROLES },
  { prefix: '/medication-compliance', roles: PROVIDER_ROLES },
  { prefix: '/refills',              roles: PROVIDER_ROLES },
  { prefix: '/pharmacy-orders',      roles: PROVIDER_ROLES },
  { prefix: '/pharmacy-messages',    roles: PROVIDER_ROLES },
  { prefix: '/pharmacy-documents',   roles: PROVIDER_ROLES },
  { prefix: '/dashboard',   roles: ['staff', 'program_manager', 'org_admin', 'super_admin'] },
  { prefix: '/notifications', roles: ['staff', 'program_manager', 'org_admin', 'super_admin'] },
  { prefix: '/clients',     roles: ['staff', 'program_manager', 'org_admin', 'super_admin'] },
  { prefix: '/packets',     roles: ['staff', 'program_manager', 'org_admin', 'super_admin'] },
  { prefix: '/notes',       roles: ['staff', 'program_manager', 'org_admin', 'super_admin'] },
  { prefix: '/schedule',    roles: ['staff', 'program_manager', 'org_admin', 'super_admin'] },
  { prefix: '/evv',         roles: ['staff', 'program_manager', 'org_admin', 'super_admin'] },
  { prefix: '/incidents',   roles: ['staff', 'program_manager', 'org_admin', 'super_admin'] },
  { prefix: '/billing-readiness', roles: ['staff', 'program_manager', 'org_admin', 'super_admin'] },
  { prefix: '/documents',   roles: ['staff', 'program_manager', 'org_admin', 'super_admin'] },
  { prefix: '/form-library',roles: ['staff', 'program_manager', 'org_admin', 'super_admin'] },
  { prefix: '/ai', roles: ['staff', 'program_manager', 'org_admin', 'super_admin'] },
  { prefix: '/qa', roles: ['staff', 'program_manager', 'org_admin', 'super_admin'] },
  { prefix: '/staff/directory', roles: ['program_manager', 'org_admin', 'super_admin'] },
  { prefix: '/admin/trainings', roles: ['program_manager', 'org_admin', 'super_admin'] },
  { prefix: '/admin',       roles: ['org_admin', 'super_admin'] },
]

function isApiPath(pathname: string): boolean {
  return pathname.startsWith('/api/') || pathname.includes('/api/')
}

function unauthorized(pathname: string, loginUrl: URL): NextResponse {
  if (isApiPath(pathname)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.redirect(loginUrl)
}

function forbidden(pathname: string, redirectUrl: URL): NextResponse {
  if (isApiPath(pathname)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return NextResponse.redirect(redirectUrl)
}

/**
 * Resolve the caller's role from either provider membership
 * (organization_members) or pharmacy membership (pharmacy_users).
 */
async function resolveRole(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<Role | null> {
  const { data: member } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle()
  if (member?.role) return member.role as Role

  const { data: pharmUser } = await supabase
    .from('pharmacy_users')
    .select('role')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()
  return (pharmUser?.role as Role) ?? null
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const response = NextResponse.next({
    request: { headers: request.headers },
  })

  // Always let the logout handler run. It clears the session and 303-redirects
  // to /auth/login. Routing it through the auth checks below would 307-redirect
  // the POST when the session is already gone, replaying POST /auth/login → 405.
  if (pathname === '/auth/logout') {
    return response
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Allow public paths without auth; redirect authenticated users to their home
  // Exception: /auth/reset-password (page) and /api/auth/reset-password (API)
  // must stay accessible to signed-in users so they can change a temporary password.
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    const isResetPassword =
      pathname === '/auth/reset-password' ||
      pathname.startsWith('/auth/reset-password/') ||
      pathname === '/api/auth/reset-password' ||
      pathname.startsWith('/api/auth/reset-password/')

    if (user && !isResetPassword) {
      const role = await resolveRole(supabase, user.id)
      if (role) {
        return NextResponse.redirect(
          new URL(getRoleRedirectPath(role), request.url)
        )
      }
    }
    return response
  }

  const loginUrl = new URL('/auth/login', request.url)

  // Not authenticated
  if (!user) {
    return unauthorized(pathname, loginUrl)
  }

  // Fetch role once and enforce route access (provider OR pharmacy membership)
  const userRole = await resolveRole(supabase, user.id)

  if (!userRole) {
    return unauthorized(pathname, loginUrl)
  }

  for (const { prefix, roles } of ROLE_REQUIRED_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) {
      if (!roles.includes(userRole)) {
        return forbidden(
          pathname,
          new URL(getRoleRedirectPath(userRole), request.url)
        )
      }
      break
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
