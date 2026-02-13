import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isConfigured } = useAuth()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-moon">🌙</div>
        <p>로딩 중...</p>
      </div>
    )
  }

  if (!isConfigured) {
    return (
      <div className="loading-screen">
        <div className="loading-moon">⚠️</div>
        <h2>Supabase 설정 필요</h2>
        <p style={{ maxWidth: 320, textAlign: 'center', lineHeight: 1.6 }}>
          .env 파일에 VITE_SUPABASE_URL과<br />
          VITE_SUPABASE_ANON_KEY를 설정하세요.
        </p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
