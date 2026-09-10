import React, { useState, useEffect, useCallback } from 'react'
import { AuthContextRepository, type UserContextResult } from '../repositories/auth-context-repository'
import { supabase } from '../lib/supabase'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [context, setContext] = useState<UserContextResult | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshContext = useCallback(async (showLoader: boolean = false) => {
    if (showLoader) {
      setLoading(true)
    }
    try {
      const res = await AuthContextRepository.getCurrentUserContext()
      setContext(res)
      return res
    } finally {
      if (showLoader) {
        setLoading(false)
      }
    }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setContext({ status: 'UNAUTHENTICATED' })
    setLoading(false)
  }, [])

  useEffect(() => {
    let isMounted = true

    // 1. Check existing session from localStorage first
    supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
      if (!isMounted) return

      if (sessionError || !session) {
        console.log('[AuthDiagnostic] Initial getSession: No active session found.')
        setContext({ status: 'UNAUTHENTICATED' })
        setLoading(false)
      } else {
        console.log('[AuthDiagnostic] Initial getSession: Restoring session for user:', session.user.id)
        AuthContextRepository.getCurrentUserContext().then((res) => {
          if (isMounted) {
            setContext(res)
            setLoading(false)
          }
        })
      }
    }).catch((err) => {
      console.error('[AuthDiagnostic] getSession caught error:', err)
      if (isMounted) {
        setContext({ status: 'UNAUTHENTICATED' })
        setLoading(false)
      }
    })

    // 2. Listen to subsequent auth events (token refresh, sign in, sign out)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthDiagnostic] onAuthStateChange event:', event, 'user:', session?.user?.email)

      if (event === 'SIGNED_OUT') {
        if (isMounted) {
          setContext({ status: 'UNAUTHENTICATED' })
          setLoading(false)
        }
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session) {
          AuthContextRepository.getCurrentUserContext().then((res) => {
            if (isMounted) {
              setContext(res)
              setLoading(false)
            }
          })
        }
      }
    })

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  const hasPermission = useCallback((permissionCode: string): boolean => {
    if (!context || context.status !== 'SUCCESS') return false
    if (context.role === 'MASTER_ADMIN' || context.role === 'ADMIN' || context.baseRole === 'ADMIN') {
      return true
    }
    if (!context.permissions) return false
    return context.permissions.includes('*') || context.permissions.includes(permissionCode)
  }, [context])

  const canExecuteTask = useCallback((taskCode: string): boolean => {
    if (!context || context.status !== 'SUCCESS') return false
    if (context.role === 'MASTER_ADMIN' || context.role === 'ADMIN' || context.baseRole === 'ADMIN') {
      return true
    }
    if (!context.assignedTasks) return false
    return context.assignedTasks.some(
      t => t.code === taskCode && (t.canExecute || t.canInitiate)
    )
  }, [context])

  return (
    <AuthContext.Provider value={{ context, loading, refreshContext, signOut, hasPermission, canExecuteTask }}>
      {children}
    </AuthContext.Provider>
  )
}
