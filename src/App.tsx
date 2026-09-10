import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { SignInPage } from './components/ui/sign-in-page'
import { ResetPasswordPage } from './components/ui/reset-password-page'
import { AdminDashboard } from './components/admin/admin-dashboard'
import { UserPortal } from './components/user/user-portal'
import { AuthProvider } from './context/auth-provider'
import { useAuth } from './context/auth-context'
import { MandatoryPasswordChangeModal } from './components/ui/mandatory-password-change-modal'
import { AppUpdateBanner } from './components/common/app-update-banner'
import { supabase } from './lib/supabase'
import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

function WorkspaceLoadingScreen({ message = 'Loading your workspace...' }: { message?: string }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500 font-sans text-xs gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-blue-600/20 border-t-blue-600 animate-spin" />
      <p className="text-slate-700 font-semibold">{message}</p>
    </div>
  )
}

function NoOrganizationAccessScreen({
  message = 'Your account is not assigned to an active organization. Please contact your administrator.',
  status = 'NO_MEMBERSHIP',
}: {
  message?: string
  status?: string
}) {
  const { signOut, refreshContext, context: authContext } = useAuth()
  const navigate = useNavigate()
  const [retrying, setRetrying] = useState(false)

  // Realtime Supabase Listener: Auto-unlock workspace the second Admin authorizes account!
  useEffect(() => {
    if (!authContext?.userId) return

    const channelName = `pending-approval-unlock-${authContext.userId}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'organization_members',
          filter: `user_id=eq.${authContext.userId}`,
        },
        async () => {
          await refreshContext()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [authContext?.userId, refreshContext])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  const handleRetry = async () => {
    setRetrying(true)
    await refreshContext()
    setRetrying(false)
  }

  const isError = status === 'ERROR'
  const isPending = status === 'USER_INACTIVE'

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6 font-sans antialiased select-none">
      <div className={`w-full max-w-md rounded-2xl border p-8 shadow-xl space-y-6 text-left ${
        isPending
          ? 'border-amber-200 bg-white'
          : isError
          ? 'border-rose-200 bg-white'
          : 'border-slate-200 bg-white'
      }`}>
        <div className="space-y-2">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-xs font-bold uppercase tracking-wider ${
            isPending
              ? 'bg-amber-50 border border-amber-200 text-amber-800'
              : isError
              ? 'bg-rose-50 border border-rose-200 text-rose-800'
              : 'bg-slate-100 border border-slate-200 text-slate-700'
          }`}>
            {isPending ? 'Pending Admin Approval' : isError ? 'Verification Error' : 'Access Restricted'}
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {isPending ? 'Approval & Site Lock Required' : isError ? 'Database Query Error' : 'Organization Membership Required'}
          </h1>
          <p className="text-xs text-slate-600 leading-relaxed font-sans">
            {message}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
          <div>
            Status:{' '}
            <span className={isPending ? 'text-amber-700 font-bold' : 'text-rose-700 font-bold'}>
              {isPending ? 'Pending Admin Authorization' : isError ? 'Database Error' : 'Unassigned / Inactive'}
            </span>
          </div>
          <div className="text-[11px] text-slate-500">
            {isPending
              ? 'Your account request has been submitted to your company administrator. Once they authorize your account and assign your operating site, you can sign in directly.'
              : isError
              ? 'A PostgreSQL / RLS verification error occurred. Check browser console diagnostics or verify database policies.'
              : 'To gain access to your company workspace, please contact your organization system administrator to assign you an active role.'}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleRetry}
            disabled={retrying}
            className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs transition-colors cursor-pointer text-center shadow-xs"
          >
            {retrying ? 'Re-verifying...' : 'Retry'}
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-semibold text-xs transition-colors cursor-pointer text-center shadow-2xs"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}

function isAdministrator(ctx?: { status: string; role?: string | null; baseRole?: string | null; isMasterAdmin?: boolean } | null): boolean {
  if (!ctx || ctx.status !== 'SUCCESS') return false
  const r = ctx.role
  const b = ctx.baseRole
  return (
    r === 'ADMIN' ||
    r === 'MASTER_ADMIN' ||
    b === 'ADMIN' ||
    b === 'MASTER_ADMIN' ||
    ctx.isMasterAdmin === true
  )
}

function RootDispatcher() {
  const { context, loading } = useAuth()

  if (loading) {
    return <WorkspaceLoadingScreen message="Loading your workspace..." />
  }

  if (!context || context.status === 'UNAUTHENTICATED') {
    return <Navigate to="/login" replace />
  }

  if (context.status === 'SUCCESS') {
    if (isAdministrator(context)) {
      return <Navigate to="/admin" replace />
    }
    return <Navigate to="/app" replace />
  }

  return <NoOrganizationAccessScreen message={context.errorMessage} status={context.status} />
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { context, loading } = useAuth()

  if (loading) {
    return <WorkspaceLoadingScreen message="Verifying administrator authorization..." />
  }

  if (!context || context.status === 'UNAUTHENTICATED') {
    return <Navigate to="/login" replace />
  }

  if (context.status === 'SUCCESS') {
    if (isAdministrator(context)) {
      return <>{children}</>
    }
    // Normal user attempting to access /admin -> redirect to /app
    return <Navigate to="/app" replace />
  }

  return <NoOrganizationAccessScreen message={context.errorMessage} status={context.status} />
}

function UserRoute() {
  const { context, loading } = useAuth()

  if (loading) {
    return <WorkspaceLoadingScreen message="Loading user workspace..." />
  }

  if (!context || context.status === 'UNAUTHENTICATED') {
    return <Navigate to="/login" replace />
  }

  if (context.status === 'SUCCESS') {
    if (isAdministrator(context)) {
      // Administrator attempting to access /app -> redirect to /admin
      return <Navigate to="/admin" replace />
    }
    return <UserPortal context={context} />
  }

  return <NoOrganizationAccessScreen message={context.errorMessage} status={context.status} />
}

function LoginPageWrapper() {
  const { context, loading, refreshContext } = useAuth()
  const navigate = useNavigate()

  // If already authenticated and resolved, redirect to appropriate portal
  if (!loading && context?.status === 'SUCCESS') {
    if (isAdministrator(context)) {
      return <Navigate to="/admin" replace />
    }
    return <Navigate to="/app" replace />
  }

  return (
    <SignInPage
      onSuccess={async () => {
        const res = await refreshContext()
        if (res.status === 'SUCCESS') {
          if (isAdministrator(res)) {
            navigate('/admin', { replace: true })
          } else {
            navigate('/app', { replace: true })
          }
        } else if (res.status === 'UNAUTHENTICATED') {
          navigate('/login', { replace: true })
        } else {
          navigate('/', { replace: true })
        }
      }}
      onNavigateHome={() => navigate('/')}
    />
  )
}

function MandatoryPasswordGuard() {
  const { context, refreshContext } = useAuth()

  if (!context || !context.mustChangePassword) {
    return null
  }

  return (
    <MandatoryPasswordChangeModal
      isOpen={true}
      onSuccess={async () => {
        await refreshContext()
      }}
    />
  )
}

function NativeBackButtonHandler() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const listenerPromise = CapApp.addListener('backButton', ({ canGoBack }) => {
      // 1. Dispatch custom event for any open modal/sheet to intercept and close itself
      const customEvent = new CustomEvent('nativeHardwareBack', { cancelable: true })
      const wasPrevented = !window.dispatchEvent(customEvent)
      if (wasPrevented) return

      // 2. Check if a standard close button is visible
      const activeCloseBtn = document.querySelector<HTMLButtonElement>(
        '[data-dialog-close], [aria-label="Close"], [data-sheet-close]'
      )
      if (activeCloseBtn && activeCloseBtn.offsetParent !== null) {
        activeCloseBtn.click()
        return
      }

      // 3. Navigation hierarchy or App Exit
      const currentPath = window.location.pathname
      if (currentPath === '/login' || currentPath === '/' || currentPath === '/admin' || currentPath === '/app') {
        CapApp.exitApp()
      } else if (canGoBack) {
        navigate(-1)
      } else {
        CapApp.exitApp()
      }
    })

    return () => {
      listenerPromise.then((l) => l.remove())
    }
  }, [navigate])

  return null
}

export function App() {
  return (
    <BrowserRouter>
      <NativeBackButtonHandler />
      <AuthProvider>
        <MandatoryPasswordGuard />
        <AppUpdateBanner />
        <Routes>
          <Route path="/login" element={<LoginPageWrapper />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route path="/app" element={<UserRoute />} />
          <Route path="/" element={<RootDispatcher />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}


export default App
