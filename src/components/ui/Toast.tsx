import * as React from 'react'
import { cn } from '@/components/lib/utils'
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react'

export type ToastType = 'success' | 'warning' | 'error' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  description?: string
  duration?: number
}

interface ToastItemProps {
  toast: Toast
  onRemove: (id: string) => void
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [isExiting, setIsExiting] = React.useState(false)

  React.useEffect(() => {
    const duration = toast.duration ?? 3000
    const timer = setTimeout(() => {
      setIsExiting(true)
      setTimeout(() => onRemove(toast.id), 200)
    }, duration)

    return () => clearTimeout(timer)
  }, [toast, onRemove])

  const icons = {
    success: CheckCircle2,
    warning: AlertTriangle,
    error: AlertCircle,
    info: Info,
  }

  const Icon = icons[toast.type]

  const styles = {
    success: {
      icon: 'text-status-success',
      bg: 'bg-status-success-bg',
      border: 'border-status-success/30',
    },
    warning: {
      icon: 'text-status-warning',
      bg: 'bg-status-warning-bg',
      border: 'border-status-warning/30',
    },
    error: {
      icon: 'text-status-error',
      bg: 'bg-status-error-bg',
      border: 'border-status-error/30',
    },
    info: {
      icon: 'text-warm-300',
      bg: 'bg-warm-glow/20',
      border: 'border-warm-300/30',
    },
  }

  const style = styles[toast.type]

  return (
    <div
      className={cn(
        'pointer-events-auto flex w-80 items-start gap-3 rounded-lg border p-3 shadow-lg backdrop-blur-sm transition-all duration-200',
        style.bg,
        style.border,
        'bg-bg-elevated/95',
        isExiting
          ? 'translate-x-full opacity-0'
          : 'translate-x-0 opacity-100'
      )}
    >
      <Icon size={16} strokeWidth={1.5} className={cn('mt-0.5 shrink-0', style.icon)} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-text-primary">{toast.title}</div>
        {toast.description && (
          <div className="mt-1 text-xs text-text-secondary">{toast.description}</div>
        )}
      </div>
      <button
        onClick={() => {
          setIsExiting(true)
          setTimeout(() => onRemove(toast.id), 200)
        }}
        className="shrink-0 rounded p-0.5 text-text-muted hover:bg-white/10 hover:text-text-secondary"
      >
        <X size={14} />
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: Toast[]
  onRemove: (id: string) => void
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}

// Toast context and hook
interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const addToast = React.useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(7)
    setToasts((prev) => [...prev, { ...toast, id }])
  }, [])

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
