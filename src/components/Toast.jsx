import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, toast.duration || 3500);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />,
    error: <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />,
    info: <Info className="w-5 h-5 text-sky-500 flex-shrink-0" />,
  };

  const bgStyles = {
    success: 'border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900',
    warning: 'border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900',
    error: 'border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900',
    info: 'border-sky-200 dark:border-sky-800 bg-white dark:bg-slate-900',
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-bounce-in transition-all">
      <div className={`p-4 rounded-xl shadow-2xl border flex items-start gap-3 ${bgStyles[toast.type || 'info']} relative overflow-hidden`}>
        {icons[toast.type || 'info']}
        <div className="flex-1 pr-6">
          {toast.title && (
            <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 mb-0.5">
              {toast.title}
            </h4>
          )}
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {toast.message}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded transition-colors"
          aria-label="Tutup notifikasi"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
