import { useState, useEffect, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ToastContainer, ConfirmDialog } from '@/components/Toast'
import { Layout } from '@/components/Layout'
import { LoginPage } from '@/pages/LoginPage'

const OnboardingPage = lazy(() => import('@/pages/OnboardingPage').then(m => ({ default: m.OnboardingPage })))
const HomePage = lazy(() => import('@/pages/HomePage').then(m => ({ default: m.HomePage })))
const CalendarPage = lazy(() => import('@/pages/CalendarPage').then(m => ({ default: m.CalendarPage })))
const RecordPage = lazy(() => import('@/pages/RecordPage').then(m => ({ default: m.RecordPage })))
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const StatsPage = lazy(() => import('@/pages/StatsPage').then(m => ({ default: m.StatsPage })))
const InvitePage = lazy(() => import('@/pages/InvitePage').then(m => ({ default: m.InvitePage })))
const PartnerPage = lazy(() => import('@/pages/PartnerPage').then(m => ({ default: m.PartnerPage })))

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

function AuthCallback() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase의 detectSessionInUrl이 PKCE code를 교환할 시간을 확보
    // onAuthStateChange에서 SIGNED_IN 이벤트가 오면 user가 세팅됨
    if (!loading && user) {
      setReady(true)
    }
    // 5초 타임아웃 — 실패 시에도 홈으로 이동
    const timer = setTimeout(() => setReady(true), 5000)
    return () => clearTimeout(timer)
  }, [user, loading])

  useEffect(() => {
    if (!ready) return

    // 로그인 전 저장된 초대 코드가 있으면 초대 페이지로 리디렉트
    const pendingInvite = sessionStorage.getItem('dalbit-pending-invite')
    if (pendingInvite) {
      sessionStorage.removeItem('dalbit-pending-invite')
      navigate(`/invite/${pendingInvite}`, { replace: true })
    } else {
      navigate('/', { replace: true })
    }
  }, [ready, navigate])

  if (!ready) {
    return (
      <div className="loading-screen">
        <div className="loading-moon">🌙</div>
        <p>로그인 중...</p>
      </div>
    )
  }

  return null
}

export default function App() {
  return (
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
                  <Route path="/" element={<HomePage />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  <Route path="/record" element={<RecordPage />} />
                  <Route path="/stats" element={<StatsPage />} />
                  <Route path="/partner" element={<PartnerPage />} />
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
  )
}
