import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getRoleRedirectPath } from '@/lib/auth/role-guards'
import type { Role } from '@/types/app'

const PUBLIC_PATHS = ['/auth/login', '/auth/callback']

const ROLE_PREFIXES: Record<string, Role> = {
  '/super-admin': 'super_admin',
  '/admin': 'admin',
  '/staff': 'staff',
  '/client': 'client',
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  let response = NextResponse.next({
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

  // Allow public paths without auth
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    if (user) {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role) {
        return NextResponse.redirect(
          new URL(getRoleRedirectPath(profile.role as Role), request.url)
        )
      }
    }
    return response
  }

  // Not authenticated — send to login
  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Fetch role and enforce route access
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile?.role) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  const userRole = profile.role as Role

  for (const [prefix, requiredRole] of Object.entries(ROLE_PREFIXES)) {
    if (pathname.startsWith(prefix) && userRole !== requiredRole) {
      return NextResponse.redirect(
        new URL(getRoleRedirectPath(userRole), request.url)
      )
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
