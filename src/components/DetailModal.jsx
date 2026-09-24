import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  BookOpen,
  ExternalLink,
  Copy,
  Check,
  Radio,
  Layers
} from 'lucide-react';
import { BATCHES } from '../constants/scheduleConfig';
import { copyToClipboard } from '../utils/clipboard';

export function DetailModal({
  isOpen,
  onClose,
  booking,
  zoomConfig,
  currentDay,
  activeSlot,
  onShowToast,
}) {
  const [copiedField, setCopiedField] = useState(null);

  if (!isOpen || !booking) return null;

  const batchInfo = BATCHES.find(b => b.id === booking.batch) || {
    badge: 'bg-slate-100 text-slate-700 border border-slate-200',
    dot: 'bg-slate-500',
  };

  const isLiveNow = currentDay && activeSlot && booking.day === currentDay && booking.timeSlot === activeSlot;

  const handleCopy = async (text, label) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedField(label);
      onShowToast({
        type: 'success',
        title: 'Tersalin!',
        message: `${label} berhasil disalin ke clipboard.`,
      });
      setTimeout(() => setCopiedField(null), 2000);
    } else {
      onShowToast({
        type: 'error',
        title: 'Gagal Menyalin',
        message: `Silakan salin teks manual: ${text}`,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md max-h-[92vh] flex flex-col bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden transform transition-all">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/60 dark:bg-zinc-900/60 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${batchInfo.badge}`}>
              Angkatan {booking.batch}
            </span>
            {isLiveNow && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                <span>SEDANG LIVE</span>
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Mata Kuliah / Kegiatan
            </span>
            <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 leading-snug tracking-tight">
              {booking.note || 'Kegiatan Perkuliahan'}
            </h3>
          </div>

          <div className="space-y-2 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/60">
            <div className="flex items-center gap-2.5 text-xs text-zinc-700 dark:text-zinc-300">
              <Calendar className="w-4 h-4 text-zinc-400 flex-shrink-0" />
              <span>Hari: <strong className="font-semibold text-zinc-900 dark:text-zinc-100">{booking.day}</strong></span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-zinc-700 dark:text-zinc-300">
              <Clock className="w-4 h-4 text-zinc-400 flex-shrink-0" />
              <span>Waktu: <strong className="font-mono text-zinc-900 dark:text-zinc-100">{booking.timeSlot} WIB</strong></span>
            </div>
            {booking.pic && (
              <div className="flex items-center gap-2.5 text-xs text-zinc-700 dark:text-zinc-300">
                <User className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                <span>Dosen: <strong className="font-medium text-zinc-900 dark:text-zinc-100">{booking.pic}</strong></span>
              </div>
            )}
          </div>

          {/* Quick Copy Credentials for Zoom */}
          <div className="space-y-2 pt-0.5">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">
              Akses Tautan & ID Zoom
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleCopy(zoomConfig.meetingId, 'Meeting ID')}
                className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-zinc-50/50 dark:bg-zinc-800/50 hover:border-zinc-300 dark:hover:border-zinc-600 text-left transition-colors group"
              >
                <div>
                  <div className="text-[10px] text-zinc-400 font-medium">Meeting ID</div>
                  <div className="font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-200">{zoomConfig.meetingId}</div>
                </div>
                {copiedField === 'Meeting ID' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600" />}
              </button>

              <button
                onClick={() => handleCopy(zoomConfig.passcode, 'Passcode')}
                className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-zinc-50/50 dark:bg-zinc-800/50 hover:border-zinc-300 dark:hover:border-zinc-600 text-left transition-colors group"
              >
                <div>
                  <div className="text-[10px] text-zinc-400 font-medium">Passcode</div>
                  <div className="font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-200">{zoomConfig.passcode}</div>
                </div>
                {copiedField === 'Passcode' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600" />}
              </button>
            </div>
          </div>

          {/* Action Join & Copy Link */}
          <div className="pt-1 flex items-center gap-2">
            <a
              href={zoomConfig.joinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-xs bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-xs transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka Ruang Zoom</span>
            </a>
            <button
              type="button"
              onClick={() => handleCopy(zoomConfig.joinUrl, 'Link Zoom')}
              title="Salin Link Zoom Meeting"
              className="px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 transition-colors"
            >
              {copiedField === 'Link Zoom' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="text-[11px]">Salin Link</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
