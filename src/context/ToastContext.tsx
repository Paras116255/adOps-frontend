/**
 * Lightweight toast notification system.
 *
 * Usage:
 *   const { addToast } = useToast()
 *   addToast("Saved!", "success")
 *   addToast("Something went wrong", "error")
 *
 * Renders an absolutely-positioned stack in the top-right corner.
 * Toasts auto-dismiss after 3.5 seconds.
 */
import {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react"
import { CheckCircle, XCircle, Info, X } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastType = "success" | "error" | "info"

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  addToast: (message: string, type?: ToastType) => void
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

const TOAST_DURATION = 3500 // ms

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((message: string, type: ToastType = "info") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => removeToast(id), TOAST_DURATION)
  }, [removeToast])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <ToastStack toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>")
  return ctx
}

// ─── Toast stack UI ───────────────────────────────────────────────────────────

const styles: Record<ToastType, { bg: string; border: string; icon: string; Icon: typeof CheckCircle }> = {
  success: {
    bg: "bg-white",
    border: "border-green-200",
    icon: "text-green-500",
    Icon: CheckCircle,
  },
  error: {
    bg: "bg-white",
    border: "border-red-200",
    icon: "text-red-500",
    Icon: XCircle,
  },
  info: {
    bg: "bg-white",
    border: "border-blue-200",
    icon: "text-blue-500",
    Icon: Info,
  },
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [visible, setVisible] = useState(false)
  const s = styles[toast.type]
  const { Icon } = s

  // Trigger CSS entrance animation
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      className={`
        flex items-start gap-3 min-w-[260px] max-w-sm w-full
        ${s.bg} border ${s.border} rounded-xl shadow-lg px-4 py-3
        transition-all duration-300
        ${visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"}
      `}
    >
      <Icon size={18} className={`${s.icon} mt-0.5 shrink-0`} />
      <p className="text-sm text-gray-700 flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-gray-300 hover:text-gray-500 transition shrink-0"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  )
}

function ToastStack({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onRemove={onRemove} />
        </div>
      ))}
    </div>
  )
}
