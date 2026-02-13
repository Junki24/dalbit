import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { usePeriods } from '@/hooks/usePeriods'
import { useCyclePrediction } from '@/hooks/useCyclePrediction'
import './Layout.css'

const NAV_ITEMS = [
  { path: '/', icon: '🏠', label: '홈' },
  { path: '/calendar', icon: '📅', label: '캘린더' },
  { path: '/record', icon: '✏️', label: '기록' },
  { path: '/settings', icon: '⚙️', label: '설정' },
]

export function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { periods } = usePeriods()
  const { phaseInfo } = useCyclePrediction(periods)

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

      <main className="main-content">
        <Outlet />
      </main>

      <nav className="bottom-nav">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <button
              key={item.path}
              className={`nav-item ${isActive ? 'nav-item--active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
