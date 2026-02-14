import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useNotifications } from '@/hooks/useNotifications'
import { usePeriods } from '@/hooks/usePeriods'
import { useSymptoms } from '@/hooks/useSymptoms'
import { useMedications, useMedicationIntakes } from '@/hooks/useMedications'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { MigrationSection } from '@/components/MigrationSection'
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
  const [importing, setImporting] = useState(false)
  const [devCommentOpen, setDevCommentOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(periods.length === 0)
  const [shareResult, setShareResult] = useState<'copied' | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
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
  }

  const handleExportData = async () => {
    // 내보내기에는 soft-deleted 포함 — 완전한 백업
    let allPeriods = periods
    if (user && isSupabaseConfigured) {
      const { data } = await supabase
        .from('periods')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false })
      if (data) allPeriods = data
    }

    // Fetch all medication intakes (not just today's)
    let allIntakes = medicationIntakes
    if (user && isSupabaseConfigured) {
      const { data } = await supabase
        .from('medication_intakes')
        .select('*')
        .eq('user_id', user.id)
        .order('taken_at', { ascending: false })
      if (data) allIntakes = data
    }

    const exportData = {
      exported_at: new Date().toISOString(),
      user_email: user?.email,
      settings: userSettings,
      periods: allPeriods,
      symptoms,
      medications,
      medication_intakes: allIntakes,
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dalbit-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
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
      setTimeout(() => window.location.reload(), 1500)
    } catch (err) {
      console.error('데이터 삭제 오류:', err)
      showToast('삭제 중 오류가 발생했습니다.', 'error')
    }
  }

  const handleImportData = async () => {
    const file = fileInputRef.current?.files?.[0]
    if (!file || !user || !isSupabaseConfigured) return

    setImporting(true)
    try {
      const text = await file.text()
      const data = JSON.parse(text)

      // Validate structure
      if (!data.periods && !data.symptoms && !data.settings && !data.medications) {
        showToast('올바른 달빛 백업 파일이 아닙니다.', 'error')
        return
      }

      const confirmed = await confirm({
        title: '📤 데이터 복원',
        message: `다음 데이터를 복원합니다:\n\n• 생리 기록: ${data.periods?.length ?? 0}건\n• 증상 기록: ${data.symptoms?.length ?? 0}건\n• 약 정보: ${data.medications?.length ?? 0}건\n• 복용 기록: ${data.medication_intakes?.length ?? 0}건\n${data.settings ? '• 설정 정보 포함' : ''}\n\n기존 데이터와 병합됩니다.`,
        confirmText: '복원',
        cancelText: '취소',
      })
      if (!confirmed) return

      let importedCount = 0

      // Import periods
      if (data.periods?.length > 0) {
        const periodsToImport = data.periods.map((p: Record<string, unknown>) => ({
          id: p.id,
          user_id: user.id,
          start_date: p.start_date,
          end_date: p.end_date ?? null,
          flow_intensity: p.flow_intensity ?? null,
          flow_intensities: (p.flow_intensities as Record<string, string>) ?? {},
          deleted_at: p.deleted_at ?? null,
        }))
        const { error } = await supabase
          .from('periods')
          .upsert(periodsToImport, { onConflict: 'id' })
        if (!error) importedCount += periodsToImport.length
      }

      // Import symptoms
      if (data.symptoms?.length > 0) {
        const symptomsToImport = data.symptoms.map((s: Record<string, unknown>) => ({
          id: s.id,
          user_id: user.id,
          date: s.date,
          symptom_type: s.symptom_type,
          severity: s.severity ?? 3,
          notes: s.notes ?? null,
        }))
        const { error } = await supabase
          .from('symptoms')
          .upsert(symptomsToImport, { onConflict: 'id' })
        if (!error) importedCount += symptomsToImport.length
      }

      // Import medications
      if (data.medications?.length > 0) {
        const medsToImport = data.medications.map((m: Record<string, unknown>) => ({
          id: m.id,
          user_id: user.id,
          name: m.name,
          type: m.type ?? 'otc',
          form: m.form ?? null,
          strength: m.strength ?? null,
          hospital: m.hospital ?? null,
          doctor: m.doctor ?? null,
          prescribed_date: m.prescribed_date ?? null,
          prescription_notes: m.prescription_notes ?? null,
          prescription_days: m.prescription_days ?? null,
          notes: m.notes ?? null,
          is_active: m.is_active ?? true,
        }))
        const { error } = await supabase
          .from('medications')
          .upsert(medsToImport, { onConflict: 'id' })
        if (!error) importedCount += medsToImport.length
      }

      // Import medication intakes
      if (data.medication_intakes?.length > 0) {
        const intakesToImport = data.medication_intakes.map((i: Record<string, unknown>) => ({
          id: i.id,
          user_id: user.id,
          medication_id: i.medication_id ?? null,
          medication_name: i.medication_name,
          taken_at: i.taken_at,
          dosage: i.dosage ?? null,
          note: i.note ?? null,
        }))
        const { error } = await supabase
          .from('medication_intakes')
          .upsert(intakesToImport, { onConflict: 'id' })
        if (!error) importedCount += intakesToImport.length
      }

      // Import settings
      if (data.settings) {
        await updateUserSettings({
          display_name: data.settings.display_name ?? null,
          average_cycle_length: data.settings.average_cycle_length ?? 28,
          average_period_length: data.settings.average_period_length ?? 5,
          prediction_months: data.settings.prediction_months ?? 3,
          gender: data.settings.gender ?? 'female',
        })
      }

      showToast(`${importedCount}건의 데이터를 복원했습니다.`, 'success')
      setTimeout(() => window.location.reload(), 1500)
    } catch (err) {
      console.error('데이터 복원 오류:', err)
      showToast('파일을 읽는 중 오류가 발생했습니다. JSON 형식을 확인해주세요.', 'error')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
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
          <label>표시 이름</label>
          <input
            type="text"
            className="form-input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="이름 입력"
          />
        </div>
        <div className="settings-field">
          <label>사용 모드</label>
          <div className="gender-mode-toggle">
            <button
              className={`gender-mode-btn ${!isMale ? 'gender-mode-btn--active' : ''}`}
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
        {guideOpen && (
          <div className="guide-content">
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
      <div className="settings-section">
        <h3 className="settings-section-title">🔔 알림</h3>
        <div className="settings-field">
          <label>기록 리마인더</label>
          {!isSupported ? (
            <span className="settings-value">미지원 브라우저</span>
          ) : permission === 'granted' ? (
            <button
              className="theme-toggle"
              onClick={async () => {
                const enabled = !userSettings?.notifications_enabled
                await updateUserSettings({ notifications_enabled: enabled })
                showToast(enabled ? '알림이 활성화되었습니다.' : '알림이 비활성화되었습니다.', 'success')
              }}
            >
              <span className={`theme-toggle-track ${userSettings?.notifications_enabled ? 'theme-toggle-track--active' : ''}`}>
                <span className="theme-toggle-thumb" />
              </span>
            </button>
          ) : permission === 'denied' ? (
            <span className="settings-value">알림 차단됨</span>
          ) : (
            <button
              className="btn-invite"
              style={{ width: 'auto', padding: '8px 16px', fontSize: '0.8rem' }}
              onClick={async () => {
                const granted = await requestPermission()
                if (granted) {
                  await updateUserSettings({ notifications_enabled: true })
                  await subscribeToPush()
                  showToast('알림이 활성화되었습니다!', 'success')
                } else {
                  showToast('알림 권한이 거부되었습니다.', 'error')
                }
              }}
            >
              알림 허용
            </button>
           )}
         </div>
         {permission === 'granted' && userSettings?.notifications_enabled && (
           <>
             <button
               className="btn-export"
               onClick={handleTestNotification}
               style={{ marginTop: '8px' }}
             >
               🔔 테스트 알림 보내기
             </button>
             {user?.email === 'junki7051@gmail.com' && (
               <button
                 className="btn-export"
                 onClick={handleServerPushTest}
                 style={{ marginTop: '8px' }}
               >
                 🚀 서버 푸시 테스트
               </button>
             )}
           </>
         )}
         <p className="settings-hint">
           매일 저녁 9시에 주기 상태에 맞는 스마트 알림을 받습니다.
           앱을 닫아도 알림이 도착합니다.
         </p>
       </div>

      {/* Partner Sharing */}
      <div className="settings-section">
        <h3 className="settings-section-title">💑 {isMale ? '파트너 연결' : '파트너 공유'}</h3>
        {isMale ? (
          <>
            <p className="settings-desc">
              파트너로부터 초대 링크를 받아 수락하면 주기 정보를 확인할 수 있어요.
            </p>
            <Link to="/" className="btn-partner-view">
              💑 파트너 페이지 보기
            </Link>
          </>
        ) : (
          <>
            <p className="settings-desc">
              파트너에게 초대 링크를 보내면 읽기 전용으로 주기 정보를 공유할 수 있어요.
            </p>
            {inviteCode ? (
              <div className="invite-result">
                <span className="invite-code">{inviteCode}</span>
                <button className="btn-copy" onClick={handleCopyInvite}>
                  {showCopied ? '복사됨! ✓' : '링크 복사'}
                </button>
              </div>
            ) : (
              <button className="btn-invite" onClick={handleGenerateInvite}>
                초대 링크 생성
              </button>
            )}
            <Link to="/partner" className="btn-partner-view">
              💑 파트너 페이지 보기
            </Link>
          </>
        )}
      </div>

      {/* Data (female only) */}
      {!isMale && (
      <>
      <div className="settings-section">
        <h3 className="settings-section-title">📦 데이터 관리</h3>
        <button className="btn-export" onClick={handleExportData}>
          📥 내 데이터 다운로드 (JSON)
        </button>
        <p className="settings-hint">
          기록된 모든 생리주기, 증상, 설정 데이터를 JSON 파일로 내보냅니다.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImportData}
          style={{ display: 'none' }}
          aria-label="데이터 복원 파일 선택"
        />
        <button
          className="btn-import"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
        >
          {importing ? '복원 중...' : '📤 데이터 복원 (JSON)'}
        </button>
        <p className="settings-hint">
          이전에 내보낸 JSON 백업 파일에서 데이터를 복원합니다.
        </p>
      </div>

      {/* Migration from other apps */}
      <MigrationSection />
      </>
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
