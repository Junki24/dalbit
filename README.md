# 달빛 (Dalbit) — 커플을 위한 생리주기 트래커

커플이 함께 사용하는 생리주기 트래킹 PWA. 주기 예측, 증상 기록, 관계일 추적, 파트너 공유, AI 마이그레이션까지 — 하나의 앱에서.

## 주요 기능

| 기능 | 설명 |
|------|------|
| **생리주기 기록** | 시작일/종료일, 유량 강도, 메모 자동저장 |
| **주기 예측** | 1~5개월 다중 주기 예측 (생리일·배란일·가임기), 설정에서 커스텀 |
| **증상 추적** | 20+ 증상 카테고리, 심각도 3단계, 상관관계 분석 |
| **관계일 추적** | 시간대, 피임 방법, 가임기 정보 표시 (정보제공 톤) |
| **약 복용 관리** | 약 등록, 복용 기록, 리마인더 |
| **캘린더 뷰** | 생리·배란·가임기·관계일을 한눈에, 스와이프 월 이동, 주기 기록 표 |
| **통계 분석** | 주기 트렌드, 증상 패턴, 관계일 통계, CSV 내보내기 |
| **파트너 공유** | 초대 코드로 파트너 연결, 기본 공유 활성화, 읽기 전용 대시보드 |
| **PDF 리포트** | 주기·증상·관계일 요약 PDF 생성 |
| **AI 마이그레이션** | 다른 앱 스크린샷 → AI 분석 → 자동 데이터 이관 |
| **Push 알림** | 생리 예정일 리마인더, 백그라운드 Web Push |
| **다크/라이트 모드** | 글래스모피즘 moonlight 테마 |
| **PWA** | 설치 가능, 오프라인 캐시, 앱처럼 동작 |

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| **프레임워크** | React 19 + TypeScript 5.9 |
| **빌드** | Vite 7 + vite-plugin-pwa |
| **상태관리** | TanStack React Query 5 (서버) + Zustand 5 (클라이언트) |
| **라우팅** | react-router-dom 7 |
| **백엔드** | Supabase (PostgreSQL + Auth + RLS + Edge Functions) |
| **PDF** | @react-pdf/renderer (lazy loaded) |
| **날짜** | date-fns 4 |
| **테스트** | Vitest 4 + Testing Library + Playwright E2E |
| **배포** | Vercel (프론트) + Supabase (백엔드) |

## 프로젝트 구조

```
dalbit/
├── public/                     # PWA 아이콘, manifest
├── e2e/                        # Playwright E2E 테스트
├── supabase/
│   ├── migrations/             # 11개 SQL 마이그레이션
│   │   ├── 20260214_push_subscriptions.sql
│   │   ├── 20260215_push_cron.sql
│   │   ├── 20260216_fix_invite_rls.sql
│   │   ├── 20260217_fix_invite_rls_v2.sql
│   │   ├── 20260218_pad_preferences.sql
│   │   ├── 20260219_flow_intensities_per_day.sql
│   │   ├── 20260220_fix_invite_accept_rls.sql
│   │   ├── 20260221_medications_and_tips.sql
│   │   ├── 20260222_tips_seed_data.sql
│   │   ├── 20260223_intimacy_records.sql
│   │   └── 20260224_prediction_months.sql
│   └── functions/              # Supabase Edge Functions
│       ├── analyze-screenshot/ # AI 스크린샷 분석
│       └── send-notifications/ # Push 알림 발송
└── src/
    ├── components/             # 공통 컴포넌트
    │   ├── Layout.tsx          # 하단 탭 네비게이션 레이아웃
    │   ├── Toast.tsx           # 토스트 알림
    │   ├── ErrorBoundary.tsx   # 에러 바운더리
    │   ├── Skeleton.tsx        # 로딩 스켈레톤
    │   ├── MigrationSection.tsx# AI 스크린샷 마이그레이션 UI
    │   ├── InstallBanner.tsx   # PWA 설치 배너
    │   ├── OfflineBanner.tsx   # 오프라인 상태 배너
    │   └── ProtectedRoute.tsx  # 인증 가드
    ├── contexts/
    │   ├── AuthContext.tsx      # Supabase 인증 상태
    │   ├── ThemeContext.tsx     # 다크/라이트 모드
    │   └── ToastContext.tsx     # 토스트 상태 관리
    ├── hooks/                  # 16개 커스텀 훅
    │   ├── usePeriods.ts       # 생리 기록 CRUD
    │   ├── useSymptoms.ts      # 증상 기록 CRUD
    │   ├── useIntimacy.ts      # 관계일 기록 CRUD + 범위 조회
    │   ├── useMedications.ts   # 약 복용 CRUD
    │   ├── useCyclePrediction.ts # 주기 예측 엔진
    │   ├── useInsights.ts      # 홈 인사이트
    │   ├── useSymptomPatterns.ts # 증상 상관관계 분석
    │   ├── useDailyTips.ts     # 큐레이션 팁
    │   ├── useNotes.ts         # 일일 메모
    │   ├── useNotifications.ts # Push 알림
    │   ├── usePadPreferences.ts# 생리대 선호 설정
    │   ├── usePartnerData.ts   # 파트너 데이터 조회
    │   ├── useHaptic.ts        # 햅틱 피드백
    │   ├── usePullToRefresh.ts # 당겨서 새로고침
    │   ├── useSwipe.ts         # 스와이프 제스처
    │   └── usePageTransition.ts# 페이지 전환 애니메이션
    ├── lib/
    │   ├── supabase.ts         # Supabase 클라이언트
    │   ├── cycle.ts            # 주기 계산 (예측, 가임기, 위상)
    │   ├── store.ts            # Zustand 로컬 스토어
    │   ├── pdf-export.ts       # PDF 리포트 생성
    │   └── supabase-schema.sql # DB 스키마 레퍼런스
    ├── pages/                  # 10개 페이지
    │   ├── HomePage.tsx        # 대시보드 + 인사이트
    │   ├── CalendarPage.tsx    # 캘린더 뷰
    │   ├── RecordPage.tsx      # 일일 기록 (생리/증상/관계일/약)
    │   ├── StatsPage.tsx       # 통계 분석
    │   ├── PartnerPage.tsx     # 파트너 대시보드
    │   ├── SettingsPage.tsx    # 설정 + AI 마이그레이션
    │   ├── LoginPage.tsx       # 로그인/회원가입
    │   ├── OnboardingPage.tsx  # 온보딩 플로우
    │   ├── InvitePage.tsx      # 파트너 초대
    │   └── RecommendPage.tsx   # 추천 페이지
    └── types/
        └── index.ts            # 전체 타입 정의
```

## 데이터베이스

### 테이블

| 테이블 | 용도 |
|--------|------|
| `periods` | 생리 기록 (시작일, 종료일, 유량, 메모) |
| `symptoms` | 증상 기록 (카테고리, 심각도, 날짜) |
| `intimacy_records` | 관계일 기록 (시간대, 피임 여부/방법, 메모) |
| `medications` | 약 등록 정보 |
| `medication_intakes` | 약 복용 기록 |
| `user_settings` | 사용자 설정 (주기 길이, 예측 개월 수, 알림 등) |
| `partner_sharing` | 파트너 연결 + 공유 범위 |
| `daily_notes` | 일일 메모 |
| `pad_preferences` | 생리대 선호 설정 |
| `tip_contents` | 큐레이션 팁 콘텐츠 |
| `push_subscriptions` | Web Push 구독 정보 |

모든 테이블에 Row Level Security (RLS) 적용. 파트너 공유 테이블은 기본 읽기 공유 활성화.

## 로컬 개발

### 사전 요구사항

- Node.js 20+
- npm 또는 pnpm
- Supabase CLI (마이그레이션 관리 시)

### 설정

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정
cp .env.example .env
# .env 파일에 Supabase URL과 anon key 입력:
#   VITE_SUPABASE_URL=https://your-project.supabase.co
#   VITE_SUPABASE_ANON_KEY=your-anon-key

# 3. 개발 서버 시작
npm run dev
```

### 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 (Vite HMR) |
| `npm run build` | TypeScript 체크 + 프로덕션 빌드 |
| `npm run lint` | ESLint |
| `npm run test` | 단위 테스트 (Vitest) |
| `npm run test:watch` | 테스트 워치 모드 |
| `npm run test:coverage` | 커버리지 리포트 |
| `npm run test:e2e` | E2E 테스트 (Playwright) |

## 배포

- **프론트엔드**: Vercel — `master` 브랜치 push 시 자동 배포
- **백엔드**: Supabase — `supabase db push`로 마이그레이션 적용
- **Edge Functions**: `supabase functions deploy <function-name>`

## 작업 이력 (Changelog)

### v1.0 — MVP (2026-02-14)
- 생리주기 기록 + 예측 엔진
- 증상 추적 (20+ 카테고리)
- 파트너 초대/공유 시스템
- 통계 분석 + CSV 내보내기
- 에러 바운더리 + 코드 스플리팅
- 168개 단위 테스트

### v1.1 — UI/UX 고도화 (2026-02-14 ~ 15)
- 글래스모피즘 moonlight 테마 CSS
- 토스트 알림 + 확인 다이얼로그
- 로딩 스켈레톤 + 캘린더 스와이프
- 페이지 전환 애니메이션
- 햅틱 피드백 + Pull-to-Refresh
- 다크/라이트 모드

### v1.2 — 알림 + 리포트 (2026-02-15)
- Web Push 백그라운드 알림 (pg_cron 스케줄)
- PDF 리포트 내보내기
- PWA 오프라인 캐시 강화

### v1.3 — 대시보드 + 인사이트 (2026-02-16)
- 홈 대시보드 전면 개선
- 인사이트 엔진 (주기 기반 메시지)
- 모바일 스크롤/CSS 버그 수정
- 접근성(a11y) 개선

### v1.4 — 컨텐츠 + 약 복용 (2026-02-17 ~ 19)
- 증상 패턴 분석 (상관관계)
- 큐레이션 팁 시스템
- 약 복용 기록 + UI 개선
- 생리 기록 리스트뷰
- PDF 초기 로딩 최적화 (3.8s → 1.8s)

### v1.5 — AI 마이그레이션 (2026-02-22)
- 다른 앱 스크린샷 AI 분석 → 데이터 자동 이관
- Supabase Edge Function (`analyze-screenshot`)
- KST 타임존 수정

### v1.6 — 관계일 추적 (2026-02-23)
- 관계일(intimacy) 기록 기능 전체 구현
  - DB 테이블 + RLS (파트너 읽기 공유 기본 활성화)
  - 시간대, 피임 방법, 메모 기록
  - 캘린더 보라색 마커 + 범례
  - 월별 트렌드, 주기 위상별 분포, 피임율, 가임기 겹침 분석
  - 파트너 대시보드 관계일 카운트 표시
  - PDF 리포트에 관계일 요약 포함
- 이미지 마이그레이션 auth session missing 버그 수정
  - `refreshSession()` → `getSession()` 폴백 체인

### v1.7 — Edge Function 수정 + 다중 예측 + UI 개선 (2026-02-14)
- Edge Function auth 수정
  - `analyze-screenshot`: CORS 헤더 추가 (`apikey`, `x-client-info`), `--no-verify-jwt` 배포, `getUser(token)` 직접 전달
  - `send-notifications`: 동일 CORS 수정 + `--no-verify-jwt`
  - `MigrationSection`: `ensureAccessToken()` 3단계 방어 + `supabase.functions.invoke()` 전환
- 토글 UI 개선 — ON/OFF 시각적 구분 (OFF: 회색, ON: 초록)
- 라이트모드 전면 보정 — 40+ 컴포넌트 CSS 오버라이드
- 다중 주기 예측 (1~5개월)
  - `FutureCycle` 타입 + `calculateCyclePrediction()` N주기 생성 루프
  - `isDateInPredictedPeriod/isDateInFertileWindow/isOvulationDay` 모든 미래 주기 체크
  - 설정에서 예측 개월 수 커스텀 (기본 3, 범위 1~5)
  - DB 마이그레이션: `prediction_months` 컬럼
- 캘린더 주기 기록 표 — 시작일/종료일/기간/주기, 최근 6건 + 더보기
- 202개 테스트 유지 (all pass)

## 라이선스

Private
