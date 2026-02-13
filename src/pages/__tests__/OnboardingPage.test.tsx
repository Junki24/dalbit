import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@/test/mocks'
import { renderWithProviders } from '@/test/test-utils'
import { OnboardingPage } from '../OnboardingPage'

describe('OnboardingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('"달빛 시작하기" 제목 표시', () => {
    renderWithProviders(<OnboardingPage />, { withAuth: true })
    expect(screen.getByText('달빛 시작하기')).toBeInTheDocument()
  })

  it('표시 이름 입력 필드 존재', () => {
    renderWithProviders(<OnboardingPage />, { withAuth: true })
    expect(screen.getByPlaceholderText('예: 지은')).toBeInTheDocument()
  })

  it('평균 생리 주기 기본값 28', () => {
    renderWithProviders(<OnboardingPage />, { withAuth: true })
    const cycleInput = screen.getByLabelText('평균 생리 주기 (일)')
    expect(cycleInput).toHaveValue(28)
  })

  it('평균 생리 기간 기본값 5', () => {
    renderWithProviders(<OnboardingPage />, { withAuth: true })
    const periodInput = screen.getByLabelText('평균 생리 기간 (일)')
    expect(periodInput).toHaveValue(5)
  })

  it('건강 정보 동의 체크박스 존재', () => {
    renderWithProviders(<OnboardingPage />, { withAuth: true })
    expect(screen.getByText(/건강 정보 수집·이용에 동의합니다/)).toBeInTheDocument()
  })

  it('동의 없이 시작하기 버튼 비활성화', () => {
    renderWithProviders(<OnboardingPage />, { withAuth: true })
    const submitBtn = screen.getByText('시작하기')
    expect(submitBtn).toBeDisabled()
  })

  it('동의 체크 후 시작하기 버튼 활성화', async () => {
    const user = userEvent.setup()
    renderWithProviders(<OnboardingPage />, { withAuth: true })

    const checkbox = screen.getByRole('checkbox')
    await user.click(checkbox)

    const submitBtn = screen.getByText('시작하기')
    expect(submitBtn).not.toBeDisabled()
  })

  it('수집 항목 설명 표시', () => {
    renderWithProviders(<OnboardingPage />, { withAuth: true })
    expect(screen.getByText('생리 시작일 및 종료일')).toBeInTheDocument()
    expect(screen.getByText('출혈량 정보')).toBeInTheDocument()
    expect(screen.getByText('신체 증상 기록')).toBeInTheDocument()
    expect(screen.getByText('기분 상태')).toBeInTheDocument()
  })

  it('주기 길이 증감 버튼 동작', async () => {
    const user = userEvent.setup()
    renderWithProviders(<OnboardingPage />, { withAuth: true })

    const cycleInput = screen.getByLabelText('평균 생리 주기 (일)')
    expect(cycleInput).toHaveValue(28)

    // Find + button near cycle input (first + button)
    const plusButtons = screen.getAllByText('+')
    await user.click(plusButtons[0])
    expect(cycleInput).toHaveValue(29)
  })
})
