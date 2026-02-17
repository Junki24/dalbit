import { Link } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import type { UserSettings } from '@/types'

interface SettingsNotificationsProps {
  user: User | null
  userSettings: UserSettings | null
  updateUserSettings: (settings: Partial<UserSettings>) => Promise<void>
  showToast: (msg: string, type: 'success' | 'error') => void
  isSupported: boolean
  permission: NotificationPermission | 'default'
  requestPermission: () => Promise<boolean>
  subscribeToPush: () => Promise<boolean>
  onTestNotification: () => Promise<void>
  onServerPushTest: () => Promise<void>
}

export function SettingsNotifications({
  user,
  userSettings,
  updateUserSettings,
  showToast,
  isSupported,
  permission,
  requestPermission,
  subscribeToPush,
  onTestNotification,
  onServerPushTest,
}: SettingsNotificationsProps) {
  return (
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
             onClick={onTestNotification}
             style={{ marginTop: '8px' }}
           >
             🔔 테스트 알림 보내기
           </button>
           {user?.email === 'junki7051@gmail.com' && (
              <>
                <button
                  className="btn-export"
                  onClick={onServerPushTest}
                  style={{ marginTop: '8px' }}
                >
                  🚀 서버 푸시 테스트
                </button>
                <Link to="/admin" className="btn-export" style={{ marginTop: '8px', display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                  🛡️ 관리자 대시보드
                </Link>
              </>
            )}
         </>
       )}
       <p className="settings-hint">
         매일 저녁 9시에 주기 상태에 맞는 스마트 알림을 받습니다.
         앱을 닫아도 알림이 도착합니다.
       </p>
     </div>
  )
}
