import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import '@/test/mocks'
import { renderWithProviders } from '@/test/test-utils'
import { RecordPage } from '../RecordPage'

describe('RecordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('오늘 날짜가 표시됨', () => {
    renderWithProviders(<RecordPage />, { withAuth: true })
    const todayDisplay = format(new Date(), 'M월 d일 (EEEE)', { locale: ko })
    expect(screen.getByText(todayDisplay)).toBeInTheDocument()
  })

  it('"오늘" 버튼 존재', () => {
    renderWithProviders(<RecordPage />, { withAuth: true })
    expect(screen.getByText('오늘')).toBeInTheDocument()
  })

  it('"생리 시작" 버튼 존재', () => {
    renderWithProviders(<RecordPage />, { withAuth: true })
    expect(screen.getByText('생리 시작')).toBeInTheDocument()
  })

  it('생리 기록 섹션 표시', () => {
    renderWithProviders(<RecordPage />, { withAuth: true })
    expect(screen.getByText(/생리 기록/)).toBeInTheDocument()
  })

  it('증상 기록 섹션 표시', () => {
    renderWithProviders(<RecordPage />, { withAuth: true })
    expect(screen.getByText(/증상 기록/)).toBeInTheDocument()
  })

  it('신체 증상과 기분 카테고리 존재', () => {
    renderWithProviders(<RecordPage />, { withAuth: true })
    expect(screen.getByText('신체 증상')).toBeInTheDocument()
    expect(screen.getByText('기분')).toBeInTheDocument()
  })

  it('메모 텍스트 영역 존재', () => {
    renderWithProviders(<RecordPage />, { withAuth: true })
    expect(screen.getByPlaceholderText('오늘의 메모를 남겨보세요... (자동 저장)')).toBeInTheDocument()
  })

  it('이전/다음 날짜 네비 버튼 존재', () => {
    renderWithProviders(<RecordPage />, { withAuth: true })
    expect(screen.getByText('‹')).toBeInTheDocument()
    expect(screen.getByText('›')).toBeInTheDocument()
  })

  it('증상 버튼들이 렌더링됨 (복통/생리통 등)', () => {
    renderWithProviders(<RecordPage />, { withAuth: true })
    expect(screen.getByText('복통/생리통')).toBeInTheDocument()
    expect(screen.getByText('두통')).toBeInTheDocument()
    expect(screen.getByText('피로')).toBeInTheDocument()
  })

  it('기분 버튼들이 렌더링됨', () => {
    renderWithProviders(<RecordPage />, { withAuth: true })
    expect(screen.getByText('행복')).toBeInTheDocument()
    expect(screen.getByText('우울')).toBeInTheDocument()
    expect(screen.getByText('짜증')).toBeInTheDocument()
  })
})
