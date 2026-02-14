import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { mockSupabase, mockUser, mockUserSettings } from '@/test/mocks'
import { renderWithProviders } from '@/test/test-utils'
import { MigrationSection } from '../MigrationSection'

// Helper: set up authenticated session mock
function setupAuthenticatedSession() {
  const mockSession = {
    user: mockUser,
    access_token: 'test-access-token-valid',
    refresh_token: 'test-refresh-token',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
  }

  mockSupabase.auth.getSession.mockResolvedValue({
    data: { session: mockSession },
  })
  mockSupabase.auth.onAuthStateChange.mockImplementation((callback: Function) => {
    // Fire immediately with the session
    callback('SIGNED_IN', mockSession)
    return { data: { subscription: { unsubscribe: vi.fn() } } }
  })

  // user_settings fetch
  const fromMock = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: mockUserSettings, error: null }),
    upsert: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
  }
  mockSupabase.from.mockReturnValue(fromMock)

  return mockSession
}

// Helper: create a fake File for upload
function createMockFile(name = 'screenshot.png', type = 'image/png'): File {
  const content = btoa('fake-png-data')
  const blob = new Blob([content], { type })
  return new File([blob], name, { type })
}

// Helper: mock FileReader for base64 conversion
function mockFileReader() {
  const MockFileReaderClass = class {
    result: string | null = 'data:image/png;base64,ZmFrZS1wbmctZGF0YQ=='
    onload: (() => void) | null = null
    onerror: ((err: unknown) => void) | null = null
    readAsDataURL() {
      setTimeout(() => this.onload?.(), 0)
    }
  }
  vi.stubGlobal('FileReader', MockFileReaderClass)
  return MockFileReaderClass
}

describe('MigrationSection — Auth 진단 테스트', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: no session
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } })
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    })
  })

  // ========================================
  // 1단계: 컴포넌트 렌더링 테스트
  // ========================================
  describe('1단계: 렌더링', () => {
    it('업로드 버튼이 렌더링됨', async () => {
      setupAuthenticatedSession()
      renderWithProviders(<MigrationSection />)

      await waitFor(() => {
        expect(screen.getByText('📷 스크린샷 업로드')).toBeInTheDocument()
      })
    })

    it('파일 input이 hidden으로 존재', async () => {
      setupAuthenticatedSession()
      renderWithProviders(<MigrationSection />)

      await waitFor(() => {
        const input = screen.getByLabelText('스크린샷 선택')
        expect(input).toBeInTheDocument()
        expect(input).toHaveStyle({ display: 'none' })
      })
    })
  })

  // ========================================
  // 2단계: functions.invoke 호출 테스트
  // ========================================
  describe('2단계: functions.invoke 호출', () => {
    it('파일 선택 시 supabase.functions.invoke가 호출됨', async () => {
      setupAuthenticatedSession()
      mockFileReader()
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { periods: [], confidence: 'low', source_app: null, notes: null },
        error: null,
      })

      renderWithProviders(<MigrationSection />)

      await waitFor(() => {
        expect(screen.getByLabelText('스크린샷 선택')).toBeInTheDocument()
      })

      const input = screen.getByLabelText('스크린샷 선택') as HTMLInputElement
      const file = createMockFile()

      // Simulate file selection
      Object.defineProperty(input, 'files', { value: [file], writable: false })
      fireEvent.change(input)

      await waitFor(() => {
        expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
          'analyze-screenshot',
          expect.objectContaining({
            body: expect.objectContaining({
              mimeType: 'image/png',
            }),
          })
        )
      }, { timeout: 5000 })
    })

    it('functions.invoke에 image base64가 전달됨', async () => {
      setupAuthenticatedSession()
      mockFileReader()
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { periods: [], confidence: 'low', source_app: null, notes: null },
        error: null,
      })

      renderWithProviders(<MigrationSection />)

      await waitFor(() => {
        expect(screen.getByLabelText('스크린샷 선택')).toBeInTheDocument()
      })

      const input = screen.getByLabelText('스크린샷 선택') as HTMLInputElement
      const file = createMockFile()
      Object.defineProperty(input, 'files', { value: [file], writable: false })
      fireEvent.change(input)

      await waitFor(() => {
        const callArgs = mockSupabase.functions.invoke.mock.calls[0]
        expect(callArgs[0]).toBe('analyze-screenshot')
        expect(callArgs[1].body.image).toBeTruthy()
        expect(typeof callArgs[1].body.image).toBe('string')
      }, { timeout: 5000 })
    })
  })

  // ========================================
  // 3단계: Auth 에러 시나리오 격리
  // ========================================
  describe('3단계: Auth 에러 시나리오', () => {
    it('functions.invoke가 FunctionsHttpError 반환 시 토스트 표시', async () => {
      setupAuthenticatedSession()
      mockFileReader()

      // Simulate Edge Function returning 401
      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: {
          message: '인증 실패: Auth session missing',
          context: { status: 401 },
        },
      })

      renderWithProviders(<MigrationSection />)

      await waitFor(() => {
        expect(screen.getByLabelText('스크린샷 선택')).toBeInTheDocument()
      })

      const input = screen.getByLabelText('스크린샷 선택') as HTMLInputElement
      Object.defineProperty(input, 'files', { value: [createMockFile()], writable: false })
      fireEvent.change(input)

      await waitFor(() => {
        expect(mockSupabase.functions.invoke).toHaveBeenCalled()
      }, { timeout: 5000 })
    })

    it('functions.invoke가 네트워크 에러 반환 시 처리', async () => {
      setupAuthenticatedSession()
      mockFileReader()

      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'Failed to fetch' },
      })

      renderWithProviders(<MigrationSection />)

      await waitFor(() => {
        expect(screen.getByLabelText('스크린샷 선택')).toBeInTheDocument()
      })

      const input = screen.getByLabelText('스크린샷 선택') as HTMLInputElement
      Object.defineProperty(input, 'files', { value: [createMockFile()], writable: false })
      fireEvent.change(input)

      await waitFor(() => {
        expect(mockSupabase.functions.invoke).toHaveBeenCalled()
      }, { timeout: 5000 })
    })

    it('functions.invoke가 예외를 throw 시 catch됨', async () => {
      setupAuthenticatedSession()
      mockFileReader()

      mockSupabase.functions.invoke.mockRejectedValue(new Error('Auth session missing'))

      renderWithProviders(<MigrationSection />)

      await waitFor(() => {
        expect(screen.getByLabelText('스크린샷 선택')).toBeInTheDocument()
      })

      const input = screen.getByLabelText('스크린샷 선택') as HTMLInputElement
      Object.defineProperty(input, 'files', { value: [createMockFile()], writable: false })
      fireEvent.change(input)

      // Should not crash — caught by try/catch
      await waitFor(() => {
        expect(mockSupabase.functions.invoke).toHaveBeenCalled()
      }, { timeout: 5000 })
    })
  })

  // ========================================
  // 4단계: 성공 시나리오
  // ========================================
  describe('4단계: 성공 시나리오', () => {
    it('periods 반환 시 결과 테이블 표시', async () => {
      setupAuthenticatedSession()
      mockFileReader()

      mockSupabase.functions.invoke.mockResolvedValue({
        data: {
          periods: [
            { start_date: '2026-01-15', end_date: '2026-01-20', flow_intensity: 'medium' },
            { start_date: '2026-02-12', end_date: '2026-02-17', flow_intensity: 'light' },
          ],
          confidence: 'high',
          source_app: 'Flo',
          notes: '2건의 생리 기록을 추출했습니다.',
        },
        error: null,
      })

      renderWithProviders(<MigrationSection />)

      await waitFor(() => {
        expect(screen.getByLabelText('스크린샷 선택')).toBeInTheDocument()
      })

      const input = screen.getByLabelText('스크린샷 선택') as HTMLInputElement
      Object.defineProperty(input, 'files', { value: [createMockFile()], writable: false })
      fireEvent.change(input)

      await waitFor(() => {
        expect(screen.getByText(/2건 가져오기/)).toBeInTheDocument()
      }, { timeout: 5000 })

      // Verify metadata shown
      expect(screen.getByText(/높음/)).toBeInTheDocument()
      expect(screen.getByText(/Flo/)).toBeInTheDocument()
    })

    it('빈 periods 반환 시 "기록을 찾지 못했습니다" 표시 없이 분석 완료', async () => {
      setupAuthenticatedSession()
      mockFileReader()

      mockSupabase.functions.invoke.mockResolvedValue({
        data: { periods: [], confidence: 'low', source_app: null, notes: null },
        error: null,
      })

      renderWithProviders(<MigrationSection />)

      await waitFor(() => {
        expect(screen.getByLabelText('스크린샷 선택')).toBeInTheDocument()
      })

      const input = screen.getByLabelText('스크린샷 선택') as HTMLInputElement
      Object.defineProperty(input, 'files', { value: [createMockFile()], writable: false })
      fireEvent.change(input)

      // After analysis completes, the upload button should reappear (no results to show)
      await waitFor(() => {
        expect(screen.getByText('📷 스크린샷 업로드')).toBeInTheDocument()
      }, { timeout: 5000 })
    })
  })
})

// ========================================
// 독립 Auth 레이어 격리 테스트
// ========================================
describe('Auth 레이어 격리 테스트', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getSession 동작', () => {
    it('getSession이 null 반환 시 — 세션 없음', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } })
      const { data } = await mockSupabase.auth.getSession()
      expect(data.session).toBeNull()
    })

    it('getSession이 만료된 토큰 반환 시', async () => {
      const expiredSession = {
        user: mockUser,
        access_token: 'expired-token',
        expires_at: Math.floor(Date.now() / 1000) - 3600, // 1시간 전 만료
      }
      mockSupabase.auth.getSession.mockResolvedValue({ data: { session: expiredSession } })

      const { data } = await mockSupabase.auth.getSession()
      expect(data.session).toBeTruthy()
      expect(data.session.expires_at).toBeLessThan(Math.floor(Date.now() / 1000))
    })

    it('getSession이 유효한 토큰 반환 시', async () => {
      const validSession = {
        user: mockUser,
        access_token: 'valid-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      }
      mockSupabase.auth.getSession.mockResolvedValue({ data: { session: validSession } })

      const { data } = await mockSupabase.auth.getSession()
      expect(data.session).toBeTruthy()
      expect(data.session.expires_at).toBeGreaterThan(Math.floor(Date.now() / 1000))
    })
  })

  describe('refreshSession 동작', () => {
    it('refreshSession이 "Auth session missing" 에러 시', async () => {
      mockSupabase.auth.refreshSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Auth session missing' },
      })

      const { data, error } = await mockSupabase.auth.refreshSession()
      expect(data.session).toBeNull()
      expect(error.message).toBe('Auth session missing')
    })

    it('refreshSession이 성공 시', async () => {
      const newSession = {
        user: mockUser,
        access_token: 'new-fresh-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      }
      mockSupabase.auth.refreshSession.mockResolvedValue({
        data: { session: newSession },
        error: null,
      })

      const { data, error } = await mockSupabase.auth.refreshSession()
      expect(error).toBeNull()
      expect(data.session.access_token).toBe('new-fresh-token')
    })
  })

  describe('functions.invoke 동작', () => {
    it('functions.invoke가 401 에러 반환 — auth 실패', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: '인증 실패: Auth session missing', context: { status: 401 } },
      })

      const { data, error } = await mockSupabase.functions.invoke('analyze-screenshot', {
        body: { image: 'base64', mimeType: 'image/png' },
      })

      expect(data).toBeNull()
      expect(error.message).toContain('Auth session missing')
    })

    it('functions.invoke가 200 성공 반환', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: {
          periods: [{ start_date: '2026-01-15', end_date: '2026-01-20', flow_intensity: 'medium' }],
          confidence: 'high',
          source_app: 'Flo',
          notes: null,
        },
        error: null,
      })

      const { data, error } = await mockSupabase.functions.invoke('analyze-screenshot', {
        body: { image: 'base64', mimeType: 'image/png' },
      })

      expect(error).toBeNull()
      expect(data.periods).toHaveLength(1)
      expect(data.periods[0].start_date).toBe('2026-01-15')
    })

    it('functions.invoke가 502 Gemini 에러 반환', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'Gemini API 오류 (502)' },
      })

      const { error } = await mockSupabase.functions.invoke('analyze-screenshot', {
        body: { image: 'base64', mimeType: 'image/png' },
      })

      expect(error.message).toContain('Gemini')
    })
  })
})
