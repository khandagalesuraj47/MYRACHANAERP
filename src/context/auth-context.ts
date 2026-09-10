import { createContext, useContext } from 'react'
import type { UserContextResult } from '../repositories/auth-context-repository'

export interface AuthState {
  context: UserContextResult | null
  loading: boolean
  refreshContext: (showLoader?: boolean) => Promise<UserContextResult>
  signOut: () => Promise<void>
  hasPermission: (permissionCode: string) => boolean
  canExecuteTask: (taskCode: string) => boolean
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const auth = useContext(AuthContext)
  if (!auth) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return auth
}

