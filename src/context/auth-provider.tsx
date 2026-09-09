import React, { useState, useEffect, useCallback } from 'react'
import { AuthContextRepository, type UserContextResult } from '../repositories/auth-context-repository'
import { supabase } from '../lib/supabase'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [context, setContext] = useState<UserContextResult | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshContext = useCallback(async () => {
    setLoading(true)
    const res = await AuthContextRepository.getCurrentUserContext()
    setContext(res)
    setLoading(false)
    return res
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setContext({ status: 'UNAUTHENTICATED' })
  }, [])

  useEffect(() => {
    let isMounted = true

    AuthContextRepository.getCurrentUserContext().then((res) => {
      if (isMounted) {
        setContext(res)
        setLoading(false)
      }
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        if (isMounted) {
          setContext({ status: 'UNAUTHENTICATED' })
          setLoading(false)
        }
      } else {
        AuthContextRepository.getCurrentUserContext().then((res) => {
          if (isMounted) {
            setContext(res)
            setLoading(false)
          }
        })
      }
    })

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ context, loading, refreshContext, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

