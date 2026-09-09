import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { SignInPage } from './components/ui/sign-in-page'
import { ResetPasswordPage } from './components/ui/reset-password-page'
import { AdminDashboard } from './components/admin/admin-dashboard'
import { UserPortal } from './components/user/user-portal'
import { AuthProvider } from './context/auth-provider'
import { useAuth } from './context/auth-context'
import { MandatoryPasswordChangeModal } from './components/ui/mandatory-password-change-modal'

function WorkspaceLoadingScreen({ message = 'Loading your workspace...' }: { message?: string }) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 font-mono text-xs gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
      <p className="text-slate-300 font-medium">{message}</p>
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
  const { signOut, refreshContext } = useAuth()
  const navigate = useNavigate()
  const [retrying, setRetrying] = useState(false)

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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-sans antialiased select-none">
      <div className={`w-full max-w-md rounded-2xl border p-8 shadow-2xl space-y-6 text-left ${
        isPending
          ? 'border-amber-700/50 bg-slate-900/90'
          : isError
          ? 'border-rose-900/40 bg-slate-900/90'
          : 'border-slate-800 bg-slate-900/90'
      }`}>
        <div className="space-y-2">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-xs font-bold uppercase tracking-wider ${
            isPending
              ? 'bg-amber-950/80 border border-amber-800/80 text-amber-400'
              : isError
              ? 'bg-rose-950/80 border border-rose-800/80 text-rose-400'
              : 'bg-slate-800 border border-slate-700 text-slate-300'
          }`}>
            {isPending ? 'Pending Admin Approval' : isError ? 'Verification Error' : 'Access Restricted'}
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            {isPending ? 'Approval & Site Lock Required' : isError ? 'Database Query Error' : 'Organization Membership Required'}
          </h1>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            {message}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-400 space-y-1">
          <div>
            Status:{' '}
            <span className={isPending ? 'text-amber-400 font-semibold' : 'text-rose-400 font-semibold'}>
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
            className="flex-1 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-xs transition-colors cursor-pointer text-center"
          >
            {retrying ? 'Re-verifying...' : 'Retry'}
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex-1 py-2.5 px-4 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-300 font-medium text-xs transition-colors cursor-pointer text-center"
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

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MandatoryPasswordGuard />
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
