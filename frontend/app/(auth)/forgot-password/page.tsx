'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { GraduationCap, ArrowRight, ArrowLeft, KeyRound, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { requestPasswordResetOtp, verifyPasswordResetOtp, updatePasswordWithOtp } from '@/lib/publicApi';

function ForgotPasswordContent() {
  // Step tracking: 1 = Request, 2 = Verify OTP, 3 = Reset Password
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form states
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validation & feedback states
  const [emailError, setEmailError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Rate-limiting resend timer (60 seconds cooldown)
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // --- STEP 1: REQUEST OTP ---
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setGeneralError('');
    setSuccessMessage('');

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setEmailError('Email address is required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setEmailError('Please enter a valid email address (e.g. student@mits.edu).');
      return;
    }

    setLoading(true);
    try {
      const res = await requestPasswordResetOtp(cleanEmail);
      setSuccessMessage(res.message || 'Verification code sent to your email.');
      if (res.dev_code) {
        setDevCode(res.dev_code);
      }
      setResendCooldown(60); // 60s rate-limiting cooldown timer
      setStep(2);
    } catch (err: any) {
      setGeneralError(err.message || 'Failed to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setOtpError('');
    setGeneralError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const res = await requestPasswordResetOtp(email.trim());
      setSuccessMessage('A new verification code has been dispatched.');
      if (res.dev_code) {
        setDevCode(res.dev_code);
      }
      setResendCooldown(60);
    } catch (err: any) {
      setGeneralError(err.message || 'Too many requests. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // --- STEP 2: VERIFY OTP ---
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');
    setGeneralError('');
    setSuccessMessage('');

    const cleanCode = otpCode.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      setOtpError('Please enter a valid 6-digit numeric verification code.');
      return;
    }

    setLoading(true);
    try {
      await verifyPasswordResetOtp(email.trim(), cleanCode);
      setSuccessMessage('Verification code accepted! Set your new password.');
      setStep(3);
    } catch (err: any) {
      setOtpError(err.message || 'Incorrect verification code. Please check your email.');
    } finally {
      setLoading(false);
    }
  };

  // --- STEP 3: RESET PASSWORD ---
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setGeneralError('');
    setSuccessMessage('');

    if (!newPassword) {
      setPasswordError('New password is required.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters in length.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match. Please verify both fields.');
      return;
    }

    setLoading(true);
    try {
      const res = await updatePasswordWithOtp(email.trim(), otpCode.trim(), newPassword);
      setSuccessMessage(res.message || 'Password updated successfully!');
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    } catch (err: any) {
      setGeneralError(err.message || 'Failed to reset password. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-600/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-950/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-purple-900/60 shadow-2xl space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center text-white mx-auto shadow-lg shadow-purple-900/40">
            <KeyRound className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              {step === 1 && 'Forgot Password'}
              {step === 2 && 'Verify Verification Code'}
              {step === 3 && 'Reset Your Password'}
            </h1>
            <p className="text-xs text-purple-200/80 mt-1">
              {step === 1 && 'Step 1 of 3: Enter your registered campus email address'}
              {step === 2 && `Step 2 of 3: Enter the 6-digit OTP code sent to ${email}`}
              {step === 3 && 'Step 3 of 3: Create a secure new password for your account'}
            </p>
          </div>
        </div>

        {/* Global Feedback Banners */}
        {generalError && (
          <div className="bg-red-950/90 text-red-200 text-xs p-3.5 rounded-2xl border border-red-800 font-medium flex items-start gap-2.5 shadow-sm">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <span>{generalError}</span>
          </div>
        )}

        {successMessage && (
          <div className="bg-purple-950/90 text-purple-200 text-xs p-3.5 rounded-2xl border border-purple-800 font-medium flex items-center gap-2.5 shadow-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-purple-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Local Developer Test Hint Pill */}
        {devCode && step === 2 && (
          <div className="bg-slate-900/90 border border-purple-800/80 p-3 rounded-2xl text-[11px] text-purple-300 flex items-center justify-between">
            <span>Local Test Verification Code:</span>
            <span className="font-mono font-bold text-xs bg-purple-950 px-2 py-0.5 rounded border border-purple-700 text-purple-200">
              {devCode}
            </span>
          </div>
        )}

        {/* STEP 1: REQUEST CODE FORM */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} noValidate className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Campus Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError('');
                }}
                placeholder="student@mits.edu, faculty@mits.edu, or user@gmail.com"
                className={`w-full px-4 py-2.5 bg-slate-900 border rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors ${
                  emailError
                    ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                    : 'border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500'
                }`}
              />
              {emailError && (
                <p className="text-[11px] text-red-400 mt-1 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{emailError}</span>
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl gradient-bg text-white font-bold text-xs hover:opacity-95 disabled:opacity-50 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{loading ? 'Sending Code...' : 'Send Verification Code'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* STEP 2: VERIFY OTP FORM */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} noValidate className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                6-Digit Verification Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setOtpCode(val);
                  if (otpError) setOtpError('');
                }}
                placeholder="123456"
                className={`w-full px-4 py-3 bg-slate-900 border rounded-xl text-center text-lg font-mono tracking-widest text-white placeholder-slate-600 focus:outline-none transition-colors ${
                  otpError
                    ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                    : 'border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500'
                }`}
              />
              {otpError && (
                <p className="text-[11px] text-red-400 mt-1 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{otpError}</span>
                </p>
              )}
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change Email</span>
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || loading}
                className="text-purple-400 hover:text-purple-300 disabled:text-slate-600 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>
                  {resendCooldown > 0 ? `Resend Code (${resendCooldown}s)` : 'Resend Code'}
                </span>
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl gradient-bg text-white font-bold text-xs hover:opacity-95 disabled:opacity-50 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{loading ? 'Verifying Code...' : 'Verify Code'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* STEP 3: RESET PASSWORD FORM */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} noValidate className="space-y-4">
            {/* New Password */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (passwordError) setPasswordError('');
                  }}
                  placeholder="At least 6 characters"
                  className={`w-full pl-4 pr-11 py-2.5 bg-slate-900 border rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors ${
                    passwordError
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-slate-800 focus:border-purple-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (passwordError) setPasswordError('');
                  }}
                  placeholder="Re-enter new password"
                  className={`w-full pl-4 pr-11 py-2.5 bg-slate-900 border rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors ${
                    passwordError
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-slate-800 focus:border-purple-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordError && (
                <p className="text-[11px] text-red-400 mt-1 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{passwordError}</span>
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl gradient-bg text-white font-bold text-xs hover:opacity-95 disabled:opacity-50 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{loading ? 'Updating Password...' : 'Reset Password'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Footer Navigation */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
          <Link
            href="/login"
            className="text-slate-400 hover:text-purple-300 font-medium transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Login</span>
          </Link>
          <Link
            href="/register"
            className="text-purple-400 font-bold hover:underline transition-colors"
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 text-purple-400 flex items-center justify-center font-bold">Loading Password Reset...</div>}>
      <ForgotPasswordContent />
    </Suspense>
  );
}
