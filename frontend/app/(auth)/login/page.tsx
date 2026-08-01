'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { GraduationCap, Eye, EyeOff, Lock, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { loginUser, loginWithGoogleOAuth, getRoleDestinationPath } from '@/lib/publicApi';
import { createClient } from '@/lib/supabase/client';
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

  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState('');
  const [googleNameInput, setGoogleNameInput] = useState('');

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

  // Dynamically load Google Identity Services script if Client ID is configured in env
  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (clientId && typeof window !== 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if ((window as any).google?.accounts?.id) {
          (window as any).google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleCredentialResponse,
          });
        }
      };
      document.body.appendChild(script);
    }
  }, []);

  const handleGoogleCredentialResponse = async (response: any) => {
    setLoading(true);
    setInfoMessage("Authenticating with Google Account credentials...");
    try {
      const payloadBase64 = response.credential.split('.')[1];
      const decodedJson = atob(payloadBase64);
      const decoded = JSON.parse(decodedJson);
      const user = await loginWithGoogleOAuth(decoded.email, decoded.name, response.credential);
      executeRedirect(user.role);
    } catch (err: any) {
      setGeneralError("Google Sign-In failed to verify with server.");
      setLoading(false);
      setInfoMessage('');
    }
  };

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

  const handleGoogleSignInClick = async () => {
    setGeneralError('');
    setInfoMessage('Launching Google Account Picker...');
    setLoading(true);

    try {
      const supabase = createClient();

      // 1. Purge any stale session locally before starting new OAuth flow
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {}

      if (typeof window !== 'undefined') {
        localStorage.removeItem('campusiq_user');
        localStorage.removeItem('campusiq_token');
        sessionStorage.clear();
        document.cookie = 'campusiq_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
        document.cookie = 'campusiq_role=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      }

      // 2. Trigger Google OAuth with prompt: 'select_account' to force Google account chooser
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline',
          },
        },
      });

      if (error) {
        setGeneralError(`Google OAuth error: ${error.message}`);
        setLoading(false);
      }
    } catch (err: any) {
      setGeneralError(err?.message || 'Failed to launch Google Sign-In. Please check Supabase configuration.');
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

        {/* Divider */}
        <div className="relative flex items-center justify-center my-4">
          <div className="border-t border-slate-800 w-full"></div>
          <span className="bg-slate-950 px-3 text-[10px] uppercase font-extrabold text-slate-500 tracking-wider">
            or
          </span>
          <div className="border-t border-slate-800 w-full"></div>
        </div>

        {/* Official Google Branded Button ("Continue with Google") */}
        <button
          type="button"
          onClick={handleGoogleSignInClick}
          className="w-full h-12 px-4 rounded-xl bg-white hover:bg-slate-50 text-[#3c4043] border border-slate-300 font-semibold text-xs transition-all shadow-xs flex items-center justify-center gap-3 cursor-pointer group shrink-0"
        >
          <svg className="w-5 h-5 shrink-0" style={{ width: '20px', height: '20px', minWidth: '20px', minHeight: '20px' }} viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span className="font-semibold text-slate-700 text-xs">Continue with Google</span>
        </button>

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
