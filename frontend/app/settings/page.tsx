'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Lock, Bell, Sliders, ShieldCheck, KeyRound, CheckCircle2, Moon, Sun, ArrowLeft, GraduationCap, AlertCircle, Save } from 'lucide-react';
import { getCurrentUser, UserProfile } from '@/lib/publicApi';
import { buildLoginRedirectUrl } from '@/lib/redirectUtils';

function SettingsContent() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Preference Toggles
  const [emailFallbackAlerts, setEmailFallbackAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [showTelemetryInChat, setShowTelemetryInChat] = useState(true);

  // Profile Form Edit State
  const [fullName, setFullName] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const authCheckedRef = useRef(false);

  useEffect(() => {
    if (authCheckedRef.current) return;
    authCheckedRef.current = true;

    const currentUser = getCurrentUser();
    const hasToken = Boolean(typeof window !== 'undefined' && (localStorage.getItem('campusiq_token') || document.cookie.includes('campusiq_token')));
    if (!currentUser && !hasToken) {
      router.push(buildLoginRedirectUrl('/settings'));
      return;
    }
    if (currentUser) {
      setUser(currentUser);
      setFullName(currentUser.full_name || '');
    }
    setLoading(false);
  }, [router]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const updatedUser: UserProfile = { ...user, full_name: fullName.trim() || user.full_name };
    localStorage.setItem('campusiq_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-purple-400 font-bold text-sm">
        Loading User Settings...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 backdrop-blur-xl p-6 rounded-3xl border border-purple-900/50 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center text-white shadow-lg shadow-purple-900/40">
              <Sliders className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-white tracking-tight">Account & System Settings</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-700 text-xs font-bold capitalize">
                  {user?.role || 'Student'}
                </span>
              </div>
              <p className="text-xs text-purple-200/80 mt-0.5">
                Manage your profile, security preferences, notification alerts, and AI workspace configurations
              </p>
            </div>
          </div>

          <button
            onClick={() => router.back()}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        </div>

        {savedSuccess && (
          <div className="bg-purple-950/90 text-purple-200 text-xs p-4 rounded-2xl border border-purple-800 font-semibold flex items-center gap-2.5 shadow-md animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-purple-400" />
            <span>Settings and profile information saved successfully!</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column: Quick Profile Card */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-slate-900/80 backdrop-blur-xl p-6 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
              <div className="w-20 h-20 rounded-full gradient-bg flex items-center justify-center text-white font-extrabold text-2xl mx-auto shadow-md">
                {user?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="text-center space-y-1">
                <h3 className="font-bold text-base text-white">{user?.full_name}</h3>
                <p className="text-xs text-slate-400 font-mono">{user?.email}</p>
                <div className="pt-2">
                  <span className="inline-block px-3 py-1 rounded-full bg-slate-950 text-purple-400 border border-purple-900/60 text-[11px] font-bold uppercase tracking-wider">
                    Role: {user?.role}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>User ID:</span>
                  <span className="font-mono text-slate-200">{user?.id?.slice(0, 10)}...</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Status:</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Verified Profile
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Settings Forms */}
          <div className="md:col-span-2 space-y-6">
            {/* 1. Profile Information */}
            <div className="bg-slate-900/80 backdrop-blur-xl p-6 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <User className="w-5 h-5 text-purple-400" />
                <h2 className="font-bold text-base text-white">Profile Information</h2>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-500 cursor-not-allowed font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Campus email address cannot be modified directly.</p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl gradient-bg text-white font-bold text-xs hover:opacity-95 transition-all shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Profile Changes</span>
                  </button>
                </div>
              </form>
            </div>

            {/* 2. Security & Password Reset */}
            <div className="bg-slate-900/80 backdrop-blur-xl p-6 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Lock className="w-5 h-5 text-purple-400" />
                <h2 className="font-bold text-base text-white">Security & Access Control</h2>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="space-y-1">
                  <span className="font-bold text-xs text-white block">Password Management</span>
                  <p className="text-xs text-slate-400">
                    Reset or change your account password using our 3-step Email OTP recovery flow.
                  </p>
                </div>
                <Link
                  href="/forgot-password"
                  className="px-4 py-2 rounded-xl bg-purple-950 hover:bg-purple-900 border border-purple-800 text-purple-300 font-bold text-xs transition-colors shrink-0 flex items-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Change Password</span>
                </Link>
              </div>
            </div>

            {/* 3. Notification Preferences */}
            <div className="bg-slate-900/80 backdrop-blur-xl p-6 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Bell className="w-5 h-5 text-purple-400" />
                <h2 className="font-bold text-base text-white">Notification Preferences</h2>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800 cursor-pointer">
                  <div>
                    <span className="font-bold text-xs text-white block">Email Alerts for Unanswered RAG Fallbacks</span>
                    <span className="text-[11px] text-slate-400">Receive instant alerts when a student question triggers the fallback message.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailFallbackAlerts}
                    onChange={(e) => setEmailFallbackAlerts(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-purple-600 focus:ring-purple-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800 cursor-pointer">
                  <div>
                    <span className="font-bold text-xs text-white block">Weekly Knowledge Analytics Digest</span>
                    <span className="text-[11px] text-slate-400">Get a weekly summary of total queries, top fallback topics, and search accuracy.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={weeklyDigest}
                    onChange={(e) => setWeeklyDigest(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-purple-600 focus:ring-purple-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800 cursor-pointer">
                  <div>
                    <span className="font-bold text-xs text-white block">Security & Login Audit Logs</span>
                    <span className="text-[11px] text-slate-400">Notify me when my profile logs in from a new browser or device.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={securityAlerts}
                    onChange={(e) => setSecurityAlerts(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-purple-600 focus:ring-purple-500"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-purple-400 flex items-center justify-center font-bold">Loading Settings...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
