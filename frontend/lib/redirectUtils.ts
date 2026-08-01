import { canAccessRoute } from './permissions';

/**
 * CampusIQ Redirect & Navigation Sanitizer
 * ========================================
 * Provides unified, safe redirect URL normalization to prevent:
 * - Infinite redirect loops
 * - Recursive parameter nesting (/chat?redirect=/chat?redirect=...)
 * - Open redirect vulnerabilities (external URLs)
 * - Self-referential redirects (redirecting to current page or /login)
 */

export function normalizeRedirectUrl(
  rawRedirect: string | null | undefined,
  defaultDestination: string = '/chat'
): string {
  if (!rawRedirect || typeof rawRedirect !== 'string') {
    return defaultDestination;
  }

  let cleaned = rawRedirect.trim();

  // 1. Recursive URI decoding (up to 5 levels to handle double/triple encoded inputs)
  try {
    let decodes = 0;
    while (
      decodes < 5 &&
      (cleaned.includes('%2F') || cleaned.includes('%3F') || cleaned.includes('%3D') || cleaned.includes('%2f'))
    ) {
      const decoded = decodeURIComponent(cleaned);
      if (decoded === cleaned) break;
      cleaned = decoded;
      decodes++;
    }
  } catch {
    // If URI malformed, fallback to default
    return defaultDestination;
  }

  // 2. Reject absolute/external URLs to prevent open redirect vulnerabilities
  if (
    cleaned.startsWith('http://') ||
    cleaned.startsWith('https://') ||
    cleaned.startsWith('//') ||
    cleaned.includes('://')
  ) {
    return defaultDestination;
  }

  // 3. Strip nested 'redirect=' query parameters to eliminate recursive loops
  if (cleaned.includes('redirect=')) {
    const queryStartIndex = cleaned.indexOf('?');
    if (queryStartIndex !== -1) {
      const pathname = cleaned.substring(0, queryStartIndex);
      const searchStr = cleaned.substring(queryStartIndex + 1);
      const searchParams = new URLSearchParams(searchStr);
      searchParams.delete('redirect');
      const remainingSearch = searchParams.toString();
      cleaned = pathname + (remainingSearch ? `?${remainingSearch}` : '');
    } else {
      cleaned = cleaned.replace(/redirect=.*$/, '');
    }
  }

  // 4. Ensure relative path format starting with '/'
  if (!cleaned.startsWith('/')) {
    cleaned = '/' + cleaned;
  }

  // 5. Reject redirects back to authentication routes (login/register/etc)
  const authRoutes = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/unauthorized',
    '/auth/callback',
  ];
  const cleanedPathname = cleaned.split('?')[0].toLowerCase();

  if (authRoutes.some((route) => cleanedPathname === route || cleanedPathname.startsWith(`${route}/`))) {
    return defaultDestination;
  }

  // 6. Clean trailing slashes if not root
  if (cleaned.length > 1 && cleaned.endsWith('/')) {
    cleaned = cleaned.slice(0, -1);
  }

  return cleaned || defaultDestination;
}

/**
 * Safely constructs a login URL with a sanitized redirect parameter.
 */
export function buildLoginRedirectUrl(currentPathname: string): string {
  const cleanTarget = normalizeRedirectUrl(currentPathname, '/chat');
  if (cleanTarget === '/chat') {
    return '/login?redirect=/chat';
  }
  return `/login?redirect=${encodeURIComponent(cleanTarget)}`;
}

/**
 * Resolves the role-specific default landing path.
 * Student → /chat, Faculty → /faculty/dashboard, Admin → /dashboard
 */
export function resolveRoleDefaultPath(userRole?: string): string {
  const r = userRole?.toLowerCase();
  if (r === 'faculty') return '/faculty/dashboard';
  if (r === 'admin' || r === 'administrator') return '/dashboard';
  return '/chat';
}

/**
 * Determines the authorized post-login destination URL.
 * Priority: (1) user's originally-requested page, (2) role default dashboard.
 * Validates RBAC before redirecting to requested page.
 */
export function getRedirectAfterLogin(userRole?: string, redirectParam?: string | null): string {
  const defaultPath = resolveRoleDefaultPath(userRole);
  const targetPath = normalizeRedirectUrl(redirectParam, defaultPath);

  // If user originally requested a specific protected page and has permission, honor it.
  if (canAccessRoute(targetPath, userRole)) {
    return targetPath;
  }

  return defaultPath;
}
