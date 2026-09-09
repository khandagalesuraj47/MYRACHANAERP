import React, { useState, useEffect } from 'react'
import {
  Eye,
  EyeOff,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  UserPlus,
  LogIn,
  Phone,
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { PeopleRepository } from '../../repositories/admin/people-repository'

interface SignInPageProps {
  onSuccess?: () => void
  onNavigateHome?: () => void
}

type AuthMode = 'SIGN_IN' | 'REGISTER' | 'FORGOT_PASSWORD'
type ForgotPasswordStep = 'EMAIL' | 'REQUESTED'

export function SignInPage({ onSuccess, onNavigateHome }: SignInPageProps) {
  const [mode, setMode] = useState<AuthMode>('SIGN_IN')
  const [fpStep, setFpStep] = useState<ForgotPasswordStep>('EMAIL')

  // Form Fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')

  // UI Toggles
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  // Status & Feedback
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)


  // Auto redirect if already authenticated (unless in password recovery mode)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && onSuccess && mode === 'SIGN_IN') {
        onSuccess()
      }
    })

  }, [onSuccess, mode])

  // Clear messages when changing mode
  const switchMode = (newMode: AuthMode) => {
    setMode(newMode)
    setFpStep('EMAIL')
    setErrorMessage(null)
    setSuccessMessage(null)
  }

  // ============================================================================
  // 1. SIGN IN ACTION
  // ============================================================================
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!email.trim()) {
      setErrorMessage('Please enter your corporate work email.')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Please enter a valid work email address.')
      return
    }

    if (!password) {
      setErrorMessage('Please enter your account password.')
      return
    }

    if (!isSupabaseConfigured) {
      setErrorMessage('Supabase is not configured. Please supply environment variables.')
      return
    }

    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })

      if (error) {
        // Auto-fix for unconfirmed accounts
        if (error.message.toLowerCase().includes('email not confirmed')) {
          try {
            await supabase.rpc('confirm_user_email', { p_email: email.trim().toLowerCase() })
            // Auto retry sign-in
            const retryRes = await supabase.auth.signInWithPassword({
              email: email.trim().toLowerCase(),
              password,
            })
            if (!retryRes.error && retryRes.data.session) {
              setSuccessMessage('Account auto-confirmed! Loading workspace...')
              if (onSuccess) onSuccess()
              return
            }
          } catch {
            // Fall through to standard error message
          }
          setErrorMessage('Email not confirmed. Please disable "Confirm email" in Supabase Authentication settings or verify your email.')
          return
        }

        setErrorMessage(error.message)
        return
      }

      if (data.session) {
        setSuccessMessage('Authentication successful. Loading workspace...')
        if (onSuccess) {
          onSuccess()
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected authentication error occurred.'
      setErrorMessage(msg)
    } finally {
      setIsLoading(false)
    }
  }

  // ============================================================================
  // 2. REGISTER / CREATE USER ACTION
  // ============================================================================
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setErrorMessage('Please enter a valid corporate email address.')
      return
    }

    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.')
      return
    }

    if (!isSupabaseConfigured) {
      setErrorMessage('Supabase is not configured. Please supply environment variables.')
      return
    }

    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      })

      if (error) {
        setErrorMessage(error.message)
        return
      }

      if (data.user) {
        // Link to default organization with is_active = false (Pending Admin Review)
        const { data: orgs } = await supabase.from('organizations').select('id').limit(1)
        if (orgs && orgs.length > 0) {
          await supabase.from('organization_members').insert({
            organization_id: orgs[0].id,
            user_id: data.user.id,
            role: 'USER',
            is_active: false,
          })
        }

        // Auto sign-out session so unapproved user cannot access immediately
        await supabase.auth.signOut()

        setSuccessMessage('Registration submitted! Your account is pending Administrator approval and site assignment. Please contact your company administrator.')
        setTimeout(() => {
          setMode('SIGN_IN')
        }, 3500)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed.'
      setErrorMessage(msg)
    } finally {
      setIsLoading(false)
    }
  }

  // ============================================================================
  // 3. REQUEST TEMPORARY PASSWORD (ADMIN HELPLINE: 7770002696)
  // ============================================================================
  const handleRequestTempPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!email.trim()) {
      setErrorMessage('Please enter your registered work email.')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Please enter a valid work email address.')
      return
    }

    if (!isSupabaseConfigured) {
      setErrorMessage('Supabase is not configured.')
      return
    }

    setIsLoading(true)

    try {
      // 1. Strict pre-check: verify email exists in ERP before submitting
      const emailExists = await PeopleRepository.checkEmailExists(email.trim().toLowerCase())
      if (!emailExists) {
        setErrorMessage('This email address is not registered in MY RACHANA ERP. Please verify the email or contact Administrator.')
        setIsLoading(false)
        return
      }

      // 2. Submit temp password request
      const res = await PeopleRepository.requestTempPassword(email.trim().toLowerCase())
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to submit temporary password request.')
        return
      }

      setFpStep('REQUESTED')
      setSuccessMessage('Temporary password request submitted to Administrator! Call 7770002696 to receive your password.')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to request temporary password.'
      setErrorMessage(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row overflow-hidden bg-white text-slate-900 font-sans antialiased">
      {/* LEFT PANEL - Construction / Infrastructure Imagery Banner */}
      <div className="hidden md:flex md:w-1/2 h-full relative overflow-hidden bg-slate-950 select-none">
        <img
          src="https://cdn.21st.dev/assets/mirror/0d/0d205a1a31d40e927885b0ec5f603407caa10585b5bc6e8b08240402c7417e86.png"
          alt="Rachana Construction Operations"
          className="absolute inset-0 w-full h-full object-cover opacity-85"
        />

        {/* Gradient overlays for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-slate-950/70" />

        {/* Back button */}
        <div className="absolute top-6 left-6 z-20">
          <button
            type="button"
            onClick={onNavigateHome ? onNavigateHome : () => (window.location.href = '/')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-black/40 hover:bg-black/60 backdrop-blur-md text-white/90 hover:text-white border border-white/10 text-xs font-medium transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to overview</span>
          </button>
        </div>

        {/* Brand statement over image */}
        <div className="absolute bottom-8 left-8 right-8 z-20 text-white space-y-3">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-mono tracking-wide">
            ENTERPRISE ERP
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white drop-shadow-md">
            Rachana Construction Limited
          </h2>
          <p className="text-sm text-slate-300 max-w-md leading-relaxed drop-shadow-sm font-light">
            Unified heavy civil operations, equipment fleet governance, material tracking, and enterprise resource planning.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL - Authentication & Security Forms */}
      <div className="w-full md:w-1/2 h-full flex items-center justify-center p-6 sm:p-10 lg:p-14 overflow-y-auto bg-white">
        <div className="w-full max-w-md space-y-6">
          {/* Header */}
          <div className="space-y-2 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                MYRACHANA ERP
              </span>

              {mode !== 'SIGN_IN' && (
                <button
                  type="button"
                  onClick={() => switchMode('SIGN_IN')}
                  className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>
              )}
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {mode === 'SIGN_IN' && 'Welcome Back'}
              {mode === 'REGISTER' && 'Create ERP Account'}
              {mode === 'FORGOT_PASSWORD' && 'Password Recovery'}
            </h1>
            <p className="text-sm text-slate-500">
              {mode === 'SIGN_IN' && 'Sign in with your enterprise credentials to access your operating workspace.'}
              {mode === 'REGISTER' && 'Register your corporate account to join your project site team.'}
              {mode === 'FORGOT_PASSWORD' && 'Reset your password securely via 5-minute email verification OTP.'}
            </p>
          </div>

          {/* Configuration Banner Alert if Supabase unconfigured */}
          {!isSupabaseConfigured && (
            <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Supabase Environment Unconfigured:</span>
                <p className="mt-0.5 text-amber-700 leading-relaxed font-mono text-[11px]">
                  Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your local .env or Vercel Environment Variables.
                </p>
              </div>
            </div>
          )}

          {/* Feedback Notices */}
          {errorMessage && (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{successMessage}</div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 1: SIGN IN FORM                                                      */}
          {/* ========================================================================= */}
          {mode === 'SIGN_IN' && (
            <form onSubmit={handleSignIn} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label
                  htmlFor="signin-email"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
                >
                  Work Email
                </label>
                <input
                  id="signin-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@rachanainfra.com"
                  disabled={isLoading}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all disabled:opacity-60"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="signin-password"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode('FORGOT_PASSWORD')}
                    disabled={isLoading}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors focus:outline-none cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>

                <div className="relative">
                  <input
                    id="signin-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    disabled={isLoading}
                    className="w-full px-3.5 py-2.5 pr-10 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 focus:ring-offset-0"
                />
                <label htmlFor="remember-me" className="ml-2 block text-xs text-slate-600 select-none">
                  Remember me on this browser
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-lg bg-slate-950 hover:bg-slate-800 active:bg-black text-white font-medium text-sm transition-all shadow-sm flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In</span>
                  </>
                )}
              </button>

              {/* Register Switch Link */}
              <div className="pt-2 text-center border-t border-slate-100">
                <p className="text-xs text-slate-500">
                  Need a new operator or staff account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('REGISTER')}
                    className="font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    Register here
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* VIEW 2: REGISTER / CREATE USER FORM                                       */}
          {/* ========================================================================= */}
          {mode === 'REGISTER' && (
            <form onSubmit={handleRegister} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  disabled={isLoading}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all disabled:opacity-60"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Work Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@rachanainfra.com"
                  disabled={isLoading}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all disabled:opacity-60"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Password <span className="text-rose-500">*</span> (min 6 characters)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    disabled={isLoading}
                    className="w-full px-3.5 py-2.5 pr-10 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    disabled={isLoading}
                    className="w-full px-3.5 py-2.5 pr-10 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-sm flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-60 cursor-pointer shadow-blue-600/20"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Create User Account</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center border-t border-slate-100">
                <p className="text-xs text-slate-500">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('SIGN_IN')}
                    className="font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    Sign In
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* VIEW 3: REQUEST TEMPORARY PASSWORD (ADMIN HELPLINE: 7770002696)           */}
          {/* ========================================================================= */}
          {mode === 'FORGOT_PASSWORD' && (
            <div className="space-y-5 text-left">
              {fpStep === 'EMAIL' ? (
                <form onSubmit={handleRequestTempPassword} className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900">
                      Request Temporary Password
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Enter your registered work email. Once submitted, call the Administrator at <strong>7770002696</strong> to receive your temporary password.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Registered Work Email
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@rachanainfra.com"
                      disabled={isLoading}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all disabled:opacity-60"
                    />
                    <p className="text-[11px] text-slate-500">
                      The system strictly verifies that this email exists in Supabase before creating the request.
                    </p>
                  </div>

                  {/* Admin Helpline Card */}
                  <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/80 text-blue-900 text-xs flex items-start gap-2.5">
                    <Phone className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-bold">Admin Helpline: 7770002696</span>
                      <p className="text-[11px] text-blue-800 leading-normal">
                        After submitting, you can call <strong>7770002696</strong> directly to say: <em>"Temporary password dya, request dili ahe"</em>.
                      </p>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer shadow-blue-600/20 disabled:opacity-60"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying & Submitting...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>Request Temporary Password</span>
                      </>
                    )}
                  </button>

                  <div className="pt-2 text-center border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => switchMode('SIGN_IN')}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      ← Back to Sign In
                    </button>
                  </div>
                </form>
              ) : (
                /* fpStep === 'REQUESTED' */
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1.5">
                    <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                      <CheckCircle2 className="h-5 w-5 shrink-0" />
                      <span>Request Logged with Administrator!</span>
                    </div>
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      Your temporary password request for <strong className="text-emerald-950">{email}</strong> has been logged in the system.
                    </p>
                  </div>

                  {/* Direct Call Administrator Card */}
                  <div className="p-5 rounded-2xl border border-slate-800 bg-slate-950 text-white space-y-3 text-center shadow-xl">
                    <div className="flex items-center justify-center gap-2">
                      <Phone className="h-4 w-4 text-emerald-400" />
                      <span className="font-mono text-xs uppercase tracking-widest text-emerald-400 font-bold">
                        Admin Helpline Number
                      </span>
                    </div>
                    <div className="text-3xl font-mono font-black tracking-wider text-emerald-400">
                      7770002696
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto">
                      Call the Admin now to say:
                      <br />
                      <span className="text-amber-300 font-semibold font-mono">
                        "Temporary password dya, request dili ahe"
                      </span>
                    </p>

                    <a
                      href="tel:7770002696"
                      className="inline-flex w-full items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all shadow-md shadow-emerald-600/30 cursor-pointer"
                    >
                      <Phone className="h-4 w-4" />
                      <span>Call Administrator Now (7770002696)</span>
                    </a>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs space-y-1">
                    <span className="font-semibold text-slate-900">What happens next?</span>
                    <p className="text-[11px] text-slate-600 leading-normal">
                      1. Admin provides you the temporary password via phone.
                      <br />
                      2. Sign in with your email and the temporary password.
                      <br />
                      3. The system will prompt you immediately to set your new permanent password.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => switchMode('SIGN_IN')}
                      className="w-full py-2.5 px-4 rounded-lg bg-slate-950 hover:bg-slate-800 text-white font-medium text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <LogIn className="h-4 w-4" />
                      <span>Proceed to Sign In (Enter Temp Password)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFpStep('EMAIL')}
                      className="w-full py-2 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      Request for a different email
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SignInPage