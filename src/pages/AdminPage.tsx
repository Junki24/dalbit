import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import './AdminPage.css'

interface AdminUser {
  email: string
  signup_date: string
  last_login: string | null
  gender: string
  display_name: string
  period_count: number
  symptom_count: number
  intimacy_count: number
  med_count: number
  consented: boolean
  avg_cycle: number
  avg_period: number
}

interface GenderStat {
  gender: string
  count: number
}

interface AdminStats {
  total_users: number
  active_24h: number
  active_7d: number
  gender_stats: GenderStat[]
  users: AdminUser[]
}

export default function AdminPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: rpcError } = await supabase.rpc('get_admin_stats')
      if (rpcError) throw rpcError
      setStats(data as AdminStats)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '데이터를 불러올 수 없습니다'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    try {
      return format(new Date(dateStr), 'MM.dd HH:mm', { locale: ko })
    } catch {
      return '-'
    }
  }

  const formatFullDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    try {
      return format(new Date(dateStr), 'yy.MM.dd HH:mm', { locale: ko })
    } catch {
      return '-'
    }
  }

  const genderLabel = (g: string) => {
    if (g === 'female') return '여성'
    if (g === 'male') return '남성'
    return '미설정'
  }

  const genderBadgeClass = (g: string) => {
    if (g === 'female') return 'admin-badge admin-badge--female'
    if (g === 'male') return 'admin-badge admin-badge--male'
    return 'admin-badge admin-badge--unknown'
  }

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-loading">📊 대시보드 로딩 중...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="admin-page">
        <button className="admin-back-btn" onClick={() => navigate('/settings')}>
          ← 설정
        </button>
        <div className="admin-error">⚠️ {error}</div>
      </div>
    )
  }

  if (!stats) return null

  const femaleCount = stats.gender_stats.find(g => g.gender === 'female')?.count ?? 0
  const maleCount = stats.gender_stats.find(g => g.gender === 'male')?.count ?? 0

  return (
    <div className="admin-page">
      <button className="admin-back-btn" onClick={() => navigate('/settings')}>
        ← 설정으로
      </button>

      <div className="admin-header">
        <h2>🛡️ 관리자 대시보드</h2>
        <p>달빛 서비스 현황</p>
      </div>

      {/* Summary */}
      <div className="admin-summary">
        <div className="admin-stat-card">
          <div className="admin-stat-value">{stats.total_users}</div>
          <div className="admin-stat-label">전체 사용자</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-value">{stats.active_24h}</div>
          <div className="admin-stat-label">24시간 활성</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-value">{stats.active_7d}</div>
          <div className="admin-stat-label">7일 활성</div>
        </div>
      </div>

      {/* Gender */}
      <div className="admin-gender-row">
        <div className="admin-gender-card">
          <span className="admin-gender-icon">👩</span>
          <div className="admin-gender-info">
            <span className="admin-gender-count">{femaleCount}</span>
            <span className="admin-gender-label">여성</span>
          </div>
        </div>
        <div className="admin-gender-card">
          <span className="admin-gender-icon">👨</span>
          <div className="admin-gender-info">
            <span className="admin-gender-count">{maleCount}</span>
            <span className="admin-gender-label">남성</span>
          </div>
        </div>
      </div>

      {/* User Table */}
      <div className="admin-section">
        <div className="admin-section-title" style={{ justifyContent: 'space-between' }}>
          <span>👥 사용자 목록 ({stats.users.length})</span>
          <button
            className="admin-refresh-btn"
            onClick={fetchStats}
            disabled={loading}
          >
            🔄 새로고침
          </button>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>이메일</th>
                <th>성별</th>
                <th>가입일</th>
                <th>최근접속</th>
                <th>생리</th>
                <th>증상</th>
                <th>약</th>
                <th>동의</th>
              </tr>
            </thead>
            <tbody>
              {stats.users.map((user, i) => (
                <tr key={user.email}>
                  <td style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>{i + 1}</td>
                  <td className="admin-email">{user.email}</td>
                  <td>
                    <span className={genderBadgeClass(user.gender)}>
                      {genderLabel(user.gender)}
                    </span>
                  </td>
                  <td className="admin-date-cell">{formatFullDate(user.signup_date)}</td>
                  <td className="admin-date-cell">{formatDate(user.last_login)}</td>
                  <td className="admin-count-cell">{user.period_count || '-'}</td>
                  <td className="admin-count-cell">{user.symptom_count || '-'}</td>
                  <td className="admin-count-cell">{user.med_count || '-'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`admin-consent-dot admin-consent-dot--${user.consented ? 'yes' : 'no'}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
