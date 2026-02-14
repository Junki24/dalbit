import { useCallback, useMemo } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { usePeriods } from '@/hooks/usePeriods'
import { useCyclePrediction } from '@/hooks/useCyclePrediction'
import { OfflineBanner } from '@/components/OfflineBanner'
import { usePageTransition } from '@/hooks/usePageTransition'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { useHaptic } from '@/hooks/useHaptic'
import './Layout.css'

const FEMALE_NAV_ITEMS = [
  { path: '/', icon: '🏠', label: '홈' },
  { path: '/calendar', icon: '📅', label: '캘린더' },
  { path: '/record', icon: '✏️', label: '기록' },
  { path: '/recommend', icon: '🎁', label: '추천' },
  { path: '/settings', icon: '⚙️', label: '설정' },
]

const MALE_NAV_ITEMS = [
  { path: '/', icon: '💑', label: '홈' },
  { path: '/recommend', icon: '🎁', label: '추천' },
  { path: '/settings', icon: '⚙️', label: '설정' },
]

function PageContent() {
  const { className } = usePageTransition()
  return (
    <div className={className}>
      <Outlet />
    </div>
  )
}

export function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { userSettings } = useAuth()
  const isMale = userSettings?.gender === 'male'
  const navItems = useMemo(() => isMale ? MALE_NAV_ITEMS : FEMALE_NAV_ITEMS, [isMale])
  const { periods } = usePeriods()
  const { phaseInfo } = useCyclePrediction(periods)
  const { vibrate } = useHaptic()

  const handleRefresh = useCallback(async () => {
    vibrate('light')
    await queryClient.invalidateQueries()
  }, [queryClient, vibrate])

  const { isRefreshing, pullDistance, handlers } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
  })

  return (
    <div className="layout">
      <header className="header">
        <h1 className="header-title">
          <span className="header-icon">🌙</span>
          달빛
        </h1>
        {phaseInfo && (
          <span
            className="phase-badge"
            style={{ backgroundColor: phaseInfo.color }}
          >
            {phaseInfo.phaseKo}
          </span>
        )}
      </header>

      <main
        className="main-content"
        {...handlers}
      >
        {/* Pull-to-refresh indicator */}
        {(pullDistance > 0 || isRefreshing) && (
          <div
            className="pull-indicator"
            style={{ height: pullDistance }}
          >
            <span className={`pull-spinner ${isRefreshing ? 'pull-spinner--active' : ''}`}>
              {isRefreshing ? '🔄' : '⬇️'}
            </span>
          </div>
        )}
        <OfflineBanner />
        <PageContent />
      </main>

      <nav className="bottom-nav" role="navigation" aria-label="메인 내비게이션">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <button
              key={item.path}
              className={`nav-item ${isActive ? 'nav-item--active' : ''}`}
              onClick={() => navigate(item.path)}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
