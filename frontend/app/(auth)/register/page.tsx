'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { GraduationCap, ArrowRight, Lock } from 'lucide-react';
import { registerUser } from '@/lib/publicApi';

function RegisterContent() {

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'faculty' | 'admin'>('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfoMessage('');

    try {
      const registeredEmail = email.trim();
      await registerUser(fullName, registeredEmail, password, role);
      
      // Clear form
      setFullName('');
      setEmail('');
      setPassword('');
      setLoading(false);

      // Redirect ONLY to Login page with success message
      window.location.href = `/login?registered=true&email=${encodeURIComponent(registeredEmail)}`;
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Ambient Background Glows */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-pink-600/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-950/90 backdrop-blur-xl rounded-3xl p-8 border border-purple-900/60 shadow-2xl space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center text-white mx-auto shadow-lg shadow-purple-900/40">
            <GraduationCap className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Create CampusIQ Account</h1>
            <p className="text-xs text-purple-200/80 mt-1">Unlock verified academic tutoring and campus governance</p>
          </div>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="bg-red-950/80 text-red-300 text-xs p-3.5 rounded-2xl border border-red-800 font-semibold flex items-center gap-2">
            <Lock className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {infoMessage && (
          <div className="bg-purple-950/80 text-purple-200 text-xs p-3.5 rounded-2xl border border-purple-800 font-medium">
            {infoMessage}
          </div>
        )}

        {/* Form Registration */}
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Aarav Sharma"
              required
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Campus Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="aarav@university.edu"
              required
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
          </div>

          {/* Role Selection UI Cards */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">Select Campus Role</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                  role === 'student'
                    ? 'bg-purple-900/60 border-purple-500 text-white font-bold ring-1 ring-purple-500'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                }`}
              >
                <span className="text-base">🎓</span>
                <span className="text-[11px]">Student</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('faculty')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                  role === 'faculty'
                    ? 'bg-emerald-900/60 border-emerald-500 text-white font-bold ring-1 ring-emerald-500'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                }`}
              >
                <span className="text-base">👨‍🏫</span>
                <span className="text-[11px]">Faculty</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                  role === 'admin'
                    ? 'bg-slate-800 border-purple-500 text-white font-bold ring-1 ring-purple-500'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                }`}
              >
                <span className="text-base">🛡️</span>
                <span className="text-[11px]">Admin</span>
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl gradient-bg text-white font-bold text-xs hover:opacity-95 disabled:opacity-50 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{loading ? 'Registering Account...' : 'Register Profile'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Enhanced Footer Navigation */}
        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span className="text-slate-400">Already registered?</span>
          <Link
            href="/login"
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-purple-400 font-bold border border-purple-900/60 transition-colors shadow-xs"
          >
            Sign In Here
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 text-purple-400 flex items-center justify-center font-bold">Loading Registration...</div>}>
      <RegisterContent />
    </Suspense>
  );
}

