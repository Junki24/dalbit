import { useToast } from '@/contexts/ToastContext'
import './Toast.css'

const TOAST_ICONS: Record<string, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
}

export function ToastContainer() {
  const { toasts } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="toast-container" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.type}`}>
          <span className="toast-icon">{TOAST_ICONS[toast.type]}</span>
          <span className="toast-message">{toast.message}</span>
        </div>
      ))}
    </div>
  )
}

export function ConfirmDialog() {
  const { confirmState, handleConfirmResolve } = useToast()

  if (!confirmState) return null

  const { options } = confirmState
  return (
    <div className="confirm-overlay" onClick={() => handleConfirmResolve(false)}>
      <div
        className={`confirm-dialog ${options.danger ? 'confirm-dialog--danger' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
      >
        <h3 id="confirm-title" className="confirm-title">{options.title}</h3>
        <p id="confirm-message" className="confirm-message">{options.message}</p>
        <div className="confirm-actions">
          <button
            className="confirm-btn confirm-btn--cancel"
            onClick={() => handleConfirmResolve(false)}
          >
            {options.cancelText ?? '취소'}
          </button>
          <button
            className={`confirm-btn confirm-btn--confirm ${options.danger ? 'confirm-btn--danger' : ''}`}
            onClick={() => handleConfirmResolve(true)}
          >
            {options.confirmText ?? '확인'}
          </button>
        </div>
      </div>
    </div>
  )
}
