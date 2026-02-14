import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import '@/test/mocks'
import { renderWithProviders } from '@/test/test-utils'
import { SettingsPage } from '../SettingsPage'

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('프로필 섹션 표시', () => {
    renderWithProviders(<SettingsPage />, { withAuth: true })
    expect(screen.getByText(/프로필/)).toBeInTheDocument()
  })

  it('이메일 라벨 표시', () => {
    renderWithProviders(<SettingsPage />, { withAuth: true })
    expect(screen.getByText('이메일')).toBeInTheDocument()
  })

  it('표시 이름 입력 필드 존재', () => {
    renderWithProviders(<SettingsPage />, { withAuth: true })
    expect(screen.getByPlaceholderText('이름 입력')).toBeInTheDocument()
  })

  it('주기 설정 섹션 표시', () => {
    renderWithProviders(<SettingsPage />, { withAuth: true })
    expect(screen.getByText(/주기 설정/)).toBeInTheDocument()
    expect(screen.getByText('평균 생리 주기')).toBeInTheDocument()
    expect(screen.getByText('평균 생리 기간')).toBeInTheDocument()
  })

  it('설정 저장 버튼 존재', () => {
    renderWithProviders(<SettingsPage />, { withAuth: true })
    expect(screen.getByText('설정 저장')).toBeInTheDocument()
  })

  it('파트너 공유 섹션 표시', () => {
    renderWithProviders(<SettingsPage />, { withAuth: true })
    expect(screen.getByText(/파트너 공유/)).toBeInTheDocument()
    expect(screen.getByText('초대 링크 생성')).toBeInTheDocument()
  })

  it('데이터 관리 섹션 표시', () => {
    renderWithProviders(<SettingsPage />, { withAuth: true })
    expect(screen.getByText(/데이터 관리/)).toBeInTheDocument()
    expect(screen.getByText(/내 데이터 다운로드/)).toBeInTheDocument()
  })

  it('개인정보 섹션 표시', () => {
    renderWithProviders(<SettingsPage />, { withAuth: true })
    expect(screen.getByText(/개인정보/)).toBeInTheDocument()
  })

  it('로그아웃 버튼 존재', () => {
    renderWithProviders(<SettingsPage />, { withAuth: true })
    expect(screen.getByText('로그아웃')).toBeInTheDocument()
  })

  it('버전 정보 표시', () => {
    renderWithProviders(<SettingsPage />, { withAuth: true })
    expect(screen.getByText('달빛 v1.0.0')).toBeInTheDocument()
  })

  it('주기 기본값 표시 (28일, 5일)', () => {
    renderWithProviders(<SettingsPage />, { withAuth: true })
    expect(screen.getByText('28일')).toBeInTheDocument()
    expect(screen.getByText('5일')).toBeInTheDocument()
  })

  it('위험 구역 섹션 표시', () => {
    renderWithProviders(<SettingsPage />, { withAuth: true })
    expect(screen.getByText(/위험 구역/)).toBeInTheDocument()
  })

  it('전체 데이터 삭제 버튼 존재', () => {
    renderWithProviders(<SettingsPage />, { withAuth: true })
    expect(screen.getByText(/전체 데이터 삭제/)).toBeInTheDocument()
  })

  it('위험 구역 설명 텍스트 표시', () => {
    renderWithProviders(<SettingsPage />, { withAuth: true })
    expect(screen.getByText(/되돌릴 수 없습니다/)).toBeInTheDocument()
  })
})
