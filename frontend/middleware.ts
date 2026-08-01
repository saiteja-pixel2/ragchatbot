import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { normalizeRedirectUrl, getRedirectAfterLogin, resolveRoleDefaultPath } from './lib/redirectUtils'
import { isPublicRoute, canAccessRoute } from './lib/permissions'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // ── 1. Try Supabase session (for OAuth users) ───────────────────────────
  let supabaseUser: any = null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-supabase-project')) {
    try {
      const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      })
      const { data } = await supabase.auth.getUser()
      supabaseUser = data?.user || null
    } catch {}
  }

  // ── 2. Determine authentication & role ──────────────────────────────────
  const campusiqToken = request.cookies.get('campusiq_token')?.value
  const campusiqRole  = request.cookies.get('campusiq_role')?.value   // set by loginUser/loginWithGoogleOAuth
  const isAuthenticated = Boolean(supabaseUser || (campusiqToken && campusiqRole))

  // Role resolution priority:
  //   (a) campusiq_role cookie  — set by local backend login (most reliable)
  //   (b) Supabase user_metadata.role — set by OAuth callback
  //   (c) '' fallback — unknown role
  const rawRole = campusiqRole
    || supabaseUser?.user_metadata?.role
    || supabaseUser?.role
    || ''

  // Normalise 'administrator' → 'admin' for canAccessRoute
  const userRole = rawRole === 'administrator' ? 'admin' : rawRole

  const url = request.nextUrl.clone()
  const pathname = request.nextUrl.pathname

  // ── 3. Unauthenticated → /login?redirect=<requested_path> ──────────────
  if (!isAuthenticated && !isPublicRoute(pathname)) {
    if (pathname === '/login') return supabaseResponse

    const requestedFullUrl = pathname + request.nextUrl.search
    const cleanRequestedPath = normalizeRedirectUrl(requestedFullUrl, '/chat')
    const currentRedirectParam = request.nextUrl.searchParams.get('redirect')

    // Anti-loop: already heading to /login with this exact redirect
    if (pathname === '/login' && currentRedirectParam === cleanRequestedPath) {
      return supabaseResponse
    }

    url.pathname = '/login'
    url.search = `?redirect=${encodeURIComponent(cleanRequestedPath)}`
    return NextResponse.redirect(url)
  }

  // ── 4. Authenticated user on /login or /register → post-login redirect ──
  if (isAuthenticated && (pathname === '/login' || pathname === '/register')) {
    const redirectParam = request.nextUrl.searchParams.get('redirect')
    const targetPath = getRedirectAfterLogin(userRole || 'student', redirectParam)
    const targetPathname = targetPath.split('?')[0]

    if (pathname === targetPathname) return supabaseResponse   // anti-loop

    url.pathname = targetPathname
    url.search = targetPath.includes('?') ? targetPath.substring(targetPath.indexOf('?')) : ''
    return NextResponse.redirect(url)
  }

  // ── 5. RBAC — only block when role is actually known ────────────────────
  if (isAuthenticated && userRole && !canAccessRoute(pathname, userRole)) {
    const safeDashboard = resolveRoleDefaultPath(userRole)

    if (pathname === safeDashboard) return supabaseResponse

    url.pathname = safeDashboard
    url.search = ''
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
