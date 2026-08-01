'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowRight, Home, Lock } from 'lucide-react';
import { getCurrentUser, getRoleDestinationPath, UserProfile } from '@/lib/publicApi';

export default function UnauthorizedPage() {
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
  }, []);

  const destinationPath = getRoleDestinationPath(user?.role);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-red-600/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl rounded-3xl p-8 border border-red-900/50 shadow-2xl text-center space-y-6 relative z-10">
        <div className="w-16 h-16 rounded-2xl bg-red-950/80 border border-red-800/80 text-red-400 flex items-center justify-center mx-auto shadow-md">
          <ShieldAlert className="w-9 h-9" />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-red-400 bg-red-950 px-2.5 py-1 rounded-full border border-red-900">
            HTTP 403 Forbidden
          </span>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Access Denied</h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            You do not have permission to access this page. This area requires elevated role privileges.
          </p>
        </div>

        {user && (
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
            <div className="text-left">
              <span className="font-bold text-slate-200 block">{user.full_name || user.email}</span>
              <span className="text-[11px] text-slate-400 capitalize">Logged in as {user.role}</span>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-purple-950 text-purple-300 font-bold text-[10px] uppercase">
              {user.role}
            </span>
          </div>
        )}

        <div className="pt-2">
          <Link
            href={destinationPath}
            className="w-full py-3.5 rounded-xl gradient-bg text-white font-bold text-xs hover:opacity-95 transition-all shadow-md flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Go to My Workspace Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
