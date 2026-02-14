import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import './InvitePage.css'

type InviteStatus = 'loading' | 'login_required' | 'valid' | 'expired' | 'already_accepted' | 'error' | 'accepted' | 'own_invite'

export function InvitePage() {
  const { code } = useParams<{ code: string }>()
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [status, setStatus] = useState<InviteStatus>('loading')
  const [ownerName, setOwnerName] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      setStatus('login_required')
      return
    }

    if (!code || !isSupabaseConfigured) {
      setStatus('error')
      return
    }

    // Validate invite
    async function validateInvite() {
      try {
        const { data, error } = await supabase
          .from('partner_sharing')
          .select('*')
          .eq('invite_code', code)
          .single()

        if (error || !data) {
          setStatus('error')
          return
        }

        // Check if already accepted
        if (data.accepted) {
          setStatus('already_accepted')
          return
        }

        // Check expiry
        if (new Date(data.invite_expires_at) < new Date()) {
          setStatus('expired')
          return
        }

        // Check if inviting yourself
        if (data.owner_id === user!.id) {
          setStatus('own_invite')
          return
        }

        // Fetch owner display name
        const { data: ownerSettings } = await supabase
          .from('user_settings')
          .select('display_name')
          .eq('user_id', data.owner_id)
          .single()

        if (ownerSettings?.display_name) {
          setOwnerName(ownerSettings.display_name)
        }

        setStatus('valid')
      } catch (err) {
        console.error('[달빛] 초대 검증 실패:', err)
        setStatus('error')
      }
    }

    validateInvite()

    // Timeout fallback: if still loading after 10s, show error
    const timeout = setTimeout(() => {
      setStatus((prev) => prev === 'loading' ? 'error' : prev)
    }, 10000)

    return () => clearTimeout(timeout)
  }, [code, user, authLoading])

  const handleAccept = async () => {
    if (!user || !code) return
    setAccepting(true)

    try {
      // Re-validate before accepting to prevent race conditions
      const { data: invite, error: checkError } = await supabase
        .from('partner_sharing')
        .select('*')
        .eq('invite_code', code)
        .single()

      if (checkError || !invite) {
        showToast('초대 정보를 확인할 수 없습니다.', 'error')
        setStatus('error')
        setAccepting(false)
        return
      }

      if (invite.accepted) {
        setStatus('already_accepted')
        setAccepting(false)
        return
      }

      if (new Date(invite.invite_expires_at) < new Date()) {
        setStatus('expired')
        setAccepting(false)
        return
      }

      const { error } = await supabase
        .from('partner_sharing')
        .update({
          partner_user_id: user.id,
          accepted: true,
        })
        .eq('invite_code', code)
        .eq('accepted', false)

      if (error) {
        console.error('[달빛] 초대 수락 실패:', error)
        showToast('초대 수락에 실패했습니다. 다시 시도해주세요.', 'error')
        setStatus('error')
        setAccepting(false)
        return
      }

      setStatus('accepted')
      showToast('파트너와 연결되었습니다! 🎉', 'success')
    } catch (err) {
      console.error('[달빛] 초대 수락 오류:', err)
      showToast('오류가 발생했습니다.', 'error')
      setStatus('error')
    } finally {
      setAccepting(false)
    }
  }

  const handleLogin = () => {
    // Store invite code for after login
    sessionStorage.setItem('dalbit-pending-invite', code ?? '')
    navigate('/login')
  }

  return (
    <div className="invite-page">
      <div className="invite-card">
        <span className="invite-icon">💑</span>

        {status === 'loading' && (
          <>
            <h1>초대 확인 중...</h1>
            <p className="invite-desc">잠시만 기다려주세요</p>
          </>
        )}

        {status === 'login_required' && (
          <>
            <h1>파트너 초대</h1>
            <p className="invite-desc">
              초대를 수락하려면 먼저 로그인해주세요.
            </p>
            <button className="btn-primary" onClick={handleLogin}>
              로그인하기
            </button>
          </>
        )}

        {status === 'valid' && (
          <>
            <h1>파트너 초대</h1>
            <p className="invite-desc">
              {ownerName ? (
                <><strong>{ownerName}</strong>님이 생리주기 정보를 공유하려 합니다.</>
              ) : (
                <>파트너가 생리주기 정보를 공유하려 합니다.</>
              )}
            </p>
            <div className="invite-permissions">
              <h3>공유되는 정보</h3>
              <ul>
                <li>현재 주기 단계</li>
                <li>다음 생리 예측일</li>
                <li>배란일 및 가임기</li>
              </ul>
              <p className="invite-note">
                상세 증상 기록이나 메모는 공유되지 않습니다.
              </p>
            </div>
            <button
              className="btn-primary"
              onClick={handleAccept}
              disabled={accepting}
            >
              {accepting ? '수락 중...' : '초대 수락하기'}
            </button>
          </>
        )}

        {status === 'accepted' && (
          <>
            <h1>연결 완료! 🎉</h1>
            <p className="invite-desc">
              파트너와 성공적으로 연결되었습니다.
            </p>
            <button className="btn-primary" onClick={() => navigate('/')}>
              홈으로 이동
            </button>
          </>
        )}

        {status === 'expired' && (
          <>
            <h1>만료된 초대</h1>
            <p className="invite-desc">
              이 초대 링크는 만료되었습니다. 파트너에게 새 초대 링크를 요청하세요.
            </p>
            <button className="btn-primary" onClick={() => navigate('/')}>
              홈으로 이동
            </button>
          </>
        )}

         {status === 'already_accepted' && (
           <>
             <h1>이미 수락된 초대</h1>
             <p className="invite-desc">
               이 초대는 이미 수락되었습니다.
             </p>
             <button className="btn-primary" onClick={() => navigate('/')}>
               홈으로 이동
             </button>
           </>
         )}

         {status === 'own_invite' && (
           <>
             <h1>내 초대 링크</h1>
             <p className="invite-desc">
               이것은 본인의 초대 링크입니다.<br />
               파트너에게 공유해주세요!
             </p>
             <button className="btn-primary" onClick={() => navigate('/settings')}>
               설정으로 이동
             </button>
           </>
         )}

         {status === 'error' && (
          <>
            <h1>잘못된 초대</h1>
            <p className="invite-desc">
              유효하지 않은 초대 링크입니다. 링크를 다시 확인해주세요.
            </p>
            <button className="btn-primary" onClick={() => navigate('/')}>
              홈으로 이동
            </button>
          </>
        )}
      </div>
    </div>
  )
}
