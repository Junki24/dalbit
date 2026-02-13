import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { usePeriods } from '@/hooks/usePeriods'
import { useSymptoms } from '@/hooks/useSymptoms'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import './SettingsPage.css'

export function SettingsPage() {
  const { user, userSettings, signOut, updateUserSettings } = useAuth()
  const { periods } = usePeriods()
  const { symptoms } = useSymptoms()
  const [displayName, setDisplayName] = useState(userSettings?.display_name ?? '')
  const [cycleLength, setCycleLength] = useState(userSettings?.average_cycle_length ?? 28)
  const [periodLength, setPeriodLength] = useState(userSettings?.average_period_length ?? 5)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showCopied, setShowCopied] = useState(false)

  const handleSaveSettings = async () => {
    setSaving(true)
    await updateUserSettings({
      display_name: displayName || null,
      average_cycle_length: cycleLength,
      average_period_length: periodLength,
    })
    setSaving(false)
  }

  const handleExportData = () => {
    const data = {
      exported_at: new Date().toISOString(),
      user_email: user?.email,
      settings: userSettings,
      periods,
      symptoms,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], {
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
            <button onClick={() => setCycleLength((v) => Math.max(20, v - 1))}>−</button>
            <span>{cycleLength}일</span>
            <button onClick={() => setCycleLength((v) => Math.min(45, v + 1))}>+</button>
          </div>
        </div>
        <div className="settings-field">
          <label>평균 생리 기간</label>
          <div className="compact-number-input">
            <button onClick={() => setPeriodLength((v) => Math.max(2, v - 1))}>−</button>
            <span>{periodLength}일</span>
            <button onClick={() => setPeriodLength((v) => Math.min(10, v + 1))}>+</button>
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

      {/* Sign Out */}
      <button className="btn-signout" onClick={signOut}>
        로그아웃
      </button>

      <p className="settings-version">달빛 v1.0.0</p>
    </div>
  )
}
