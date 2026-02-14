import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: number
  message: string
  type: ToastType
}

interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

interface ToastContextType {
  toasts: Toast[]
  showToast: (message: string, type?: ToastType) => void
  confirm: (options: ConfirmOptions) => Promise<boolean>
  confirmState: ConfirmState | null
  handleConfirmResolve: (result: boolean) => void
}

interface ConfirmState {
  options: ConfirmOptions
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)
  const confirmResolveRef = useRef<((val: boolean) => void) | null>(null)
  const nextId = useRef(0)

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = nextId.current++
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      confirmResolveRef.current = resolve
      setConfirmState({ options })
    })
  }, [])

  const handleConfirmResolve = useCallback((result: boolean) => {
    confirmResolveRef.current?.(result)
    confirmResolveRef.current = null
    setConfirmState(null)
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, showToast, confirm, confirmState, handleConfirmResolve }}>
      {children}
    </ToastContext.Provider>
  )
}
