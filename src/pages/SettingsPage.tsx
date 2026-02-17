import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useNotifications } from '@/hooks/useNotifications'
import { usePeriods } from '@/hooks/usePeriods'
import { useSymptoms } from '@/hooks/useSymptoms'
import { useMedications, useMedicationIntakes } from '@/hooks/useMedications'
import { useHaptic } from '@/hooks/useHaptic'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { SettingsNotifications } from '@/components/settings/SettingsNotifications'
import { SettingsPartnerSharing } from '@/components/settings/SettingsPartnerSharing'
import { SettingsDataManagement } from '@/components/settings/SettingsDataManagement'
import './SettingsPage.css'

export function SettingsPage() {
  const { user, userSettings, signOut, updateUserSettings } = useAuth()
  const { showToast, confirm } = useToast()
  const { theme, toggleTheme } = useTheme()
  const { requestPermission, subscribeToPush, isSupported, permission } = useNotifications()
  const { periods } = usePeriods()
  const { symptoms } = useSymptoms()
  const { medications } = useMedications()
  const { intakes: medicationIntakes } = useMedicationIntakes()
  const [displayName, setDisplayName] = useState(userSettings?.display_name ?? '')
  const [cycleLength, setCycleLength] = useState(userSettings?.average_cycle_length ?? 28)
  const [periodLength, setPeriodLength] = useState(userSettings?.average_period_length ?? 5)
  const [predictionMonths, setPredictionMonths] = useState(userSettings?.prediction_months ?? 3)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showCopied, setShowCopied] = useState(false)
  const [devCommentOpen, setDevCommentOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(periods.length === 0)
  const [shareResult, setShareResult] = useState<'copied' | null>(null)
  const { vibrate } = useHaptic()
  const isMale = userSettings?.gender === 'male'

  const handleSaveSettings = async () => {
    setSaving(true)
    await updateUserSettings({
      display_name: displayName || null,
      average_cycle_length: cycleLength,
      average_period_length: periodLength,
      prediction_months: predictionMonths,
    })
    setSaving(false)
    vibrate('success')
  }

  const handleGenerateInvite = async () => {
    if (!user || !isSupabaseConfigured) return
    try {
      // Use crypto for better randomness when available
      const array = new Uint8Array(6)
      crypto.getRandomValues(array)
      const code = Array.from(array, b => b.toString(36).padStart(2, '0')).join('').substring(0, 8).toUpperCase()

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      const { error } = await supabase.from('partner_sharing').insert({
        owner_id: user.id,
        invite_code: code,
        invite_expires_at: expiresAt.toISOString(),
        permission_level: 'read',
        accepted: false,
      })

      if (error) {
        console.error('[달빛] 초대 코드 생성 실패:', error)
        showToast('초대 코드 생성에 실패했습니다. 다시 시도해주세요.', 'error')
        return
      }

      setInviteCode(code)
      showToast('초대 링크가 생성되었습니다!', 'success')
      vibrate('success')
    } catch (err) {
      console.error('[달빛] 초대 코드 생성 오류:', err)
      showToast('오류가 발생했습니다.', 'error')
    }
  }

  const handleDeleteAllData = async () => {
    if (!user || !isSupabaseConfigured) return

    const confirmed = await confirm({
      title: '⚠️ 데이터 삭제',
      message: '정말 모든 데이터를 삭제하시겠습니까?\n\n삭제되는 항목:\n• 모든 생리 기록\n• 모든 증상 기록\n• 모든 메모\n• 모든 약 복용 기록\n• 파트너 공유 설정\n\n이 작업은 되돌릴 수 없습니다.',
      confirmText: '삭제',
      cancelText: '취소',
      danger: true,
    })
    if (!confirmed) return

    const doubleConfirm = await confirm({
      title: '마지막 확인',
      message: '정말 삭제하시겠습니까?\n데이터를 먼저 내보내기(백업)하시는 것을 추천합니다.',
      confirmText: '삭제 진행',
      cancelText: '돌아가기',
      danger: true,
    })
    if (!doubleConfirm) return

    try {
      await Promise.all([
        supabase.from('medication_intakes').delete().eq('user_id', user.id),
        supabase.from('medications').delete().eq('user_id', user.id),
        supabase.from('periods').delete().eq('user_id', user.id),
        supabase.from('symptoms').delete().eq('user_id', user.id),
        supabase.from('daily_notes').delete().eq('user_id', user.id),
        supabase.from('partner_sharing').delete().eq('owner_id', user.id),
      ])
      showToast('모든 데이터가 삭제되었습니다.', 'success')
      vibrate('heavy')
      setTimeout(() => window.location.reload(), 1500)
    } catch (err) {
      console.error('데이터 삭제 오류:', err)
      showToast('삭제 중 오류가 발생했습니다.', 'error')
    }
  }

  const handleShareApp = async () => {
    const shareUrl = window.location.origin
    const shareData = {
      title: '달빛 — 생리주기 트래커',
      text: '커플을 위한 생리주기 트래킹 앱이에요. 무료로 사용할 수 있습니다!',
      url: shareUrl,
    }
    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(shareUrl)
        setShareResult('copied')
        setTimeout(() => setShareResult(null), 2000)
      }
    } catch {
      // User cancelled share or clipboard failed
      try {
        await navigator.clipboard.writeText(shareUrl)
        setShareResult('copied')
        setTimeout(() => setShareResult(null), 2000)
      } catch { /* ignore */ }
    }
  }

  const handleCopyInvite = async () => {
    if (!inviteCode) return
    const url = `${window.location.origin}/invite/${inviteCode}`
    await navigator.clipboard.writeText(url)
    setShowCopied(true)
    setTimeout(() => setShowCopied(false), 2000)
  }

  const handleTestNotification = async () => {
    try {
      const reg = await navigator.serviceWorker.ready
      await reg.showNotification('달빛 테스트 🌙', {
        body: '알림이 정상적으로 도착했습니다!',
        icon: '/pwa-192.png',
        badge: '/pwa-144.png',
        tag: 'dalbit-test',
      })
      showToast('테스트 알림을 보냈습니다!', 'success')
    } catch {
      showToast('알림 전송에 실패했습니다.', 'error')
    }
  }

  const handleServerPushTest = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('send-notifications', {
        method: 'POST',
      })

      if (error) {
        showToast(`서버 푸시 실패: ${error.message ?? '알 수 없는 오류'}`, 'error')
      } else {
        showToast(`서버 푸시 결과: ${data?.sent ?? 0}건 발송`, 'success')
      }
    } catch {
      showToast('서버 푸시 테스트 실패', 'error')
    }
  }

   return (
    <div className="settings-page">
      {/* Developer Comment (collapsible, top) */}
      <div className="settings-section dev-comment">
        <button
          className="guide-toggle"
          onClick={() => setDevCommentOpen((v) => !v)}
        >
          <h3 className="settings-section-title" style={{ marginBottom: 0 }}>💌 개발자의 말</h3>
          <span className={`guide-arrow ${devCommentOpen ? 'guide-arrow--open' : ''}`}>›</span>
        </button>
        {devCommentOpen && (
          <div className="dev-comment-body">
            <p className="dev-comment-text">
              안녕하세요, 개발자 홍준기입니다.
            </p>
            <p className="dev-comment-text">
              아내 유림이가 생리주기 앱을 좀 더 편하게, 함께 볼 수 있으면 좋겠다는 마음에서 달빛을 만들게 되었어요.
            </p>
            <p className="dev-comment-text">
              이 앱은 무료로 운영되고 있어서 부담 없이 사용하셔도 됩니다. 아래 공유 버튼으로 주변에 알려주시면 큰 힘이 돼요!
            </p>
          </div>
        )}
      </div>

      {/* Profile */}
      <div className="settings-section">
        <h3 className="settings-section-title">👤 프로필</h3>
        <div className="settings-field">
          <label>이메일</label>
          <span className="settings-value">{user?.email ?? '-'}</span>
        </div>
        <div className="settings-field">
          <label htmlFor="settings-display-name">표시 이름</label>
          <input
            id="settings-display-name"
            type="text"
            className="form-input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="이름 입력"
          />
        </div>
        <div className="settings-field">
          <label>사용 모드</label>
          <div className="gender-mode-toggle" role="radiogroup" aria-label="사용 모드 선택">
            <button
              className={`gender-mode-btn ${!isMale ? 'gender-mode-btn--active' : ''}`}
              role="radio"
              aria-checked={!isMale}
              aria-label="여성 모드"
              onClick={async () => {
                if (isMale) {
                  const ok = await confirm({
                    title: '모드 변경',
                    message: '여성 모드로 전환하시겠습니까?\n주기 기록 및 관리 기능을 사용할 수 있습니다.',
                    confirmText: '전환',
                    cancelText: '취소',
                  })
                  if (ok) {
                    await updateUserSettings({ gender: 'female' })
                    showToast('여성 모드로 전환되었습니다.', 'success')
                    setTimeout(() => window.location.reload(), 500)
                  }
                }
              }}
            >
              🌸 여성
            </button>
            <button
              className={`gender-mode-btn ${isMale ? 'gender-mode-btn--active' : ''}`}
              role="radio"
              aria-checked={isMale}
              aria-label="남성 모드"
              onClick={async () => {
                if (!isMale) {
                  const ok = await confirm({
                    title: '모드 변경',
                    message: '남성 모드로 전환하시겠습니까?\n파트너의 주기 정보만 확인할 수 있습니다.',
                    confirmText: '전환',
                    cancelText: '취소',
                  })
                  if (ok) {
                    await updateUserSettings({ gender: 'male' })
                    showToast('남성 모드로 전환되었습니다.', 'success')
                    setTimeout(() => window.location.reload(), 500)
                  }
                }
              }}
            >
              💙 남성
            </button>
          </div>
        </div>
      </div>

      {/* Guide */}
      <div className="settings-section">
        <button
          className="guide-toggle"
          onClick={() => setGuideOpen((v) => !v)}
        >
          <h3 className="settings-section-title" style={{ marginBottom: 0 }}>📖 사용 가이드</h3>
          <span className={`guide-arrow ${guideOpen ? 'guide-arrow--open' : ''}`}>›</span>
        </button>
        <Link to="/guide" className="settings-guide-link">📖 전체 사용 가이드 보기</Link>
        {guideOpen && (
          <div className="guide-content">
            {isMale ? (
              <>
                <div className="guide-item">
                  <span className="guide-icon">💑</span>
                  <div>
                    <strong>홈</strong>
                    <p>파트너의 현재 주기 상태, D-Day, 컨디션을 확인하고 맞춤 행동 요령을 볼 수 있어요.</p>
                  </div>
                </div>
                <div className="guide-item">
                  <span className="guide-icon">📅</span>
                  <div>
                    <strong>캘린더</strong>
                    <p>파트너의 생리일, 예상 생리일, 가임기, 배란일을 캘린더에서 한눈에 확인해요. 나의 관계 기록도 함께 표시돼요.</p>
                  </div>
                </div>
                <div className="guide-item">
                  <span className="guide-icon">✏️</span>
                  <div>
                    <strong>기록</strong>
                    <p>관계 기록을 남기고 파트너의 주기 상태를 함께 확인할 수 있어요. 날짜를 좌우로 넘겨 다른 날짜도 기록해요.</p>
                  </div>
                </div>
                <div className="guide-item">
                  <span className="guide-icon">🎁</span>
                  <div>
                    <strong>추천</strong>
                    <p>파트너의 주기 단계에 맞는 행동 요령과 선물 추천을 받아보세요.</p>
                  </div>
                </div>
                <div className="guide-item">
                  <span className="guide-icon">📊</span>
                  <div>
                    <strong>커플 대시보드</strong>
                    <p>관계 트렌드, 주기별 패턴, 임신 계획 도구를 한 곳에서 확인해요. 홈 화면 하단에서 접근할 수 있어요.</p>
                  </div>
                </div>
                <div className="guide-item">
                  <span className="guide-icon">🔔</span>
                  <div>
                    <strong>알림</strong>
                    <p>파트너의 생리 예정일, 가임기 시작, 배란일 등을 미리 알려줘요. 매일 저녁 9시에 스마트 알림을 받아요.</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="guide-item">
                  <span className="guide-icon">🏠</span>
                  <div>
                    <strong>홈</strong>
                    <p>오늘의 주기 상태, D-day, 컨디션 인사이트를 한눈에 확인해요. 주간 미니 캘린더에서 이번 주 예측도 볼 수 있어요.</p>
                  </div>
                </div>
                <div className="guide-item">
                  <span className="guide-icon">📅</span>
                  <div>
                    <strong>캘린더</strong>
                    <p>생리일(빨강), 예상 생리일(연빨강), 가임기(파랑), 배란일(보라)이 색으로 구분돼요. 날짜를 탭하면 상세 정보를 확인하고 기록 페이지로 이동할 수 있어요. 하단에 주기 기록 표도 있어요.</p>
                  </div>
                </div>
                <div className="guide-item">
                  <span className="guide-icon">✏️</span>
                  <div>
                    <strong>기록</strong>
                    <p>생리 시작/종료, 유량, 증상, 약 복용, 관계일, 메모를 한 화면에서 기록해요. 날짜를 좌우로 넘기면 다른 날짜도 기록할 수 있어요.</p>
                    <p style={{ marginTop: 6, fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>💡 생리 기간은 기본 5일로 예측되지만, 종료 버튼을 눌러 실제 종료일을 기록하면 예측이 더 정확해져요!</p>
                  </div>
                </div>
                <div className="guide-item">
                  <span className="guide-icon">📊</span>
                  <div>
                    <strong>통계</strong>
                    <p>평균 주기/기간, 증상 패턴, 관계일 트렌드를 분석해요. PDF 리포트로 내보내기도 가능해요.</p>
                  </div>
                </div>
                <div className="guide-item">
                  <span className="guide-icon">💑</span>
                  <div>
                    <strong>파트너 공유</strong>
                    <p>설정에서 초대 링크를 생성하면 파트너가 읽기 전용으로 주기 정보를 확인할 수 있어요. 파트너에게 맞춤 행동 요령도 제공돼요.</p>
                  </div>
                </div>
                <div className="guide-item">
                  <span className="guide-icon">📱</span>
                  <div>
                    <strong>다른 앱에서 가져오기</strong>
                    <p>기존에 사용하던 생리주기 앱(Flo, Clue, 봄 캘린더 등)의 스크린샷을 설정 → 다른 앱에서 가져오기에서 업로드하면 AI가 자동으로 기록을 분석해서 가져와요.</p>
                  </div>
                </div>
                <div className="guide-item">
                  <span className="guide-icon">🔮</span>
                  <div>
                    <strong>주기 예측</strong>
                    <p>기록이 쌓일수록 예측이 정확해져요. 설정에서 예측 개월 수(1~5)를 조절할 수 있어요.</p>
                  </div>
                </div>
                <div className="guide-item">
                  <span className="guide-icon">🔔</span>
                  <div>
                    <strong>알림</strong>
                    <p>알림을 켜면 매일 저녁 9시에 주기 상태에 맞는 스마트 알림을 받아요. 생리 예정, 배란일, 가임기 시작 등을 미리 알려줘요.</p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Cycle Settings (female only) */}
      {!isMale && (
      <div className="settings-section">
        <h3 className="settings-section-title">🔄 주기 설정</h3>
        <div className="settings-field">
          <label>평균 생리 주기</label>
          <div className="compact-number-input">
            <button onClick={() => setCycleLength((v) => Math.max(20, v - 1))} aria-label="주기 줄이기">−</button>
            <span>{cycleLength}일</span>
            <button onClick={() => setCycleLength((v) => Math.min(45, v + 1))} aria-label="주기 늘리기">+</button>
          </div>
        </div>
        <div className="settings-field">
          <label>평균 생리 기간</label>
          <div className="compact-number-input">
            <button onClick={() => setPeriodLength((v) => Math.max(2, v - 1))} aria-label="기간 줄이기">−</button>
            <span>{periodLength}일</span>
            <button onClick={() => setPeriodLength((v) => Math.min(10, v + 1))} aria-label="기간 늘리기">+</button>
          </div>
        </div>
        <div className="settings-field">
          <label>예측 개월 수</label>
          <div className="compact-number-input">
            <button onClick={() => setPredictionMonths((v) => Math.max(1, v - 1))} aria-label="예측 줄이기">−</button>
            <span>{predictionMonths}개월</span>
            <button onClick={() => setPredictionMonths((v) => Math.min(5, v + 1))} aria-label="예측 늘리기">+</button>
          </div>
        </div>
        <p className="settings-hint">
          캘린더에 표시할 예측 주기 수입니다. 1~5개월 범위에서 설정할 수 있습니다.
        </p>
        <button
          className="btn-save"
          onClick={handleSaveSettings}
          disabled={saving}
        >
          {saving ? '저장 중...' : '설정 저장'}
        </button>
      </div>
      )}

      {/* Theme */}
      <div className="settings-section">
        <h3 className="settings-section-title">🎨 테마</h3>
        <div className="settings-field">
          <label>{theme === 'dark' ? '🌙 다크 모드' : '☀️ 라이트 모드'}</label>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`${theme === 'dark' ? '라이트' : '다크'} 모드로 전환`}
          >
            <span className={`theme-toggle-track ${theme === 'dark' ? 'theme-toggle-track--active' : ''}`}>
              <span className="theme-toggle-thumb" />
            </span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      <SettingsNotifications
        user={user}
        userSettings={userSettings}
        updateUserSettings={updateUserSettings}
        showToast={showToast}
        isSupported={isSupported}
        permission={permission}
        requestPermission={requestPermission}
        subscribeToPush={subscribeToPush}
        onTestNotification={handleTestNotification}
        onServerPushTest={handleServerPushTest}
      />

      {/* Partner Sharing */}
      <SettingsPartnerSharing
        isMale={isMale}
        inviteCode={inviteCode}
        showCopied={showCopied}
        onGenerateInvite={handleGenerateInvite}
        onCopyInvite={handleCopyInvite}
      />

      {/* Data (female only) */}
      {!isMale && (
        <SettingsDataManagement
          user={user}
          userSettings={userSettings}
          updateUserSettings={updateUserSettings}
          showToast={showToast}
          confirm={confirm}
          periods={periods}
          symptoms={symptoms}
          medications={medications}
          medicationIntakes={medicationIntakes}
        />
      )}

      {/* Privacy */}
      <div className="settings-section">
        <h3 className="settings-section-title">🔒 개인정보</h3>
        <p className="settings-desc">
          달빛은 생리주기 기록에 필요한 최소한의 데이터만 수집합니다.
          데이터는 제3자에게 제공되지 않으며, 언제든지 삭제할 수 있습니다.
        </p>
        {userSettings?.consent_date && (
          <p className="settings-hint">
            건강정보 수집 동의일: {new Date(userSettings.consent_date).toLocaleDateString('ko-KR')}
          </p>
        )}
      </div>

      {/* Danger Zone (female only) */}
      {!isMale && (
      <div className="settings-section settings-section--danger">
        <h3 className="settings-section-title">⚠️ 위험 구역</h3>
        <p className="settings-desc">
          모든 데이터를 삭제합니다. 이 작업은 되돌릴 수 없습니다.
        </p>
        <button className="btn-delete-all" onClick={handleDeleteAllData}>
          🗑️ 전체 데이터 삭제
        </button>
      </div>
      )}

      {/* Share + Feedback */}
      <div className="settings-bottom-actions">
        <button className="btn-share-app" onClick={handleShareApp}>
          {shareResult === 'copied' ? '✓ 링크가 복사되었어요!' : '🔗 달빛 공유하기'}
        </button>
        <a
          className="btn-feedback"
          href="mailto:junki7051@gmail.com?subject=[달빛] 피드백&body=안녕하세요! 달빛 사용 중 의견이 있어 연락드려요.%0A%0A"
        >
          💬 피드백 보내기
        </a>
      </div>

      {/* Sign Out */}
      <button className="btn-signout" onClick={signOut}>
        로그아웃
      </button>

      <p className="settings-version">달빛 v1.7.0</p>
    </div>
  )
}
