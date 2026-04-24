import { createContext, useContext, useMemo, ReactNode } from 'react'

interface PlayerUser {
  id: string
}

interface AuthContextValue {
  user: PlayerUser | null
  loading: boolean
}

const STORAGE_KEY = 'praem_player_id'

const getOrCreatePlayerId = (): string => {
  if (typeof window === 'undefined') {
    // SSR / non-browser fallback — should not happen in this app.
    return '00000000-0000-0000-0000-000000000000'
  }
  let id = window.localStorage.getItem(STORAGE_KEY)
  if (!id) {
    id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    window.localStorage.setItem(STORAGE_KEY, id)
  }
  return id
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: false })

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const value = useMemo<AuthContextValue>(() => {
    const id = getOrCreatePlayerId()
    return { user: { id }, loading: false }
  }, [])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
