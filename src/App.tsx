import { useEffect, useRef, useCallback, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ToastContainer, ConfirmDialog } from '@/components/Toast'
import { Layout } from '@/components/Layout'
import { LoginPage } from '@/pages/LoginPage'

/**
 * Lazy import with auto-reload on chunk load failure.
 * After deploy, old cached pages reference chunk hashes that no longer exist.
 * On failure, reload once to get fresh HTML with correct chunk URLs.
 */
function lazyWithReload<T extends { default: React.ComponentType }>(
  factory: () => Promise<T>
): React.LazyExoticComponent<T['default']> {
  return lazy(() =>
    factory().catch(() => {
      // Chunk failed to load — likely stale cache after deploy.
      // Reload once (sessionStorage flag prevents infinite loop).
      const key = 'dalbit-chunk-reload'
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1')
        window.location.reload()
      }
      // If already reloaded once, let ErrorBoundary handle it
      return factory()
    })
  )
}

const OnboardingPage = lazyWithReload(() => import('@/pages/OnboardingPage').then(m => ({ default: m.OnboardingPage })))
const HomePage = lazyWithReload(() => import('@/pages/HomePage').then(m => ({ default: m.HomePage })))
const CalendarPage = lazyWithReload(() => import('@/pages/CalendarPage').then(m => ({ default: m.CalendarPage })))
const RecordPage = lazyWithReload(() => import('@/pages/RecordPage').then(m => ({ default: m.RecordPage })))
const SettingsPage = lazyWithReload(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const StatsPage = lazyWithReload(() => import('@/pages/StatsPage').then(m => ({ default: m.StatsPage })))
const InvitePage = lazyWithReload(() => import('@/pages/InvitePage').then(m => ({ default: m.InvitePage })))
const PartnerPage = lazyWithReload(() => import('@/pages/PartnerPage').then(m => ({ default: m.PartnerPage })))
const RecommendPage = lazyWithReload(() => import('@/pages/RecommendPage').then(m => ({ default: m.RecommendPage })))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { userSettings, loading } = useAuth()
  if (loading) return null
  if (!userSettings?.health_data_consent) {
    return <Navigate to="/onboarding" replace />
  }
  return <>{children}</>
}

/** Male users see PartnerPage as home, female users see HomePage */
function GenderAwareHome() {
  const { userSettings } = useAuth()
  if (userSettings?.gender === 'male') return <PartnerPage />
  return <HomePage />
}

/** Redirect male users from female-only pages */
function FemaleOnlyRoute({ children }: { children: React.ReactNode }) {
  const { userSettings } = useAuth()
  if (userSettings?.gender === 'male') return <Navigate to="/" replace />
  return <>{children}</>
}

function AuthCallback() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const hasNavigated = useRef(false)

  const doNavigate = useCallback(() => {
    if (hasNavigated.current) return
    hasNavigated.current = true

    const pendingInvite = sessionStorage.getItem('dalbit-pending-invite')
    if (pendingInvite) {
      sessionStorage.removeItem('dalbit-pending-invite')
      navigate(`/invite/${pendingInvite}`, { replace: true })
    } else {
      navigate('/', { replace: true })
    }
  }, [navigate])

  // Auth 상태가 확정되면 즉시 이동
  useEffect(() => {
    if (!loading && user) {
      doNavigate()
    }
  }, [user, loading, doNavigate])

  // Fallback: PKCE 교환 최대 10초 대기 후 이동 (한 번만 설정)
  useEffect(() => {
    const timer = setTimeout(doNavigate, 10000)
    return () => clearTimeout(timer)
  }, [doNavigate])

  return (
    <div className="loading-screen">
      <div className="loading-moon">🌙</div>
      <p>로그인 중...</p>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <ToastContainer />
            <ConfirmDialog />
            <Suspense fallback={<div className="loading-screen"><div className="loading-moon">🌙</div><p>로딩 중...</p></div>}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/invite/:code" element={<InvitePage />} />
                <Route
                  path="/onboarding"
                  element={
                    <ProtectedRoute>
                      <OnboardingPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  element={
                    <ProtectedRoute>
                      <OnboardingGuard>
                        <Layout />
                      </OnboardingGuard>
                    </ProtectedRoute>
                  }
                >
                  <Route path="/" element={<GenderAwareHome />} />
                  <Route path="/calendar" element={<FemaleOnlyRoute><CalendarPage /></FemaleOnlyRoute>} />
                  <Route path="/record" element={<FemaleOnlyRoute><RecordPage /></FemaleOnlyRoute>} />
                  <Route path="/stats" element={<FemaleOnlyRoute><StatsPage /></FemaleOnlyRoute>} />
                  <Route path="/partner" element={<PartnerPage />} />
                  <Route path="/recommend" element={<FemaleOnlyRoute><RecommendPage /></FemaleOnlyRoute>} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
    </ThemeProvider>
  )
}
