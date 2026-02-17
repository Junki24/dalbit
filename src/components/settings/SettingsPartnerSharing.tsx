import { Link } from 'react-router-dom'

interface SettingsPartnerSharingProps {
  isMale: boolean
  inviteCode: string | null
  showCopied: boolean
  onGenerateInvite: () => Promise<void>
  onCopyInvite: () => Promise<void>
}

export function SettingsPartnerSharing({
  isMale,
  inviteCode,
  showCopied,
  onGenerateInvite,
  onCopyInvite,
}: SettingsPartnerSharingProps) {
  return (
    <div className="settings-section">
      <h3 className="settings-section-title">💑 {isMale ? '파트너 연결' : '파트너 공유'}</h3>
      {isMale ? (
        <>
          <p className="settings-desc">
            파트너에게 초대 링크를 보내거나, 파트너로부터 링크를 받아 연결할 수 있어요.
          </p>
          {inviteCode ? (
            <div className="invite-result">
              <span className="invite-code">{inviteCode}</span>
              <button className="btn-copy" onClick={onCopyInvite}>
                {showCopied ? '복사됨! ✓' : '링크 복사'}
              </button>
            </div>
          ) : (
            <button className="btn-invite" onClick={onGenerateInvite}>
              초대 링크 생성
            </button>
          )}
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
              <button className="btn-copy" onClick={onCopyInvite}>
                {showCopied ? '복사됨! ✓' : '링크 복사'}
              </button>
            </div>
          ) : (
            <button className="btn-invite" onClick={onGenerateInvite}>
              초대 링크 생성
            </button>
          )}
          <Link to="/partner" className="btn-partner-view">
            💑 파트너 페이지 보기
          </Link>
        </>
      )}
    </div>
  )
}
