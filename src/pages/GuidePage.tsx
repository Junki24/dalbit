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
            <div className="mock-cycle-day">D-14</div>
            <div className="mock-cycle-label">다음 생리까지</div>
          </div>
        </div>
        <div className="mock-phase-badge">황체기</div>
        <div className="mock-insight-row">
          <div className="mock-insight-card">
            <div className="ic-val">28일</div>
            <div className="ic-lbl">평균 주기</div>
          </div>
          <div className="mock-insight-card">
            <div className="ic-val">5일</div>
            <div className="ic-lbl">평균 기간</div>
          </div>
          <div className="mock-insight-card">
            <div className="ic-val">😊</div>
            <div className="ic-lbl">컨디션</div>
          </div>
        </div>
      </div>
    </PhoneMockup>
  )
}

/* ── Mockup: Calendar ── */
function MockCalendar() {
  const dayNames = ['일', '월', '화', '수', '목', '금', '토']
  // Simulated month with period (5-9), fertile (16-20), ovulation (18)
  const cells: { day: number; type?: string }[] = []
  for (let i = 1; i <= 28; i++) {
    let type = ''
    if (i >= 5 && i <= 9) type = 'period'
    else if (i === 18) type = 'ovulation'
    else if (i >= 16 && i <= 20) type = 'fertile'
    else if (i === 15) type = 'today'
    cells.push({ day: i, type })
  }

  return (
    <PhoneMockup>
      <div className="mock-calendar">
        <div className="mock-cal-header">2026년 2월</div>
        <div className="mock-cal-days">
          {dayNames.map((d) => (
            <div key={d} className="mock-cal-day-name">{d}</div>
          ))}
          {/* Empty cells for offset (Feb starts on Sun) */}
          <div />
          {cells.map((c) => (
            <div
              key={c.day}
              className={`mock-cal-cell${c.type ? ` mock-cal-cell--${c.type}` : ''}`}
            >
              {c.day}
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
        <div className="mock-record-date">2월 15일 (토)</div>
        <div className="mock-record-group">
          <div className="mock-record-label">🩸 생리</div>
          <div className="mock-flow-dots">
            <div className="mock-flow-dot mock-flow-dot--filled" />
            <div className="mock-flow-dot mock-flow-dot--filled" />
            <div className="mock-flow-dot mock-flow-dot--filled" />
            <div className="mock-flow-dot" />
            <div className="mock-flow-dot" />
          </div>
        </div>
        <div className="mock-record-group">
          <div className="mock-record-label">😣 증상</div>
          <div className="mock-record-toggles">
            <span className="mock-toggle mock-toggle--symptom">복통</span>
            <span className="mock-toggle mock-toggle--symptom">두통</span>
            <span className="mock-toggle">피로</span>
            <span className="mock-toggle">부종</span>
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
  const barHeights = [65, 80, 70, 85, 75, 90, 72]
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
            <div className="mock-stat-val">복통</div>
            <div className="mock-stat-lbl">최다 증상</div>
          </div>
          <div className="mock-stat-card">
            <div className="mock-stat-val">±2.1</div>
            <div className="mock-stat-lbl">주기 편차</div>
          </div>
        </div>
        <div className="mock-chart-bars">
          {barHeights.map((h, i) => (
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
        <div className="mock-rec-title">🎯 맞춤 추천</div>
        <div className="mock-rec-card">
          <div className="mock-rec-img">🌡️</div>
          <div className="mock-rec-info">
            <div className="mock-rec-name">핫팩 (허리용)</div>
            <div className="mock-rec-desc">생리통 완화에 도움</div>
          </div>
          <div className="mock-rec-price">₩8,900</div>
        </div>
        <div className="mock-rec-card">
          <div className="mock-rec-img">🍫</div>
          <div className="mock-rec-info">
            <div className="mock-rec-name">다크 초콜릿</div>
            <div className="mock-rec-desc">마그네슘 보충</div>
          </div>
          <div className="mock-rec-price">₩5,500</div>
        </div>
        <div className="mock-rec-card">
          <div className="mock-rec-img">🧘</div>
          <div className="mock-rec-info">
            <div className="mock-rec-name">요가 스트레칭</div>
            <div className="mock-rec-desc">하복부 이완 운동</div>
          </div>
          <div className="mock-rec-price">무료</div>
        </div>
      </div>
    </PhoneMockup>
  )
}

/* ── Mockup: Partner Home ── */
function MockPartnerHome() {
  return (
    <PhoneMockup>
      <div className="mock-partner-home">
        <div className="mock-dday-card">
          <div className="mock-dday-label">파트너 다음 생리까지</div>
          <div className="mock-dday-value">D-7</div>
          <div className="mock-dday-sub">현재: 황체기</div>
        </div>
        <div className="mock-tip-card">
          <div className="mock-tip-title">💡 오늘의 행동 요령</div>
          <div className="mock-tip-text">생리 전 증후군(PMS)이 시작될 수 있어요. 따뜻한 음료를 준비해주세요.</div>
        </div>
        <div className="mock-symptom-summary">
          <span className="mock-symptom-chip">복통 😣</span>
          <span className="mock-symptom-chip">피로 😴</span>
          <span className="mock-symptom-chip">예민 😤</span>
        </div>
      </div>
    </PhoneMockup>
  )
}

/* ── Mockup: Partner Calendar ── */
function MockPartnerCalendar() {
  const dayNames = ['일', '월', '화', '수', '목', '금', '토']
  const cells: { day: number; type?: string }[] = []
  for (let i = 1; i <= 28; i++) {
    let type = ''
    if (i >= 5 && i <= 9) type = 'period'
    else if (i === 18) type = 'ovulation'
    else if (i >= 16 && i <= 20) type = 'fertile'
    cells.push({ day: i, type })
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
              className={`mock-cal-cell${c.type ? ` mock-cal-cell--${c.type}` : ''}`}
            >
              {c.day}
            </div>
          ))}
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
        <div className="mock-record-date">관계 기록</div>
        <div className="mock-record-group">
          <div className="mock-record-label">⏰ 시간대</div>
          <div className="mock-time-selector">
            <div className="mock-time-btn">아침</div>
            <div className="mock-time-btn mock-time-btn--active">오후</div>
            <div className="mock-time-btn">저녁</div>
            <div className="mock-time-btn">밤</div>
          </div>
        </div>
        <div className="mock-contra-toggle">
          <span className="mock-contra-label">🛡️ 피임 여부</span>
          <div className="mock-mini-toggle" />
        </div>
        <div className="mock-memo-area">
          <span className="mock-memo-placeholder">📝 메모를 입력하세요...</span>
        </div>
      </div>
    </PhoneMockup>
  )
}

/* ── Mockup: Couples Dashboard ── */
function MockCouplesDashboard() {
  return (
    <PhoneMockup>
      <div className="mock-couples">
        <div className="mock-couple-stat">
          <div className="mock-couple-card">
            <div className="cc-emoji">💕</div>
            <div className="cc-val">12회</div>
            <div className="cc-lbl">이번 달 관계</div>
          </div>
          <div className="mock-couple-card">
            <div className="cc-emoji">📊</div>
            <div className="cc-val">3.2일</div>
            <div className="cc-lbl">평균 간격</div>
          </div>
          <div className="mock-couple-card">
            <div className="cc-emoji">🌙</div>
            <div className="cc-val">밤</div>
            <div className="cc-lbl">선호 시간</div>
          </div>
        </div>
        <div className="mock-pregnancy-badge">
          <span className="preg-icon">👶</span>
          <div>
            <div className="preg-text">임신 계획 모드</div>
            <div className="preg-sub">가임기에 맞춘 최적 시기 안내</div>
          </div>
        </div>
        <div className="mock-chart-bars" style={{ height: '32px' }}>
          <div className="mock-chart-bar" style={{ height: '40%' }} />
          <div className="mock-chart-bar" style={{ height: '60%' }} />
          <div className="mock-chart-bar" style={{ height: '80%' }} />
          <div className="mock-chart-bar" style={{ height: '55%' }} />
          <div className="mock-chart-bar" style={{ height: '90%' }} />
          <div className="mock-chart-bar" style={{ height: '45%' }} />
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
