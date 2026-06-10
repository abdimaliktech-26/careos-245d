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
]

/**
 * Route prefixes that require a specific role.
 * A user whose role does NOT match is redirected to their role home.
 * Note: /admin/organizations and /admin/audit-log are also guarded at
 * page level (super_admin check) so we only need the coarse splits here.
 */
const ROLE_REQUIRED_PREFIXES: Array<{ prefix: string; roles: Role[] }> = [
  { prefix: '/super-admin', roles: ['super_admin'] },
  { prefix: '/client',      roles: ['external_signer'] },
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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const response = NextResponse.next({
    request: { headers: request.headers },
  })

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
  // Exception: /auth/reset-password must stay accessible to signed-in users so
  // they can change a temporary password.
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    const isResetPassword =
      pathname === '/auth/reset-password' || pathname.startsWith('/auth/reset-password/')

    if (user && !isResetPassword) {
      const { data: profile } = await supabase
        .from('organization_members')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle()

      if (profile?.role) {
        return NextResponse.redirect(
          new URL(getRoleRedirectPath(profile.role as Role), request.url)
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

  // Fetch role once and enforce route access
  const { data: profile } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile?.role) {
    return unauthorized(pathname, loginUrl)
  }

  const userRole = profile.role as Role

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
