'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  GraduationCap,
  Sparkles,
  LayoutDashboard,
  MessageSquare,
  BookOpen,
  Compass,
  HelpCircle,
  Briefcase,
  Users,
  ShieldAlert,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  LogIn,
  UserPlus,
  Lock,
  Home,
  Building2,
  FileText,
  Settings,
  BarChart3,
  UserCog,
  Cpu,
  ClipboardList,
  Bell,
} from 'lucide-react';
import { getCurrentUser, logoutUser, UserProfile } from '@/lib/publicApi';
import { buildLoginRedirectUrl } from '@/lib/redirectUtils';

interface NavLink {
  name: string;
  href: string;
  icon: React.ElementType;
  protected?: boolean; // guests see lock icon + redirect to login
}

function getNavLinks(role?: string): NavLink[] {
  const r = role?.toLowerCase();

  // ─── Admin / Administrator ─────────────────────────────────
  if (r === 'admin' || r === 'administrator') {
    return [
      { name: 'Admin Dashboard',   href: '/dashboard#overview',     icon: LayoutDashboard },
      { name: 'Knowledge Base',    href: '/dashboard#inspector',    icon: BookOpen },
      { name: 'Document Upload',   href: '/dashboard#upload',       icon: FileText },
      { name: 'System Analytics',  href: '/dashboard#analytics',    icon: BarChart3 },
      { name: 'User Management',   href: '/dashboard#diagnostics',  icon: UserCog },
      { name: 'AI Configuration',  href: '/dashboard#ai-config',    icon: Cpu },
      { name: 'Settings',          href: '/settings',               icon: Settings },
    ];
  }

  // ─── Faculty ──────────────────────────────────────────────
  if (r === 'faculty') {
    return [
      { name: 'Faculty Dashboard',   href: '/faculty/dashboard#overview',    icon: LayoutDashboard },
      { name: 'Ask AI Chatbot',      href: '/chat',                         icon: MessageSquare },
      { name: 'Students',            href: '/faculty/dashboard#queries',    icon: Users },
      { name: 'Attendance',          href: '/faculty/dashboard#analytics',  icon: ClipboardList },
      { name: 'Courses',             href: '/faculty/dashboard#knowledge-base', icon: BookOpen },
      { name: 'Announcements',       href: '/faculty/dashboard#notices',    icon: Bell },
      { name: 'Settings',            href: '/settings',                     icon: Settings },
    ];
  }

  // ─── Student ──────────────────────────────────────────────
  if (r === 'student') {
    return [
      { name: 'Ask AI Chatbot',          href: '/chat',        icon: MessageSquare },
      { name: 'Academics & Courses',     href: '/courses',     icon: BookOpen },
      { name: 'Campus Facilities',       href: '/campus',      icon: Building2 },
      { name: 'Placements & Internships',href: '/placements',  icon: Briefcase },
      { name: 'Clubs & Societies',       href: '/clubs',       icon: Users },
      { name: 'Discipline Rules',        href: '/discipline',  icon: ShieldAlert },
      { name: 'FAQ Hub',                 href: '/faqs',        icon: HelpCircle },
      { name: 'Settings',                href: '/settings',    icon: Settings },
    ];
  }

  // ─── Guest / Unauthenticated ──────────────────────────────
  // Public items are free to visit; protected items show 🔒 and redirect to login
  return [
    { name: 'Campus Overview',      href: '/',           icon: Home,        protected: false },
    { name: 'Admissions & Campus',  href: '/campus',     icon: Building2,   protected: false },
    { name: 'Courses & Programs',   href: '/courses',    icon: BookOpen,    protected: false },
    { name: 'Placements Overview',  href: '/placements', icon: Briefcase,   protected: false },
    { name: 'Clubs & Activities',   href: '/clubs',      icon: Users,       protected: false },
    { name: 'Discipline & Rules',   href: '/discipline', icon: ShieldAlert, protected: false },
    { name: 'FAQ Hub',              href: '/faqs',       icon: HelpCircle,  protected: false },
    { name: 'Ask AI Chatbot',       href: '/chat',       icon: MessageSquare, protected: true },
  ];
}

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setUser(getCurrentUser());
  }, [pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleLogout = useCallback(async () => {
    await logoutUser();
    setUser(null);
    window.location.href = '/';
  }, []);

  const handleProtectedClick = useCallback(
    (e: React.MouseEvent, link: NavLink) => {
      if (link.protected && !user) {
        e.preventDefault();
        window.location.href = buildLoginRedirectUrl(link.href);
        return;
      }
      if (link.href.includes('#')) {
        const [basePath, hash] = link.href.split('#');
        if (pathname === basePath && typeof window !== 'undefined') {
          window.location.hash = hash;
        }
      }
    },
    [user, pathname]
  );

  const handleNavToAuth = (targetPath: string) => {
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
      document.cookie = 'campusiq_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      document.cookie = 'campusiq_role=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      window.location.href = targetPath;
    }
  };

  const mainNavLinks = getNavLinks(user?.role);
  const sectionLabel = user ? `${user.role.toUpperCase()} PORTAL` : 'CAMPUS INFORMATION';

  return (
    <>
      {/* ============================================================ */}
      {/* 1. DESKTOP VERTICAL COLLAPSIBLE SIDEBAR                      */}
      {/* ============================================================ */}
      <aside
        className={`hidden md:flex sticky top-0 h-screen bg-white border-r border-purple-100 flex-col justify-between transition-all duration-300 z-30 shrink-0 select-none shadow-sm ${
          isCollapsed ? 'w-20 p-3' : 'w-64 p-5'
        }`}
      >
        {/* Top Header & Branding */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 overflow-hidden group">
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-white shrink-0 shadow-md shadow-purple-200 group-hover:scale-105 transition-transform duration-200">
                <GraduationCap className="w-6 h-6" />
              </div>
              {!isCollapsed && (
                <div className="leading-tight overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-lg tracking-tight text-slate-900">
                      Campus<span className="text-purple-600">IQ</span>
                    </span>
                    <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                      RAG AI
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium block truncate">
                    Verified Academic Assistant
                  </span>
                </div>
              )}
            </Link>

            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>

          {/* Section label */}
          {!isCollapsed && (
            <div className="px-1 text-[10px] uppercase font-bold tracking-widest text-slate-400 border-b border-slate-100 pb-2">
              {sectionLabel}
            </div>
          )}

          {/* Navigation Items */}
          <nav className="space-y-1">
            {mainNavLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href.split('#')[0]));
              const isProtected = link.protected && !user;

              return (
                <Link
                  key={link.name}
                  href={isProtected ? buildLoginRedirectUrl(link.href) : link.href}
                  onClick={(e) => handleProtectedClick(e, link)}
                  title={
                    isCollapsed
                      ? isProtected
                        ? `${link.name} — Login required`
                        : link.name
                      : isProtected
                      ? 'Login required to access this feature'
                      : undefined
                  }
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all relative ${
                    isActive && !isProtected
                      ? 'bg-purple-50 text-purple-700 border-r-4 border-purple-600 shadow-xs'
                      : isProtected
                      ? 'text-slate-400 hover:text-slate-500 hover:bg-slate-50 cursor-pointer'
                      : 'text-slate-600 hover:text-purple-600 hover:bg-slate-50'
                  } ${isCollapsed ? 'justify-center px-0' : ''}`}
                >
                  <Icon
                    className={`w-5 h-5 shrink-0 ${
                      isActive && !isProtected
                        ? 'text-purple-600'
                        : isProtected
                        ? 'text-slate-300'
                        : 'text-slate-400 group-hover:text-purple-600'
                    }`}
                  />
                  {!isCollapsed && (
                    <span className="truncate flex-1">{link.name}</span>
                  )}
                  {/* Lock indicator for protected items */}
                  {isProtected && !isCollapsed && (
                    <span className="ml-auto flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md">
                      <Lock className="w-2.5 h-2.5" />
                      Login
                    </span>
                  )}
                  {isProtected && isCollapsed && (
                    <span className="absolute top-0.5 right-0.5">
                      <Lock className="w-2.5 h-2.5 text-amber-400" />
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Auth Section */}
        {user ? (
          <div className="pt-4 border-t border-slate-100">
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} gap-2`}>
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                </div>
                {!isCollapsed && (
                  <div className="leading-tight truncate">
                    <span className="text-xs font-bold text-slate-800 block truncate">
                      {user.full_name || 'User'}
                    </span>
                    <span className="text-[10px] text-purple-600 font-semibold capitalize">
                      {user.role}
                    </span>
                  </div>
                )}
              </div>
              {!isCollapsed && (
                <button
                  onClick={handleLogout}
                  title="Log Out"
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
              {isCollapsed && (
                <button
                  onClick={handleLogout}
                  title="Log Out"
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ) : (
          !isCollapsed ? (
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <button
                onClick={() => handleNavToAuth('/login')}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-purple-50 hover:text-purple-700 transition-colors cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </button>
              <button
                onClick={() => handleNavToAuth('/register')}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-xs cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Register Account</span>
              </button>
            </div>
          ) : (
            <div className="pt-3 border-t border-slate-100 flex flex-col items-center gap-2">
              <button onClick={() => handleNavToAuth('/login')} title="Sign In" className="p-2 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer">
                <LogIn className="w-4 h-4" />
              </button>
            </div>
          )
        )}
      </aside>

      {/* ============================================================ */}
      {/* 2. MOBILE SLIM TOPBAR                                        */}
      {/* ============================================================ */}
      <header className="md:hidden sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-purple-100 px-4 h-16 flex items-center justify-between shadow-xs">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center text-white shadow-xs">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-lg tracking-tight text-slate-900">
              Campus<span className="text-purple-600">IQ</span>
            </span>
            <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
              RAG AI
            </span>
          </div>
        </Link>

        <button
          onClick={() => setMobileOpen(true)}
          className="min-w-[44px] min-h-[44px] p-2.5 rounded-xl text-slate-700 hover:text-purple-600 hover:bg-purple-50 flex items-center justify-center transition-colors"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* ============================================================ */}
      {/* 3. MOBILE SLIDE-IN OVERLAY DRAWER                            */}
      {/* ============================================================ */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-fade-in"
          />

          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl p-5 flex flex-col justify-between z-50 overflow-y-auto">
            <div className="space-y-5">
              {/* Drawer Top */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center text-white">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="font-extrabold text-base text-slate-900">
                        Campus<span className="text-purple-600">IQ</span>
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium block">
                      {sectionLabel}
                    </span>
                  </div>
                </Link>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="min-w-[44px] min-h-[44px] p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center"
                  aria-label="Close Menu"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Drawer Nav */}
              <nav className="space-y-1">
                {mainNavLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href.split('#')[0]));
                  const isProtected = link.protected && !user;

                  return (
                    <Link
                      key={link.name}
                      href={isProtected ? buildLoginRedirectUrl(link.href) : link.href}
                      onClick={(e) => {
                        handleProtectedClick(e, link);
                        setMobileOpen(false);
                      }}
                      className={`min-h-[44px] flex items-center gap-3.5 px-3 py-3 rounded-xl text-sm font-semibold transition-colors ${
                        isActive && !isProtected
                          ? 'bg-purple-50 text-purple-700 font-bold border-l-4 border-purple-600'
                          : isProtected
                          ? 'text-slate-400 hover:bg-slate-50'
                          : 'text-slate-700 hover:bg-purple-50 hover:text-purple-600'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive && !isProtected ? 'text-purple-600' : isProtected ? 'text-slate-300' : 'text-slate-400'}`} />
                      <span className="flex-1">{link.name}</span>
                      {isProtected && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md">
                          <Lock className="w-2.5 h-2.5" />
                          Login
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Drawer Bottom */}
            <div className="pt-4 border-t border-slate-100">
              {user ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs">
                      {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block truncate max-w-[140px]">
                        {user.full_name || 'User'}
                      </span>
                      <span className="text-[10px] text-purple-600 font-semibold capitalize">{user.role}</span>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-slate-400 hover:text-red-600 rounded-lg"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="min-h-[44px] flex items-center justify-center py-2.5 rounded-xl text-xs font-bold text-slate-700 border border-slate-200"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileOpen(false)}
                    className="min-h-[44px] flex items-center justify-center py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 rounded-xl"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
