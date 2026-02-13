import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { UserSettings } from '@/types'

interface AuthContextValue {
  user: User | null
  userSettings: UserSettings | null
  loading: boolean
  isConfigured: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  updateUserSettings: (settings: Partial<UserSettings>) => Promise<void>
  refetchSettings: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUserSettings = useCallback(async (userId: string) => {
    if (!isSupabaseConfigured) return
    const { data } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single()
    if (data) setUserSettings(data as UserSettings)
  }, [])

  const refetchSettings = useCallback(async () => {
    if (user) await fetchUserSettings(user.id)
  }, [user, fetchUserSettings])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        fetchUserSettings(currentUser.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        const currentUser = session?.user ?? null
        setUser(currentUser)
        if (currentUser) {
          fetchUserSettings(currentUser.id)
        } else {
          setUserSettings(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchUserSettings])

  const signInWithGoogle = useCallback(async () => {
    if (!isSupabaseConfigured) {
      alert('Supabase 설정이 필요합니다. .env 파일을 확인하세요.')
      return
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) console.error('로그인 오류:', error.message)
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setUserSettings(null)
  }, [])

  const updateUserSettings = useCallback(
    async (updates: Partial<UserSettings>) => {
      if (!user || !isSupabaseConfigured) return
      const { data, error } = await supabase
        .from('user_settings')
        .upsert(
          {
            user_id: user.id,
            ...userSettings,
            ...updates,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
        .select()
        .single()

      if (error) {
        console.error('설정 업데이트 오류:', error.message)
        return
      }
      if (data) setUserSettings(data as UserSettings)
    },
    [user, userSettings]
  )

  return (
    <AuthContext.Provider
      value={{
        user,
        userSettings,
        loading,
        isConfigured: isSupabaseConfigured,
        signInWithGoogle,
        signOut,
        updateUserSettings,
        refetchSettings,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
