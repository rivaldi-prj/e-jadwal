import React, { useState } from 'react';
import { ShieldCheck, Lock, X, KeyRound, AlertCircle } from 'lucide-react';

export function AdminPinModal({ isOpen, onClose, onVerifyPin, onSuccess }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsChecking(true);
    const valid = await onVerifyPin(pin);
    setIsChecking(false);
    if (valid) {
      setError(false);
      setPin('');
      onSuccess();
      onClose();
    } else {
      setError(true);
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-sm bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden transform transition-all animate-modal-pop">
        {/* Header */}
        <div className="p-6 text-center border-b border-zinc-200/80 dark:border-zinc-800/80 relative bg-zinc-50/50 dark:bg-zinc-900/30">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/50 dark:border-zinc-700/50 flex items-center justify-center mx-auto mb-3 text-zinc-900 dark:text-zinc-100 shadow-2xs">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100 tracking-tight">
            Autentikasi Pengelola
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Masukkan PIN pengelola untuk mengedit atau mengatur jadwal
          </p>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="password"
                maxLength={8}
                autoFocus
                placeholder="PIN Pengelola"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  if (error) setError(false);
                }}
                className={`w-full text-center tracking-widest font-mono text-base font-bold pl-9 pr-4 py-2.5 rounded-xl border bg-zinc-50/80 dark:bg-zinc-900/80 text-zinc-900 dark:text-white focus:outline-none transition-all ${
                  error
                    ? 'border-rose-500 ring-2 ring-rose-500/20 animate-shake-subtle'
                    : 'border-zinc-200 dark:border-zinc-800 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600'
                }`}
              />
            </div>
            {error && (
              <p className="flex items-center justify-center gap-1.5 text-xs text-rose-500 font-medium mt-2">
                <AlertCircle className="w-3.5 h-3.5" />
                PIN salah! Coba periksa kembali.
              </p>
            )}
          </div>

          <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 text-center border border-zinc-200/60 dark:border-zinc-800/60">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
              PIN Default: <strong className="font-mono text-zinc-800 dark:text-zinc-200">1234</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!pin || isChecking}
              className="flex-1 py-2.5 rounded-xl text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-colors flex items-center justify-center gap-1.5"
            >
              {isChecking
                ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white dark:border-zinc-400/30 dark:border-t-zinc-700 rounded-full animate-spin" />Verifikasi...</>
                : 'Buka Akses'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
