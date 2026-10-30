'use client';

/**
 * ConfirmModal Component - Attndee
 * 
 * Production-ready modal dialog to replace native browser confirm() and alert().
 * Features backdrop blur, smooth entrance, keyboard accessibility (Esc),
 * and Attndee's rounded-3xl minimalist design.
 */

import { useEffect, useCallback } from 'react';
import { AlertCircle, AlertTriangle, HelpCircle, X } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  // Handle ESC key press
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    },
    [onCancel]
  );

  useEffect(() => {
    if (!isOpen) return;

    // Lock body scrolling
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: AlertTriangle,
      iconColor: 'text-rose-600',
      badgeBg: 'bg-rose-50',
      confirmButton:
        'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-200',
    },
    warning: {
      icon: AlertCircle,
      iconColor: 'text-amber-600',
      badgeBg: 'bg-amber-50',
      confirmButton:
        'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-200',
    },
    primary: {
      icon: HelpCircle,
      iconColor: 'text-blue-600',
      badgeBg: 'bg-blue-50',
      confirmButton:
        'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-200',
    },
  }[variant] || {
    icon: HelpCircle,
    iconColor: 'text-blue-600',
    badgeBg: 'bg-blue-50',
    confirmButton:
      'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-200',
  };

  const IconComponent = variantStyles.icon;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      className="fixed inset-0 z-[9990] flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onCancel}
      />

      {/* Modal Card */}
      <div
        className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100 z-10 transition-all transform"
        style={{
          animation: 'modalScaleUp 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-5 right-5 p-2 text-gray-400 hover:text-black rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="flex items-start gap-4 mb-6">
          <div
            className={`w-12 h-12 rounded-2xl ${variantStyles.badgeBg} flex items-center justify-center flex-shrink-0 mt-0.5`}
          >
            <IconComponent className={`w-6 h-6 ${variantStyles.iconColor}`} />
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <h3
              id="confirm-modal-title"
              className="text-xl font-bold text-black tracking-tight"
            >
              {title}
            </h3>
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all shadow-sm focus:outline-none focus:ring-4 ${variantStyles.confirmButton}`}
          >
            {confirmText}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes modalScaleUp {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
