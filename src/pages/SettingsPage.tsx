import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useNotifications } from '@/hooks/useNotifications'
import { usePeriods } from '@/hooks/usePeriods'
import { useSymptoms } from '@/hooks/useSymptoms'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import './SettingsPage.css'

export function SettingsPage() {
  const { user, userSettings, signOut, updateUserSettings } = useAuth()
  const { showToast, confirm } = useToast()
  const { theme, toggleTheme } = useTheme()
  const { requestPermission, isSupported, permission } = useNotifications()
  const { periods } = usePeriods()
  const { symptoms } = useSymptoms()
  const [displayName, setDisplayName] = useState(userSettings?.display_name ?? '')
  const [cycleLength, setCycleLength] = useState(userSettings?.average_cycle_length ?? 28)
  const [periodLength, setPeriodLength] = useState(userSettings?.average_period_length ?? 5)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showCopied, setShowCopied] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSaveSettings = async () => {
    setSaving(true)
    await updateUserSettings({
      display_name: displayName || null,
      average_cycle_length: cycleLength,
      average_period_length: periodLength,
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

    const exportData = {
      exported_at: new Date().toISOString(),
      user_email: user?.email,
      settings: userSettings,
      periods: allPeriods,
      symptoms,
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
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const { error } = await supabase.from('partner_sharing').insert({
      owner_id: user.id,
      invite_code: code,
      invite_expires_at: expiresAt.toISOString(),
      permission_level: 'read',
      accepted: false,
    })

    if (!error) {
      setInviteCode(code)
    }
  }

  const handleDeleteAllData = async () => {
    if (!user || !isSupabaseConfigured) return

    const confirmed = await confirm({
      title: '⚠️ 데이터 삭제',
      message: '정말 모든 데이터를 삭제하시겠습니까?\n\n삭제되는 항목:\n• 모든 생리 기록\n• 모든 증상 기록\n• 모든 메모\n• 파트너 공유 설정\n\n이 작업은 되돌릴 수 없습니다.',
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
      if (!data.periods && !data.symptoms && !data.settings) {
        showToast('올바른 달빛 백업 파일이 아닙니다.', 'error')
        return
      }

      const confirmed = await confirm({
        title: '📤 데이터 복원',
        message: `다음 데이터를 복원합니다:\n\n• 생리 기록: ${data.periods?.length ?? 0}건\n• 증상 기록: ${data.symptoms?.length ?? 0}건\n${data.settings ? '• 설정 정보 포함' : ''}\n\n기존 데이터와 병합됩니다.`,
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

      // Import settings
      if (data.settings) {
        await updateUserSettings({
          display_name: data.settings.display_name ?? null,
          average_cycle_length: data.settings.average_cycle_length ?? 28,
          average_period_length: data.settings.average_period_length ?? 5,
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

  const handleCopyInvite = async () => {
    if (!inviteCode) return
    const url = `${window.location.origin}/invite/${inviteCode}`
    await navigator.clipboard.writeText(url)
    setShowCopied(true)
    setTimeout(() => setShowCopied(false), 2000)
  }

  return (
    <div className="settings-page">
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
      </div>

      {/* Cycle Settings */}
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
        <button
          className="btn-save"
          onClick={handleSaveSettings}
          disabled={saving}
        >
          {saving ? '저장 중...' : '설정 저장'}
        </button>
      </div>

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
            <span className={`theme-toggle-track ${theme === 'light' ? 'theme-toggle-track--light' : ''}`}>
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
              <span className={`theme-toggle-track ${userSettings?.notifications_enabled ? 'theme-toggle-track--light' : ''}`}>
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
        <p className="settings-hint">
          매일 저녁 9시에 오늘의 기록을 남기라는 리마인더를 받습니다.
        </p>
      </div>

      {/* Partner Sharing */}
      <div className="settings-section">
        <h3 className="settings-section-title">💑 파트너 공유</h3>
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
      </div>

      {/* Data */}
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

      {/* Danger Zone */}
      <div className="settings-section settings-section--danger">
        <h3 className="settings-section-title">⚠️ 위험 구역</h3>
        <p className="settings-desc">
          모든 데이터를 삭제합니다. 이 작업은 되돌릴 수 없습니다.
        </p>
        <button className="btn-delete-all" onClick={handleDeleteAllData}>
          🗑️ 전체 데이터 삭제
        </button>
      </div>

      {/* Sign Out */}
      <button className="btn-signout" onClick={signOut}>
        로그아웃
      </button>

      <p className="settings-version">달빛 v1.0.0</p>
    </div>
  )
}
