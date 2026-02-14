import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import '@/test/mocks'
import { renderWithProviders } from '@/test/test-utils'
import { HomePage } from '../HomePage'

// Mock matchMedia for InstallBanner
beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(display-mode: standalone)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

describe('HomePage', () => {
  it('기록 필요 텍스트가 데이터 없을 때 표시', () => {
    renderWithProviders(<HomePage />, { withAuth: true })
    expect(screen.getByText('기록 필요')).toBeInTheDocument()
  })

  it('"?" 표시 (데이터 없을 때)', () => {
    renderWithProviders(<HomePage />, { withAuth: true })
    expect(screen.getByText('?')).toBeInTheDocument()
  })

  it('퀵 액션 버튼 2개 존재', () => {
    renderWithProviders(<HomePage />, { withAuth: true })
    expect(screen.getByText(/생리 기록하기/)).toBeInTheDocument()
    expect(screen.getByText(/증상 기록하기/)).toBeInTheDocument()
  })

  it('prediction 카드 라벨 4개 표시', () => {
    renderWithProviders(<HomePage />, { withAuth: true })
    expect(screen.getByText('다음 생리')).toBeInTheDocument()
    expect(screen.getByText('배란 예정일')).toBeInTheDocument()
    expect(screen.getByText('가임기')).toBeInTheDocument()
    expect(screen.getByText('평균 주기')).toBeInTheDocument()
  })

  it('데이터 필요 텍스트가 prediction 없을 때 표시', () => {
    renderWithProviders(<HomePage />, { withAuth: true })
    const emptyTexts = screen.getAllByText('데이터 필요')
    expect(emptyTexts.length).toBeGreaterThanOrEqual(3)
  })

  it('평균 주기 기본값 표시', () => {
    renderWithProviders(<HomePage />, { withAuth: true })
    expect(screen.getByText('28일')).toBeInTheDocument()
  })
})
