export type Permission =
  | 'guest.view'
  | 'student.chat'
  | 'student.academics'
  | 'student.facilities'
  | 'student.placements'
  | 'student.clubs'
  | 'student.discipline'
  | 'student.faqs'
  | 'faculty.dashboard'
  | 'faculty.queries'
  | 'faculty.notices'
  | 'faculty.resources'
  | 'admin.dashboard'
  | 'admin.analytics'
  | 'admin.users'
  | 'admin.documents'
  | 'admin.training'
  | 'admin.governance'
  | 'admin.health';

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  student: [
    'student.chat',
    'student.academics',
    'student.facilities',
    'student.placements',
    'student.clubs',
    'student.discipline',
    'student.faqs',
  ],
  faculty: [
    'faculty.dashboard',
    'faculty.queries',
    'faculty.notices',
    'faculty.resources',
    'student.chat',
    'student.academics',
    'student.facilities',
    'student.placements',
    'student.faqs',
  ],
  admin: [
    'admin.dashboard',
    'admin.analytics',
    'admin.users',
    'admin.documents',
    'admin.training',
    'admin.governance',
    'admin.health',
    'student.chat',
    'student.academics',
    'student.facilities',
    'student.placements',
    'student.clubs',
    'student.discipline',
    'student.faqs',
  ],
  administrator: [
    'admin.dashboard',
    'admin.analytics',
    'admin.users',
    'admin.documents',
    'admin.training',
    'admin.governance',
    'admin.health',
    'student.chat',
    'student.academics',
    'student.facilities',
    'student.placements',
    'student.clubs',
    'student.discipline',
    'student.faqs',
  ],
};

/**
 * List of publicly accessible routes that do not require authentication.
 */
export const PUBLIC_ROUTES = [
  '/',
  '/campus',
  '/courses',
  '/placements',
  '/clubs',
  '/discipline',
  '/faqs',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/unauthorized',
];

/**
 * Returns true if the path is publicly accessible without login.
 */
export function isPublicRoute(pathname: string): boolean {
  const cleanPath = pathname.split('?')[0].toLowerCase();
  if (cleanPath === '/' || cleanPath === '') return true;
  return PUBLIC_ROUTES.some(
    (route) => route !== '/' && (cleanPath === route || cleanPath.startsWith(`${route}/`))
  );
}

/**
 * Centralized Role-Based Access Control (RBAC) route authorization check.
 */
export function canAccessRoute(pathname: string, userRole?: string): boolean {
  const cleanPath = pathname.split('?')[0].toLowerCase();

  // 1. Public routes are accessible to everyone
  if (isPublicRoute(cleanPath)) {
    return true;
  }

  // 2. Unauthenticated guests cannot access protected routes
  if (!userRole) {
    return false;
  }

  const normRole = userRole.toLowerCase();

  // 3. Unknown/unresolved role (empty string or unrecognised value) — allow through.
  //    The middleware uses resolveRoleDefaultPath for safe fallback; we must not
  //    generate a false 403 when the role cookie hasn't been written yet.
  if (!normRole) {
    return true;
  }

  // 4. Admin & Administrator have full access to all routes
  if (normRole === 'admin' || normRole === 'administrator') {
    return true;
  }

  // 5. Shared routes accessible to all authenticated roles
  const sharedRoutes = ['/chat', '/settings', '/profile'];
  if (sharedRoutes.some((r) => cleanPath === r || cleanPath.startsWith(`${r}/`))) {
    return true;
  }

  // 6. Faculty routes
  if (normRole === 'faculty') {
    // Faculty cannot access admin dashboard
    if (cleanPath.startsWith('/dashboard')) {
      return false;
    }
    return true;
  }

  // 7. Student routes — cannot access admin or faculty dashboards
  if (normRole === 'student') {
    if (cleanPath.startsWith('/dashboard') || cleanPath.startsWith('/faculty')) {
      return false;
    }
    return true;
  }

  return false;
}

export function getRolePermissions(role?: string): Permission[] {
  if (!role) return [];
  const normalizedRole = role.toLowerCase();
  return ROLE_PERMISSIONS[normalizedRole] || ROLE_PERMISSIONS['student'];
}

export function hasPermission(userRole: string | undefined, permission: Permission): boolean {
  if (!userRole) return false;
  const permissions = getRolePermissions(userRole);
  return permissions.includes(permission);
}
