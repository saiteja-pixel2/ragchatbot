'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogIn, UserPlus, LogOut, ShieldCheck, GraduationCap, Sparkles } from 'lucide-react';
import { getCurrentUser, logoutUser, UserProfile } from '@/lib/publicApi';

export default function TopHeader() {
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
  }, [pathname]);

  const handleLogout = () => {
    logoutUser();
    setUser(null);
    window.location.href = '/';
  };

  const isAuthPage = pathname === '/login' || pathname === '/register';

  return (
    <header className="hidden md:flex h-16 px-6 bg-white/90 backdrop-blur-md border-b border-purple-100 items-center justify-between z-20 shrink-0 sticky top-0 shadow-2xs">
      {/* Left Breadcrumb / Context Identifier */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-xs font-bold text-slate-700 tracking-tight">
          Campus<span className="text-purple-600">IQ</span> Academic Portal
        </span>
        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
          Official
        </span>
      </div>

      {/* Right Top Auth Action Area */}
      <div className="flex items-center gap-3">
        {user ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 bg-purple-50/80 border border-purple-200/80 px-3 py-1.5 rounded-xl">
              <div className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
              </div>
              <div className="leading-tight text-left">
                <span className="text-xs font-bold text-slate-900 block truncate max-w-[140px]">
                  {user.full_name || user.email.split('@')[0]}
                </span>
                <span className="text-[10px] text-purple-700 font-semibold capitalize block">
                  {user.role}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 font-bold text-xs transition-colors flex items-center gap-1.5 border border-slate-200"
              title="Log Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        ) : (
          !isAuthPage && (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-4 py-2 rounded-xl text-xs font-bold text-purple-700 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-all flex items-center gap-1.5 shadow-2xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 rounded-xl text-xs font-bold text-white gradient-bg hover:opacity-95 transition-all flex items-center gap-1.5 shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5 text-pink-200" />
                <span>Register</span>
              </Link>
            </div>
          )
        )}
      </div>
    </header>
  );
}
