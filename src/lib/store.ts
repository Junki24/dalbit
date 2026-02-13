import { create } from 'zustand'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface AppState {
  selectedDate: Date
  setSelectedDate: (date: Date) => void
  showSymptomModal: boolean
  setShowSymptomModal: (show: boolean) => void
  showPeriodModal: boolean
  setShowPeriodModal: (show: boolean) => void
  installPromptEvent: BeforeInstallPromptEvent | null
  setInstallPromptEvent: (event: BeforeInstallPromptEvent | null) => void
  showInstallBanner: boolean
  setShowInstallBanner: (show: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  selectedDate: new Date(),
  setSelectedDate: (date) => set({ selectedDate: date }),
  showSymptomModal: false,
  setShowSymptomModal: (show) => set({ showSymptomModal: show }),
  showPeriodModal: false,
  setShowPeriodModal: (show) => set({ showPeriodModal: show }),
  installPromptEvent: null,
  setInstallPromptEvent: (event) => set({ installPromptEvent: event }),
  showInstallBanner: false,
  setShowInstallBanner: (show) => set({ showInstallBanner: show }),
}))
