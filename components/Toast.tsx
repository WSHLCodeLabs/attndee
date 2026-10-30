'use client';

/**
 * Toast Notification Component & Hook - Attndee
 * 
 * Minimalist, production-grade toast notification system matching
 * Attndee's signature black / white / blue (#0051fc) design language.
 */

import { useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

/**
 * Custom hook to manage toast state and automated dismissal
 */
export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (
      title: string,
      type: ToastType = 'info',
      description?: string,
      durationMs: number = 4000
    ) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newToast: ToastMessage = { id, type, title, description };

      setToasts((prev) => [...prev, newToast]);

      if (durationMs > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, durationMs);
      }

      return id;
    },
    [dismissToast]
  );

  return { toasts, showToast, dismissToast };
}

const toastConfig: Record<
  ToastType,
  {
    icon: typeof Info;
    iconColor: string;
    badgeBg: string;
    borderColor: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    iconColor: 'text-emerald-600',
    badgeBg: 'bg-emerald-50',
    borderColor: 'border-emerald-200/80',
  },
  error: {
    icon: AlertCircle,
    iconColor: 'text-rose-600',
    badgeBg: 'bg-rose-50',
    borderColor: 'border-rose-200/80',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    badgeBg: 'bg-amber-50',
    borderColor: 'border-amber-200/80',
  },
  info: {
    icon: Info,
    iconColor: 'text-blue-600',
    badgeBg: 'bg-blue-50',
    borderColor: 'border-blue-200/80',
  },
};

/**
 * Floating Toast Container rendering active notifications
 */
export default function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((toast) => {
        const config = toastConfig[toast.type] || toastConfig.info;
        const Icon = config.icon;

        return (
          <div
            key={toast.id}
            role="alert"
            className={`pointer-events-auto flex items-start gap-3.5 p-4 rounded-2xl bg-white border ${config.borderColor} shadow-xl shadow-black/10 transition-all duration-300`}
            style={{
              animation: 'toastSlideIn 260ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-xl ${config.badgeBg} flex items-center justify-center mt-0.5`}
            >
              <Icon className={`w-4 h-4 ${config.iconColor}`} />
            </div>

            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-sm font-semibold text-black leading-snug">
                {toast.title}
              </p>
              {toast.description && (
                <p className="text-xs text-gray-600 mt-1 leading-relaxed break-words">
                  {toast.description}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-black rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}

      <style jsx>{`
        @keyframes toastSlideIn {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
