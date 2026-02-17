import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './GuidePage.css'

/* ── Phone Mockup Shell ── */
function PhoneMockup({ children }: { children: React.ReactNode }) {
  return (
    <div className="mockup-phone">
      <div className="mockup-statusbar">
        <span className="mockup-statusbar-time">9:41</span>
        <span className="mockup-statusbar-icons">●●● 🔋</span>
      </div>
      <div className="mockup-screen">{children}</div>
    </div>
  )
}

/* ── Section A: 시작하기 ── */
function GettingStartedSection() {
  return (
    <div className="guide-section" id="getting-started">
      <h3 className="guide-section-title">
        <span className="section-icon">🚀</span> 시작하기
      </h3>
      <div className="guide-steps">
        <div className="guide-step">
          <div className="guide-step-number">1</div>
          <div className="guide-step-text">
            <h4>회원가입</h4>
            <p>구글 계정으로 간편하게 로그인하세요. 별도 회원가입 없이 바로 시작할 수 있습니다.</p>
          </div>
        </div>
        <div className="guide-step">
          <div className="guide-step-number">2</div>
          <div className="guide-step-text">
            <h4>성별 선택</h4>
            <p>여성(생리주기 관리) 또는 남성(파트너 동행) 모드를 선택합니다. 설정에서 언제든 변경할 수 있어요.</p>
          </div>
        </div>
        <div className="guide-step">
          <div className="guide-step-number">3</div>
          <div className="guide-step-text">
            <h4>주기 설정</h4>
            <p>평균 생리 주기와 기간을 입력하면 달빛이 자동으로 예측을 시작합니다. 기록이 쌓일수록 더 정확해져요.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Mockup: Home 주기 원형 차트 ── */
function MockHome() {
  return (
    <PhoneMockup>
      <div className="mock-home">
        <div className="mock-cycle-ring">
          <div className="mock-cycle-inner">
            <div className="mock-cycle-day">15</div>
            <div className="mock-cycle-label">일째</div>
          </div>
        </div>
        <div className="mock-phase-card">
          <span className="mock-phase-name">황체기</span>
          <span className="mock-phase-desc">호르몬 변화가 시작되는 시기</span>
          <p className="mock-phase-tip">💡 PMS 증상이 나타날 수 있어요</p>
        </div>
        <div className="mock-weekly-strip">
          {['일','월','화','수','목','금','토'].map((d,i) => (
            <div key={d} className={`mock-weekly-day${i === 3 ? ' mock-weekly-day--today' : ''}`}>
              <span className="mock-weekly-name">{d}</span>
              <span className="mock-weekly-num">{12+i}</span>
            </div>
          ))}
        </div>
        <div className="mock-prediction-grid">
          <div className="mock-pred-card"><span className="mock-pred-icon">🩸</span><span className="mock-pred-label">다음 생리</span><span className="mock-pred-val">14일 후</span></div>
          <div className="mock-pred-card"><span className="mock-pred-icon">🥚</span><span className="mock-pred-label">배란 예정일</span><span className="mock-pred-val">2월 28일</span></div>
          <div className="mock-pred-card"><span className="mock-pred-icon">💫</span><span className="mock-pred-label">가임기</span><span className="mock-pred-val">2/24 ~ 2/28</span></div>
          <div className="mock-pred-card"><span className="mock-pred-icon">📏</span><span className="mock-pred-label">평균 주기</span><span className="mock-pred-val">28일</span></div>
        </div>
      </div>
    </PhoneMockup>
  )
}

/* ── Mockup: Calendar ── */
function MockCalendar() {
  const dayNames = ['일', '월', '화', '수', '목', '금', '토']
  const intimacyDays = [12, 22]
  const cells: { day: number; type?: string; heart?: boolean }[] = []
  for (let i = 1; i <= 28; i++) {
    let type = ''
    if (i >= 5 && i <= 9) type = 'period'
    else if (i === 18) type = 'ovulation'
    else if (i >= 16 && i <= 20) type = 'fertile'
    else if (i === 15) type = 'today'
    cells.push({ day: i, type, heart: intimacyDays.includes(i) })
  }

  return (
    <PhoneMockup>
      <div className="mock-calendar">
        <div className="mock-cal-header">2026년 2월</div>
        <div className="mock-cal-days">
          {dayNames.map((d) => (
            <div key={d} className="mock-cal-day-name">{d}</div>
          ))}
          <div />
          {cells.map((c) => (
            <div
              key={c.day}
              className={`mock-cal-cell${c.type ? ` mock-cal-cell--${c.type}` : ''}${c.heart ? ' mock-cal-cell--heart' : ''}`}
            >
              {c.day}
              {c.heart && <span className="mock-cal-heart">💚</span>}
            </div>
          ))}
        </div>
        <div className="mock-cal-legend">
          <div className="mock-legend-item">
            <div className="mock-legend-dot mock-legend-dot--period" />
            <span>생리</span>
          </div>
          <div className="mock-legend-item">
            <div className="mock-legend-dot mock-legend-dot--fertile" />
            <span>가임기</span>
          </div>
          <div className="mock-legend-item">
            <div className="mock-legend-dot mock-legend-dot--ovulation" />
            <span>배란일</span>
          </div>
          <div className="mock-legend-item">
            <span className="mock-legend-heart">💚</span>
            <span>관계</span>
          </div>
        </div>
      </div>
    </PhoneMockup>
  )
}

/* ── Mockup: Record ── */
function MockRecord() {
  return (
    <PhoneMockup>
      <div className="mock-record">
        <div className="mock-rec-tabs">
          <span className="mock-rec-tab mock-rec-tab--active">✏️ 기록</span>
          <span className="mock-rec-tab">📊 통계</span>
        </div>
        <div className="mock-record-date-nav">
          <span className="mock-date-arrow">‹</span>
          <span className="mock-record-date">2월 15일 (토)</span>
          <span className="mock-today-badge">오늘</span>
          <span className="mock-date-arrow">›</span>
        </div>
        <div className="mock-record-group">
          <div className="mock-record-label">🩸 생리 기록</div>
          <div className="mock-record-toggles">
            <span className="mock-toggle mock-toggle--active">생리 시작</span>
          </div>
        </div>
        <div className="mock-record-group">
          <div className="mock-record-label">📝 증상 기록</div>
          <div className="mock-record-sub-label">신체 증상</div>
          <div className="mock-record-toggles">
            <span className="mock-toggle mock-toggle--symptom">복통</span>
            <span className="mock-toggle mock-toggle--symptom">두통</span>
            <span className="mock-toggle">피로</span>
            <span className="mock-toggle">부종</span>
          </div>
          <div className="mock-record-sub-label">기분</div>
          <div className="mock-record-toggles">
            <span className="mock-toggle mock-toggle--active">😊 좋음</span>
            <span className="mock-toggle">😐 보통</span>
            <span className="mock-toggle">😢 우울</span>
          </div>
        </div>
        <div className="mock-record-group">
          <div className="mock-record-label">💊 약 복용</div>
          <div className="mock-record-toggles">
            <span className="mock-toggle mock-toggle--active">진통제</span>
            <span className="mock-toggle">피임약</span>
          </div>
        </div>
      </div>
    </PhoneMockup>
  )
}

/* ── Mockup: Stats ── */
function MockStats() {
  return (
    <PhoneMockup>
      <div className="mock-stats">
        <div className="mock-stat-cards">
          <div className="mock-stat-card">
            <div className="mock-stat-val">28.5일</div>
            <div className="mock-stat-lbl">평균 주기</div>
          </div>
          <div className="mock-stat-card">
            <div className="mock-stat-val">5.2일</div>
            <div className="mock-stat-lbl">평균 기간</div>
          </div>
          <div className="mock-stat-card">
            <div className="mock-stat-val">±2.1</div>
            <div className="mock-stat-lbl">주기 편차</div>
          </div>
          <div className="mock-stat-card">
            <div className="mock-stat-val">복통</div>
            <div className="mock-stat-lbl">최다 증상</div>
          </div>
        </div>
        <div className="mock-cycle-history">
          <div className="mock-history-title">📋 주기 이력</div>
          {[{ m: '1월', len: '28일', dur: '5일' }, { m: '12월', len: '27일', dur: '4일' }, { m: '11월', len: '29일', dur: '5일' }].map((c) => (
            <div key={c.m} className="mock-history-row">
              <span className="mock-history-month">{c.m}</span>
              <span className="mock-history-bar" />
              <span className="mock-history-detail">{c.len} / {c.dur}</span>
            </div>
          ))}
        </div>
        <div className="mock-chart-bars">
          {[65, 80, 70, 85, 75, 90, 72].map((h, i) => (
            <div key={i} className="mock-chart-bar" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    </PhoneMockup>
  )
}

/* ── Mockup: Recommend ── */
function MockRecommend() {
  return (
    <PhoneMockup>
      <div className="mock-recommend">
        <div className="mock-rec-header">
          <span>🎁</span>
          <span>제품 추천 설문</span>
        </div>
        <div className="mock-survey-step">
          <div className="mock-survey-num">1</div>
          <span className="mock-survey-q">어떤 제품을 사용하세요?</span>
          <div className="mock-survey-options">
            <span className="mock-survey-btn mock-survey-btn--active">생리대</span>
            <span className="mock-survey-btn">탐폰</span>
            <span className="mock-survey-btn">면생리대</span>
            <span className="mock-survey-btn">생리컵</span>
          </div>
        </div>
        <div className="mock-survey-step">
          <div className="mock-survey-num">2</div>
          <span className="mock-survey-q">피부 민감도는?</span>
          <div className="mock-survey-options">
            <span className="mock-survey-btn">둔감</span>
            <span className="mock-survey-btn mock-survey-btn--active">보통</span>
            <span className="mock-survey-btn">민감</span>
          </div>
        </div>
        <div className="mock-submit-btn">추천 받기</div>
      </div>
    </PhoneMockup>
  )
}

/* ── Mockup: Partner Home ── */
function MockPartnerHome() {
  return (
    <PhoneMockup>
      <div className="mock-partner-home">
        <div className="mock-partner-header">
          <span className="mock-partner-avatar">💑</span>
          <span className="mock-partner-title">파트너의 주기</span>
        </div>
        <div className="mock-dday-row">
          <div className="mock-dday-mini">
            <span className="mock-dday-emoji">🩸</span>
            <span className="mock-dday-val">D-7</span>
            <span className="mock-dday-desc">다음 생리까지</span>
          </div>
          <div className="mock-dday-mini">
            <span className="mock-dday-emoji">🥚</span>
            <span className="mock-dday-val">D-14</span>
            <span className="mock-dday-desc">배란일</span>
          </div>
        </div>
        <div className="mock-cycle-ring mock-cycle-ring--small">
          <div className="mock-cycle-inner">
            <div className="mock-cycle-day">21</div>
            <div className="mock-cycle-label">일째</div>
          </div>
        </div>
        <div className="mock-phase-card">
          <span className="mock-phase-name">황체기</span>
          <span className="mock-phase-desc">PMS 시작 가능 시기</span>
          <p className="mock-phase-tip">💡 따뜻한 음료를 준비해주세요</p>
        </div>
        <div className="mock-quick-actions">
          <span className="mock-quick-btn">📝 기록하기</span>
          <span className="mock-quick-btn">📅 캘린더</span>
          <span className="mock-quick-btn">💕 커플</span>
        </div>
      </div>
    </PhoneMockup>
  )
}

/* ── Mockup: Partner Calendar ── */
function MockPartnerCalendar() {
  const dayNames = ['일', '월', '화', '수', '목', '금', '토']
  const intimacyDays = [12, 22]
  const cells: { day: number; type?: string; heart?: boolean }[] = []
  for (let i = 1; i <= 28; i++) {
    let type = ''
    if (i >= 5 && i <= 9) type = 'period'
    else if (i === 18) type = 'ovulation'
    else if (i >= 16 && i <= 20) type = 'fertile'
    cells.push({ day: i, type, heart: intimacyDays.includes(i) })
  }
  return (
    <PhoneMockup>
      <div className="mock-calendar mock-partner-cal">
        <div className="mock-cal-header">파트너 주기 캘린더</div>
        <div className="mock-cal-days">
          {dayNames.map((d) => (
            <div key={d} className="mock-cal-day-name">{d}</div>
          ))}
          <div />
          {cells.map((c) => (
            <div
              key={c.day}
              className={`mock-cal-cell${c.type ? ` mock-cal-cell--${c.type}` : ''}${c.heart ? ' mock-cal-cell--heart' : ''}`}
            >
              {c.day}
              {c.heart && <span className="mock-cal-heart">💚</span>}
            </div>
          ))}
        </div>
        <div className="mock-cal-legend">
          <div className="mock-legend-item">
            <div className="mock-legend-dot mock-legend-dot--period" />
            <span>생리</span>
          </div>
          <div className="mock-legend-item">
            <div className="mock-legend-dot mock-legend-dot--fertile" />
            <span>가임기</span>
          </div>
          <div className="mock-legend-item">
            <div className="mock-legend-dot mock-legend-dot--ovulation" />
            <span>배란일</span>
          </div>
          <div className="mock-legend-item">
            <span className="mock-legend-heart">💚</span>
            <span>관계</span>
          </div>
        </div>
      </div>
    </PhoneMockup>
  )
}

/* ── Mockup: Partner Record ── */
function MockPartnerRecord() {
  return (
    <PhoneMockup>
      <div className="mock-partner-record">
        <div className="mock-pr-title-only">관계 기록</div>
        <div className="mock-record-date-nav">
          <span className="mock-date-arrow">‹</span>
          <span className="mock-record-date">2월 15일 (토)</span>
          <span className="mock-today-badge">오늘</span>
          <span className="mock-date-arrow">›</span>
        </div>
        <div className="mock-context-card">
          <span className="mock-phase-name">황체기</span>
          <span className="mock-context-text">파트너의 주기</span>
          <p className="mock-phase-tip">💡 컨디션이 예민할 수 있어요</p>
        </div>
        <div className="mock-record-group">
          <div className="mock-record-label">시간대</div>
          <div className="mock-time-selector">
            <div className="mock-time-btn">🌅 아침</div>
            <div className="mock-time-btn mock-time-btn--active">☀️ 오후</div>
            <div className="mock-time-btn">🌆 저녁</div>
            <div className="mock-time-btn">🌙 밤</div>
          </div>
        </div>
        <div className="mock-record-group">
          <div className="mock-record-label">피임 여부</div>
          <div className="mock-contra-row">
            <div className="mock-mini-toggle" />
            <div className="mock-record-toggles">
              <span className="mock-toggle mock-toggle--active">콘돔</span>
              <span className="mock-toggle">피임약</span>
            </div>
          </div>
        </div>
        <div className="mock-memo-area">
          <span className="mock-memo-placeholder">📝 메모를 입력하세요...</span>
        </div>
        <div className="mock-submit-btn mock-submit-btn--purple">💜 기록 저장</div>
      </div>
    </PhoneMockup>
  )
}

/* ── Mockup: Couples Dashboard ── */
function MockCouplesDashboard() {
  return (
    <PhoneMockup>
      <div className="mock-couples">
        <div className="mock-pr-header">
          <span className="mock-back-arrow">← 뒤로</span>
          <span className="mock-pr-title">커플 대시보드</span>
        </div>
        <div className="mock-couple-stat">
          <div className="mock-couple-card">
            <div className="cc-val">21/28일</div>
            <div className="cc-lbl">주기 Day</div>
          </div>
          <div className="mock-couple-card">
            <div className="cc-val">3회</div>
            <div className="cc-lbl">이번 주기 관계</div>
          </div>
          <div className="mock-couple-card">
            <div className="cc-val">D-7</div>
            <div className="cc-lbl">다음 생리까지</div>
          </div>
        </div>
        <div className="mock-trend-section">
          <div className="mock-trend-title">📊 월별 추이</div>
          {[{ m: '2월', w: 60, v: 3 }, { m: '1월', w: 80, v: 5 }, { m: '12월', w: 50, v: 2 }].map((r) => (
            <div key={r.m} className="mock-trend-row">
              <span className="mock-trend-month">{r.m}</span>
              <span className="mock-trend-bar" style={{ width: `${r.w}%` }} />
              <span className="mock-trend-count">{r.v}회</span>
            </div>
          ))}
        </div>
        <div className="mock-phase-dist">
          <div className="mock-trend-title">🔄 주기별 관계 분포</div>
          <div className="mock-phase-dist-grid">
            {[{ name: '생리기', cnt: '0회', pct: '0%', cls: 'period' }, { name: '난포기', cnt: '2회', pct: '40%', cls: 'fertile' }, { name: '배란기', cnt: '2회', pct: '40%', cls: 'ovulation' }, { name: '황체기', cnt: '1회', pct: '20%', cls: 'luteal' }].map((p) => (
              <div key={p.name} className={`mock-phase-dist-card mock-phase-dist-card--${p.cls}`}>
                <span className="mock-pd-name">{p.name}</span>
                <span className="mock-pd-cnt">{p.cnt}</span>
                <span className="mock-pd-pct">{p.pct}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mock-pregnancy-badge">
          <span className="preg-icon">🤰</span>
          <div>
            <div className="preg-text">임신 계획 모드</div>
            <div className="preg-sub">가임기에 맞춘 최적 시기 안내</div>
          </div>
          <div className="mock-mini-toggle" />
        </div>
      </div>
    </PhoneMockup>
  )
}

/* ── Section E: 파트너 연결 ── */
function PartnerConnectionSection() {
  return (
    <div className="guide-section" id="partner-connect">
      <h3 className="guide-section-title">
        <span className="section-icon">🔗</span> 파트너 연결
      </h3>
      <div className="guide-steps">
        <div className="guide-step">
          <div className="guide-step-number">1</div>
          <div className="guide-step-text">
            <h4>초대 링크 생성</h4>
            <p>설정 → 파트너 공유에서 초대 링크를 생성합니다. 링크는 7일간 유효해요.</p>
          </div>
        </div>
        <div className="guide-step">
          <div className="guide-step-number">2</div>
          <div className="guide-step-text">
            <h4>링크 공유</h4>
            <p>생성된 링크를 카카오톡, 문자 등으로 파트너에게 보내주세요.</p>
          </div>
        </div>
        <div className="guide-step">
          <div className="guide-step-number">3</div>
          <div className="guide-step-text">
            <h4>수락 완료</h4>
            <p>파트너가 링크를 클릭하고 로그인하면 자동으로 연결됩니다. 읽기 전용으로 주기 정보가 공유돼요.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Section F: 설정 & 팁 ── */
function SettingsTipsSection() {
  return (
    <div className="guide-section" id="settings-tips">
      <h3 className="guide-section-title">
        <span className="section-icon">⚙️</span> 설정 & 팁
      </h3>
      <div className="guide-tips-grid">
        <div className="guide-tip-card">
          <span className="tip-icon">🌙</span>
          <h4>다크/라이트 모드</h4>
          <p>설정에서 원하는 테마를 선택하세요. 눈이 편한 모드로 사용할 수 있어요.</p>
        </div>
        <div className="guide-tip-card">
          <span className="tip-icon">🔔</span>
          <h4>스마트 알림</h4>
          <p>매일 저녁 9시에 주기 상태에 맞는 맞춤 알림을 받아보세요.</p>
        </div>
        <div className="guide-tip-card">
          <span className="tip-icon">📦</span>
          <h4>데이터 관리</h4>
          <p>JSON으로 내보내기/가져오기가 가능해요. 다른 앱 데이터도 마이그레이션 할 수 있어요.</p>
        </div>
        <div className="guide-tip-card">
          <span className="tip-icon">🔮</span>
          <h4>예측 정확도</h4>
          <p>기록이 쌓일수록 예측이 정확해져요. 꾸준한 기록이 핵심입니다.</p>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   GuidePage — 메인 컴포넌트
   ═══════════════════════════════════════════ */
export function GuidePage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'female' | 'male'>('female')

  return (
    <div className="guide-page">
      {/* Header */}
      <header className="guide-header">
        <button className="guide-back-btn" onClick={() => navigate(-1)} aria-label="뒤로가기">
          ←
        </button>
        <h1 className="guide-header-title">
          <span className="guide-header-moon">🌙</span>
          달빛 사용 가이드
        </h1>
      </header>

      {/* Content */}
      <div className="guide-content-wrap">
        {/* Intro */}
        <div className="guide-intro">
          <span className="guide-intro-emoji">🌙</span>
          <h2>달빛에 오신 것을 환영해요</h2>
          <p>
            커플을 위한 생리주기 트래킹 앱입니다.<br />
            여성은 주기를 관리하고, 남성은 파트너와 함께할 수 있어요.
          </p>
        </div>

        {/* A. 시작하기 */}
        <GettingStartedSection />

        {/* Gender Tab Switcher */}
        <div className="guide-section" style={{ padding: '18px' }}>
          <h3 className="guide-section-title" style={{ marginBottom: '12px' }}>
            <span className="section-icon">✨</span> 기능 소개
          </h3>
          <div className="guide-gender-tabs">
            <button
              className={`guide-gender-tab ${activeTab === 'female' ? 'guide-gender-tab--active' : ''}`}
              onClick={() => setActiveTab('female')}
            >
              🌸 여성 기능
            </button>
            <button
              className={`guide-gender-tab ${activeTab === 'male' ? 'guide-gender-tab--active' : ''}`}
              onClick={() => setActiveTab('male')}
            >
              💙 남성 기능
            </button>
          </div>

          {/* Show selected tab's content inline */}
          {activeTab === 'female' ? (
            <div className="guide-features">
              {/* 홈 */}
              <div className="guide-feature">
                <div className="guide-feature-info">
                  <span className="guide-feature-icon">🏠</span>
                  <div>
                    <h4>홈 — 주기 한눈에 보기</h4>
                    <p>원형 차트로 현재 주기 상태와 D-Day를 한눈에 확인해요. 오늘의 컨디션 인사이트와 주간 미니 캘린더도 함께 제공됩니다.</p>
                  </div>
                </div>
                <MockHome />
              </div>

              {/* 캘린더 */}
              <div className="guide-feature">
                <div className="guide-feature-info">
                  <span className="guide-feature-icon">📅</span>
                  <div>
                    <h4>캘린더 — 색상으로 구분하는 주기</h4>
                    <p>생리일(빨강), 가임기(파랑), 배란일(보라)이 색상으로 구분되어 한눈에 파악할 수 있어요. 날짜를 탭하면 상세 정보를 확인하고 바로 기록할 수 있습니다.</p>
                  </div>
                </div>
                <MockCalendar />
              </div>

              {/* 기록 */}
              <div className="guide-feature">
                <div className="guide-feature-info">
                  <span className="guide-feature-icon">✏️</span>
                  <div>
                    <h4>기록 — 하루를 한 화면에</h4>
                    <p>생리 시작/종료, 유량, 증상, 약 복용, 관계일, 메모까지 한 화면에서 기록해요. 날짜를 좌우로 넘겨 다른 날짜도 기록할 수 있어요.</p>
                  </div>
                </div>
                <MockRecord />
              </div>

              {/* 통계 */}
              <div className="guide-feature">
                <div className="guide-feature-info">
                  <span className="guide-feature-icon">📊</span>
                  <div>
                    <h4>통계 — 나의 주기 분석</h4>
                    <p>평균 주기, 기간, 편차, 증상 패턴, 관계일 트렌드를 분석하고 시각화해요. PDF 리포트로 내보내기도 가능합니다.</p>
                  </div>
                </div>
                <MockStats />
              </div>

              {/* 추천 */}
              <div className="guide-feature">
                <div className="guide-feature-info">
                  <span className="guide-feature-icon">🎁</span>
                  <div>
                    <h4>추천 — 맞춤 제품 추천</h4>
                    <p>현재 주기 단계에 맞는 건강 제품, 음식, 운동을 추천해드려요. 생리통 완화부터 컨디션 관리까지 맞춤 케어를 받아보세요.</p>
                  </div>
                </div>
                <MockRecommend />
              </div>

              <div className="guide-color-legend">
                <div className="guide-legend-item">
                  <div className="guide-legend-dot guide-legend-dot--period" />
                  <span>생리일</span>
                </div>
                <div className="guide-legend-item">
                  <div className="guide-legend-dot guide-legend-dot--fertile" />
                  <span>가임기</span>
                </div>
                <div className="guide-legend-item">
                  <div className="guide-legend-dot guide-legend-dot--ovulation" />
                  <span>배란일</span>
                </div>
                <div className="guide-legend-item">
                  <div className="guide-legend-dot guide-legend-dot--success" />
                  <span>오늘</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="guide-features">
              {/* 파트너 홈 */}
              <div className="guide-feature">
                <div className="guide-feature-info">
                  <span className="guide-feature-icon">💑</span>
                  <div>
                    <h4>파트너 홈 — 오늘의 상태</h4>
                    <p>파트너의 현재 주기 D-Day, 맞춤 행동 요령, 증상 요약을 한눈에 확인해요. 무엇을 해야 할지 바로 알 수 있습니다.</p>
                  </div>
                </div>
                <MockPartnerHome />
              </div>

              {/* 파트너 캘린더 */}
              <div className="guide-feature">
                <div className="guide-feature-info">
                  <span className="guide-feature-icon">📅</span>
                  <div>
                    <h4>파트너 캘린더 — 읽기전용 주기</h4>
                    <p>파트너의 생리일, 예상 생리일, 가임기, 배란일을 캘린더에서 확인해요. 나의 관계 기록도 함께 표시됩니다.</p>
                  </div>
                </div>
                <MockPartnerCalendar />
              </div>

              {/* 관계 기록 */}
              <div className="guide-feature">
                <div className="guide-feature-info">
                  <span className="guide-feature-icon">✏️</span>
                  <div>
                    <h4>관계 기록 — 시간대, 피임, 메모</h4>
                    <p>관계 기록을 시간대별로 남기고 피임 여부, 메모를 함께 기록할 수 있어요. 파트너의 주기 상태도 함께 표시됩니다.</p>
                  </div>
                </div>
                <MockPartnerRecord />
              </div>

              {/* 커플 대시보드 */}
              <div className="guide-feature">
                <div className="guide-feature-info">
                  <span className="guide-feature-icon">📊</span>
                  <div>
                    <h4>커플 대시보드 — 함께하는 분석</h4>
                    <p>관계 트렌드, 주기별 패턴 분석, 임신 계획 도구를 한 곳에서 확인할 수 있어요. 두 사람의 데이터를 통합해서 보여줍니다.</p>
                  </div>
                </div>
                <MockCouplesDashboard />
              </div>
            </div>
          )}
        </div>

        {/* E. 파트너 연결 */}
        <PartnerConnectionSection />

        {/* F. 설정 & 팁 */}
        <SettingsTipsSection />
      </div>
    </div>
  )
}
