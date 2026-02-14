import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import '@/test/mocks'
import { renderWithProviders } from '@/test/test-utils'
import { CalendarPage } from '../CalendarPage'

describe('CalendarPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('현재 월 제목 표시', () => {
    renderWithProviders(<CalendarPage />, { withAuth: true })
    const monthTitle = format(new Date(), 'yyyy년 M월', { locale: ko })
    expect(screen.getByText(monthTitle)).toBeInTheDocument()
  })

  it('요일 헤더 7개 표시', () => {
    renderWithProviders(<CalendarPage />, { withAuth: true })
    const weekdays = ['일', '월', '화', '수', '목', '금', '토']
    for (const day of weekdays) {
      expect(screen.getByText(day)).toBeInTheDocument()
    }
  })

  it('이전/다음 월 네비 버튼 존재', () => {
    renderWithProviders(<CalendarPage />, { withAuth: true })
    expect(screen.getByText('‹')).toBeInTheDocument()
    expect(screen.getByText('›')).toBeInTheDocument()
  })

  it('범례 아이템 4개 존재', () => {
    renderWithProviders(<CalendarPage />, { withAuth: true })
    expect(screen.getByText('생리')).toBeInTheDocument()
    expect(screen.getByText('예상 생리')).toBeInTheDocument()
    expect(screen.getByText('가임기')).toBeInTheDocument()
    expect(screen.getByText('배란일')).toBeInTheDocument()
  })

  it('이전 월 버튼 클릭 시 월 변경', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CalendarPage />, { withAuth: true })

    const prevBtn = screen.getByText('‹')
    await user.click(prevBtn)

    const now = new Date()
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonthTitle = format(prevMonth, 'yyyy년 M월', { locale: ko })
    expect(screen.getByText(prevMonthTitle)).toBeInTheDocument()
  })

  it('다음 월 버튼 클릭 시 월 변경', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CalendarPage />, { withAuth: true })

    const nextBtn = screen.getByText('›')
    await user.click(nextBtn)

    const now = new Date()
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const nextMonthTitle = format(nextMonth, 'yyyy년 M월', { locale: ko })
    expect(screen.getByText(nextMonthTitle)).toBeInTheDocument()
  })
})
