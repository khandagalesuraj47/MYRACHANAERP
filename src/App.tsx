import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { SignInPage } from './components/ui/sign-in-page'
import { ResetPasswordPage } from './components/ui/reset-password-page'
import { AdminDashboard } from './components/admin/admin-dashboard'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import type { User } from '@supabase/supabase-js'


function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-xs">
        Verifying authorization...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {

  const [authorized, setAuthorized] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: authData }) => {
      if (!authData.user) {
        setAuthorized(false)
        return
      }

      // Check organization_members for ADMIN role
      const { data: member, error } = await supabase
        .from('organization_members')
        .select('role, is_active')
        .eq('user_id', authData.user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()

      if (error || !member || member.role !== 'ADMIN') {
        setAuthorized(false)
      } else {
        setAuthorized(true)
      }
    })
  }, [])

  if (authorized === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-xs">
        Verifying administrator authorization...
      </div>
    )
  }

  if (!authorized) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

function EnterpriseLanding() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user)
      if (data.user) {
        const { data: member } = await supabase
          .from('organization_members')
          .select('role')
          .eq('user_id', data.user.id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle()

        if (member?.role === 'ADMIN') {
          setIsAdmin(true)
        }
      }
      setLoading(false)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 font-sans antialiased">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6 text-left">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-blue-400 bg-blue-950/80 border border-blue-800/80 px-2.5 py-1 rounded">
              ENTERPRISE ERP FOUNDATION
            </span>
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              AUTHENTICATED
            </span>
          </div>

          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Rachana Construction Limited
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Heavy Civil Engineering ERP Platform
          </p>
        </div>

        {/* Auth status panel */}
        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5 text-xs text-slate-300 font-mono">
          <div className="font-bold text-slate-200">Active Workspace Session:</div>
          {loading ? (
            <div className="text-slate-400">Loading session...</div>
          ) : user ? (
            <div className="space-y-1.5 text-emerald-400">
              <div>✓ Signed in as: <span className="text-white font-semibold">{user.email}</span></div>
              <div className="text-slate-400 text-[11px]">User ID: {user.id}</div>
              <div className="text-slate-400 text-[11px]">Last Sign In: {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Just now'}</div>
            </div>
          ) : (
            <div className="text-slate-400">
              Session terminated.
            </div>
          )}

          <div className="border-t border-slate-800 pt-2 text-slate-400 space-y-1">
            <div className="flex items-center gap-2">
              <span className={isSupabaseConfigured ? 'text-emerald-400' : 'text-amber-400'}>●</span>
              <span>Supabase Connection: {isSupabaseConfigured ? 'Configured & Active' : 'Pending Environment Variables'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">●</span>
              <span>Security Governance: Public Anon Client Only (Zero Secret Leakage)</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {isAdmin && (
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors cursor-pointer"
            >
              Open Admin Dashboard →
            </button>
          )}

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs transition-colors cursor-pointer"
          >
            Sign Out
          </button>

          <a
            href="https://github.com/khandagalesuraj47/MYRACHANAERP"
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-center font-medium text-xs transition-colors"
          >
            GitHub Repository
          </a>
        </div>
      </div>
    </div>
  )
}

function LoginPageWrapper() {
  const navigate = useNavigate()

  return (
    <SignInPage
      onSuccess={async () => {
        // Direct admin users to /admin, others to /
        const { data: authData } = await supabase.auth.getUser()
        if (authData.user) {
          const { data: member } = await supabase
            .from('organization_members')
            .select('role')
            .eq('user_id', authData.user.id)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle()

          if (member?.role === 'ADMIN') {
            navigate('/admin')
            return
          }
        }
        navigate('/')
      }}
      onNavigateHome={() => navigate('/')}
    />
  )
}

export function App() {
  return (
    <BrowserRouter>
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
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <EnterpriseLanding />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App



