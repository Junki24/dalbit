import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import './OnboardingPage.css'

export function OnboardingPage() {
  const { user, userSettings, updateUserSettings, signOut } = useAuth()
  const navigate = useNavigate()

  // 이미 온보딩 완료한 사용자가 이 페이지에 온 경우 → 홈으로
  if (userSettings?.health_data_consent) {
    navigate('/', { replace: true })
    return null
  }
  const [gender, setGender] = useState<'female' | 'male'>('female')
  const [displayName, setDisplayName] = useState('')
  const [cycleLength, setCycleLength] = useState(28)
  const [periodLength, setPeriodLength] = useState(5)
  const [inviteCode, setInviteCode] = useState('')
  const [inviteError, setInviteError] = useState(false)
  const [consent, setConsent] = useState(false)
  const [saving, setSaving] = useState(false)

  const VALID_INVITE_CODE = '0427'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (inviteCode !== VALID_INVITE_CODE) {
      setInviteError(true)
      return
    }
    if (!consent || !user) return

    setSaving(true)
    try {
      await updateUserSettings({
        user_id: user.id,
        display_name: displayName || null,
        gender,
        average_cycle_length: gender === 'female' ? cycleLength : 28,
        average_period_length: gender === 'female' ? periodLength : 5,
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
        {/* Invite Code */}
        <div className="form-group">
          <label htmlFor="inviteCode">초대 코드</label>
          <input
            id="inviteCode"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="초대 코드를 입력하세요"
            value={inviteCode}
            onChange={(e) => {
              setInviteCode(e.target.value)
              setInviteError(false)
            }}
            className={`form-input ${inviteError ? 'form-input--error' : ''}`}
            autoComplete="off"
          />
          {inviteError && (
            <span className="form-error">초대 코드가 올바르지 않습니다</span>
          )}
          <span className="form-hint">달빛을 사용하려면 초대 코드가 필요합니다</span>
        </div>

        {/* Gender Selection */}
        <div className="form-group">
          <label>사용 모드 선택</label>
          <div className="gender-select">
            <button
              type="button"
              className={`gender-btn ${gender === 'female' ? 'gender-btn--active' : ''}`}
              onClick={() => setGender('female')}
            >
              <span className="gender-btn-icon">🌸</span>
              <span className="gender-btn-label">여성</span>
              <span className="gender-btn-desc">주기 기록 및 관리</span>
            </button>
            <button
              type="button"
              className={`gender-btn ${gender === 'male' ? 'gender-btn--active' : ''}`}
              onClick={() => setGender('male')}
            >
              <span className="gender-btn-icon">💙</span>
              <span className="gender-btn-label">남성</span>
              <span className="gender-btn-desc">파트너 주기 확인</span>
            </button>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="displayName">표시 이름</label>
          <input
            id="displayName"
            type="text"
            placeholder={gender === 'female' ? '예: 지은' : '예: 준기'}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="form-input"
          />
        </div>

        {gender === 'female' && (
        <>
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
        </>
        )}

        <div className="consent-section">
          <h3>{gender === 'female' ? '건강 정보 수집·이용 동의' : '파트너 정보 열람 동의'}</h3>
          <div className="consent-info">
            {gender === 'female' ? (
              <>
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
              </>
            ) : (
              <>
                <p>달빛에서 파트너의 다음 정보를 열람할 수 있습니다:</p>
                <ul>
                  <li>현재 주기 단계</li>
                  <li>다음 생리 예측일</li>
                  <li>배란일 및 가임기 정보</li>
                  <li>주기별 행동 요령</li>
                </ul>
                <p>
                  파트너의 상세 증상, 메모 등 민감한 정보는 공유되지 않습니다.
                  파트너가 공유를 해제하면 더 이상 열람할 수 없습니다.
                </p>
              </>
            )}
          </div>
          <label className="consent-checkbox">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>
              {gender === 'female'
                ? '건강 정보 수집·이용에 동의합니다 (필수)'
                : '파트너 정보 열람에 동의합니다 (필수)'}
            </span>
          </label>
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={!consent || !inviteCode || saving}
        >
          {saving ? '저장 중...' : '시작하기'}
        </button>
      </form>

      <button
        className="onboarding-signout"
        onClick={async () => {
          await signOut()
          navigate('/login', { replace: true })
        }}
      >
        다른 계정으로 로그인
      </button>
    </div>
  )
}
