'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { GraduationCap, Eye, EyeOff, Lock, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { loginUser } from '@/lib/publicApi';
import { normalizeRedirectUrl, getRedirectAfterLogin } from '@/lib/redirectUtils';

function LoginContent() {
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isRegistrationSuccess, setIsRegistrationSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Purge any stale session stored in browser when opening login page
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('campusiq_user');
      localStorage.removeItem('campusiq_token');
      sessionStorage.clear();
      document.cookie = 'campusiq_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      document.cookie = 'campusiq_role=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    }
  }, []);

  // Handle post-registration success banner & contextual redirect messages
  useEffect(() => {
    const isRegistered = searchParams.get('registered') === 'true';
    const emailParam = searchParams.get('email');
    if (isRegistered) {
      setIsRegistrationSuccess(true);
      setInfoMessage('✅ Account created! Please sign in with your credentials.');
      if (emailParam) {
        setEmail(emailParam);
      }
    } else if (redirectParam) {
      const cleanPath = redirectParam.toLowerCase();
      if (cleanPath.includes('/chat')) {
        setInfoMessage('Authentication required to access Ask AI Chatbot.');
      } else if (cleanPath.includes('/dashboard')) {
        setInfoMessage('Authentication required to access Admin Dashboard.');
      } else if (cleanPath.includes('/faculty')) {
        setInfoMessage('Authentication required to access Faculty Portal.');
      } else if (cleanPath.includes('/settings')) {
        setInfoMessage('Authentication required to access Profile & Settings.');
      } else {
        setInfoMessage('Authentication required to access this page.');
      }
    }
  }, [searchParams, redirectParam]);

  const executeRedirect = (userRole?: string) => {
    const targetPath = getRedirectAfterLogin(userRole, redirectParam);
    if (typeof window !== 'undefined' && window.location.pathname === targetPath.split('?')[0]) {
      return;
    }
    window.location.href = targetPath;
  };

  const validateInputs = (): boolean => {
    let isValid = true;
    setEmailError('');
    setPasswordError('');
    setGeneralError('');

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setEmailError('Email address is required');
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setEmailError('Please enter a valid email format (e.g. user@domain.com)');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    }

    return isValid;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;

    setLoading(true);
    setGeneralError('');
    setInfoMessage('');

    try {
      const resUser = await loginUser(email.trim(), password, rememberMe);
      executeRedirect(resUser.role);
    } catch (err: any) {
      setGeneralError(err.message || 'Incorrect email or password. Please verify your credentials.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Ambient Glow Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-600/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-950/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-purple-900/60 shadow-2xl space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center text-white mx-auto shadow-lg shadow-purple-900/40">
            <GraduationCap className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Sign In to CampusIQ</h1>
            <p className="text-xs text-purple-200/80 mt-1">
              {redirectParam ? `Authentication required for ${redirectParam}` : 'Access verified AI tutoring, course tools, and campus records'}
            </p>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {generalError && (
          <div className="bg-red-950/90 text-red-200 text-xs p-3.5 rounded-2xl border border-red-800 font-medium flex items-start gap-2.5 shadow-sm animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <span>{generalError}</span>
          </div>
        )}

        {infoMessage && (
          <div className={`text-xs p-3.5 rounded-2xl font-medium flex items-center gap-2.5 shadow-sm ${
            isRegistrationSuccess
              ? 'bg-emerald-950/90 text-emerald-200 border border-emerald-700'
              : 'bg-purple-950/90 text-purple-200 border border-purple-800'
          }`}>
            <CheckCircle2 className={`w-4 h-4 shrink-0 ${isRegistrationSuccess ? 'text-emerald-400' : 'text-purple-400'}`} />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* Standard Email & Password Form */}
        <form onSubmit={handleLogin} noValidate className="space-y-4">
          {/* Email Field */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError('');
              }}
              placeholder="student@mits.edu, faculty@mits.edu, or admin@mits.edu"
              disabled={loading}
              className={`w-full px-4 py-3 rounded-2xl bg-slate-900/90 text-white placeholder-slate-500 border text-xs focus:outline-none transition-all ${
                emailError
                  ? 'border-red-500/80 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                  : 'border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500'
              }`}
            />
            {emailError && (
              <p className="text-[11px] font-semibold text-red-400 mt-1 flex items-center gap-1">
                <span>⚠</span> {emailError}
              </p>
            )}
          </div>

          {/* Password Field with Show/Hide Toggle */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                }}
                placeholder="••••••••"
                disabled={loading}
                className={`w-full px-4 py-3 rounded-2xl bg-slate-900/90 text-white placeholder-slate-500 border text-xs focus:outline-none transition-all pr-10 ${
                  passwordError
                    ? 'border-red-500/80 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                    : 'border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {passwordError && (
              <p className="text-[11px] font-semibold text-red-400 mt-1 flex items-center gap-1">
                <span>⚠</span> {passwordError}
              </p>
            )}
          </div>

          {/* Options: Remember Me & Forgot Password */}
          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-slate-300 select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500 focus:ring-offset-slate-950"
              />
              <span>Remember Me</span>
            </label>
            <Link
              href="/forgot-password"
              className="text-purple-400 hover:text-purple-300 font-semibold transition-colors hover:underline"
            >
              Forgot Password?
            </Link>
          </div>

          {/* Login Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-2xl font-bold text-white text-xs bg-purple-600 hover:bg-purple-500 active:scale-[0.99] transition-all shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Login</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span className="text-slate-400">Don't have an account?</span>
          <Link
            href="/register"
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-purple-400 font-bold border border-purple-900/60 transition-colors shadow-xs"
          >
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 text-purple-400 flex items-center justify-center font-bold">Loading Authentication...</div>}>
      <LoginContent />
    </Suspense>
  );
}
