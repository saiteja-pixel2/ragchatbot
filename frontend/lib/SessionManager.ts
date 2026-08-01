import { getCurrentUser, loginUser, logoutUser, UserProfile } from './publicApi';
import { getRolePermissions, Permission } from './permissions';

export interface AuthDiagnostics {
  user: UserProfile | null;
  role: string;
  permissions: Permission[];
  hasToken: boolean;
  tokenValue: string;
  cookiePresent: boolean;
  localStoragePresent: boolean;
  rememberMeActive: boolean;
  lastPing: string;
}

export class SessionManager {
  private static instance: SessionManager;

  private constructor() {}

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  public getCurrentUser(): UserProfile | null {
    return getCurrentUser();
  }

  public getRole(): string {
    const user = this.getCurrentUser();
    return user?.role || 'guest';
  }

  public getPermissions(): Permission[] {
    const role = this.getRole();
    return getRolePermissions(role);
  }

  public hasPermission(permission: Permission): boolean {
    const permissions = this.getPermissions();
    return permissions.includes(permission);
  }

  public async login(email: string, password?: string, rememberMe: boolean = false): Promise<UserProfile> {
    return await loginUser(email, password, rememberMe);
  }

  public logout(): void {
    logoutUser();
  }

  public getAuthDiagnostics(): AuthDiagnostics {
    let token = '';
    let cookiePresent = false;
    let localStoragePresent = false;

    if (typeof window !== 'undefined') {
      token = localStorage.getItem('campusiq_token') || '';
      localStoragePresent = Boolean(token);
      cookiePresent = document.cookie.includes('campusiq_token');
    }

    const user = this.getCurrentUser();
    const role = user?.role || 'unauthenticated';

    return {
      user,
      role,
      permissions: this.getPermissions(),
      hasToken: Boolean(token),
      tokenValue: token ? token.substring(0, 24) + '...' : 'NONE',
      cookiePresent,
      localStoragePresent,
      rememberMeActive: cookiePresent,
      lastPing: new Date().toLocaleTimeString()
    };
  }
}

export const sessionManager = SessionManager.getInstance();
