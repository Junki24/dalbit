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
    if (data) {
      // Self-heal: if user consented but consent_date is missing, set it to created_at
      if (data.health_data_consent && !data.consent_date) {
        const fixedDate = data.created_at ?? new Date().toISOString()
        await supabase
          .from('user_settings')
          .update({ consent_date: fixedDate })
          .eq('user_id', userId)
        data.consent_date = fixedDate
      }
      setUserSettings(data as UserSettings)
    }
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
      console.error('Supabase 설정이 필요합니다. .env 파일을 확인하세요.')
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

      // Preserve consent_date: once set, never overwrite
      const merged = {
        user_id: user.id,
        ...userSettings,
        ...updates,
        updated_at: new Date().toISOString(),
      }
      // If consent was already given, keep original date
      if (userSettings?.consent_date && !updates.consent_date) {
        merged.consent_date = userSettings.consent_date
      }

      const { data, error } = await supabase
        .from('user_settings')
        .upsert(merged, { onConflict: 'user_id' })
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
