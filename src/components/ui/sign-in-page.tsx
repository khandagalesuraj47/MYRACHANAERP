import React, { useState, useEffect } from 'react'
import { Eye, EyeOff, ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'

interface SignInPageProps {
  onSuccess?: () => void
  onNavigateHome?: () => void
}

export function SignInPage({ onSuccess, onNavigateHome }: SignInPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  const [isLoading, setIsLoading] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [providerNotice, setProviderNotice] = useState<string | null>(null)

  // Redirect if already authenticated
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && onSuccess) {
        onSuccess()
      }
    })
  }, [onSuccess])

  useEffect(() => {
    if (providerNotice) {
      const timer = setTimeout(() => setProviderNotice(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [providerNotice])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)
    setProviderNotice(null)

    if (!email.trim()) {
      setErrorMessage('Please enter your work email address.')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Please enter a valid email address.')
      return
    }

    if (!password) {
      setErrorMessage('Please enter your account password.')
      return
    }

    if (!isSupabaseConfigured) {
      setErrorMessage(
        'Supabase is not yet configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.'
      )
      return
    }

    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        setErrorMessage(error.message)
        return
      }

      if (data.session) {
        setSuccessMessage('Authentication successful. Initializing workspace...')
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

  const handleForgotPassword = async () => {
    setErrorMessage(null)
    setSuccessMessage(null)
    setProviderNotice(null)

    if (!email.trim()) {
      setErrorMessage('Please enter your work email in the email field first, then click "Forgot password?".')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Please provide a valid email address to send the password reset link.')
      return
    }

    if (!isSupabaseConfigured) {
      setErrorMessage('Supabase is not configured. Please supply environment variables.')
      return
    }

    setIsResetting(true)

    try {
      const redirectTo = `${window.location.origin}/reset-password`
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      })

      if (error) {
        setErrorMessage(error.message)
      } else {
        setSuccessMessage(`Password recovery email sent to ${email.trim()}. Please check your inbox.`)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to request password reset.'
      setErrorMessage(msg)
    } finally {
      setIsResetting(false)
    }
  }

  const handleSocialClick = (provider: 'Google' | 'GitHub') => {
    setProviderNotice(
      `${provider} Single Sign-On is reserved for enterprise federated identity. Contact the system administrator to activate ${provider} SSO in Supabase Auth.`
    )
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
            ENTERPRISE INFRASTRUCTURE ERP
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white drop-shadow-md">
            Rachana Construction & Infrastructure
          </h2>
          <p className="text-sm text-slate-300 max-w-md leading-relaxed drop-shadow-sm font-light">
            Unified heavy civil operations, equipment fleet governance, material tracking, and enterprise resource planning.
          </p>
          <div className="pt-2 flex items-center gap-4 text-xs text-slate-400 font-mono">
            <span>ISO 9001:2015</span>
            <span>•</span>
            <span>Private Limited Operations</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - Authentication Form */}
      <div className="w-full md:w-1/2 h-full flex items-center justify-center p-6 sm:p-10 lg:p-14 overflow-y-auto bg-white">
        <div className="w-full max-w-md space-y-6">
          {/* Header */}
          <div className="space-y-2 text-left">
            <div className="md:hidden flex items-center gap-2 mb-2">
              <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                MYRACHANA ERP
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Welcome Back
            </h1>
            <p className="text-sm text-slate-500">
              Sign in with your corporate enterprise credentials to access your operating workspace.
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

          {providerNotice && (
            <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="flex-1">{providerNotice}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSignIn} className="space-y-4 text-left">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Work Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@rachanainfra.com"
                disabled={isLoading || isResetting}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all disabled:opacity-60"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isLoading || isResetting}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors focus:outline-none disabled:opacity-50 cursor-pointer"
                >
                  {isResetting ? 'Sending link...' : 'Forgot password?'}
                </button>
              </div>

              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  disabled={isLoading || isResetting}
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
              disabled={isLoading || isResetting}
              className="w-full py-2.5 px-4 rounded-lg bg-slate-950 hover:bg-slate-800 active:bg-black text-white font-medium text-sm transition-all shadow-sm flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400 tracking-wider font-medium">
                Or continue with
              </span>
            </div>
          </div>

          {/* SSO Notice */}
          <div className="text-center">
            <span className="text-[11px] text-slate-400 font-medium">
              Enterprise Single Sign-On (SSO)
            </span>
          </div>


          {/* Social / SSO Auth Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleSocialClick('Google')}
              title="Enterprise Google Workspace SSO"
              className="flex items-center justify-center gap-2 py-2 px-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 14.8s.7 5.1 1.9 7.5l3.7-2.9z"
                />
                <path
                  fill="#34A853"
                  d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"
                />
              </svg>
              <span>Google SSO</span>
            </button>

            <button
              type="button"
              onClick={() => handleSocialClick('GitHub')}
              title="Enterprise GitHub SSO"
              className="flex items-center justify-center gap-2 py-2 px-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200 cursor-pointer"
            >
              <svg className="w-4 h-4 fill-current text-slate-800" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
              <span>GitHub SSO</span>
            </button>
          </div>


          {/* Footer note */}
          <div className="pt-2 text-center text-xs text-slate-400">
            <span>Need enterprise account access? </span>
            <span className="text-slate-600 font-medium">
              Contact corporate IT administration
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignInPage