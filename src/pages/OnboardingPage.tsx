import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import './OnboardingPage.css'

export function OnboardingPage() {
  const { user, updateUserSettings } = useAuth()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [cycleLength, setCycleLength] = useState(28)
  const [periodLength, setPeriodLength] = useState(5)
  const [consent, setConsent] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!consent || !user) return

    setSaving(true)
    try {
      await updateUserSettings({
        user_id: user.id,
        display_name: displayName || null,
        average_cycle_length: cycleLength,
        average_period_length: periodLength,
        health_data_consent: true,
        consent_date: new Date().toISOString(),
        notifications_enabled: true,
      })
      navigate('/', { replace: true })
    } catch (err) {
      console.error('설정 저장 오류:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="onboarding-page">
      <div className="onboarding-header">
        <span className="onboarding-icon">🌙</span>
        <h1>달빛 시작하기</h1>
        <p>기본 설정을 완료해 주세요</p>
      </div>

      <form className="onboarding-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="displayName">표시 이름</label>
          <input
            id="displayName"
            type="text"
            placeholder="예: 지은"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="cycleLength">평균 생리 주기 (일)</label>
          <div className="number-input">
            <button
              type="button"
              onClick={() => setCycleLength((v) => Math.max(20, v - 1))}
              aria-label="주기 줄이기"
            >
              −
            </button>
            <input
              id="cycleLength"
              type="number"
              min={20}
              max={45}
              value={cycleLength}
              onChange={(e) => setCycleLength(Number(e.target.value))}
              className="form-input form-input--number"
            />
            <button
              type="button"
              onClick={() => setCycleLength((v) => Math.min(45, v + 1))}
              aria-label="주기 늘리기"
            >
              +
            </button>
          </div>
          <span className="form-hint">보통 24~35일 (기본값: 28일)</span>
        </div>

        <div className="form-group">
          <label htmlFor="periodLength">평균 생리 기간 (일)</label>
          <div className="number-input">
            <button
              type="button"
              onClick={() => setPeriodLength((v) => Math.max(2, v - 1))}
              aria-label="기간 줄이기"
            >
              −
            </button>
            <input
              id="periodLength"
              type="number"
              min={2}
              max={10}
              value={periodLength}
              onChange={(e) => setPeriodLength(Number(e.target.value))}
              className="form-input form-input--number"
            />
            <button
              type="button"
              onClick={() => setPeriodLength((v) => Math.min(10, v + 1))}
              aria-label="기간 늘리기"
            >
              +
            </button>
          </div>
          <span className="form-hint">보통 3~7일 (기본값: 5일)</span>
        </div>

        <div className="consent-section">
          <h3>건강 정보 수집·이용 동의</h3>
          <div className="consent-info">
            <p>달빛은 다음 건강 정보를 수집합니다:</p>
            <ul>
              <li>생리 시작일 및 종료일</li>
              <li>출혈량 정보</li>
              <li>신체 증상 기록</li>
              <li>기분 상태</li>
            </ul>
            <p>
              수집된 정보는 생리주기 예측 및 건강 기록 목적으로만 사용되며,
              제3자에게 제공되지 않습니다. 언제든지 설정에서 데이터를
              내보내거나 삭제할 수 있습니다.
            </p>
          </div>
          <label className="consent-checkbox">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>건강 정보 수집·이용에 동의합니다 (필수)</span>
          </label>
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={!consent || saving}
        >
          {saving ? '저장 중...' : '시작하기'}
        </button>
      </form>
    </div>
  )
}
