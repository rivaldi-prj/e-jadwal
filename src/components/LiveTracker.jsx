import React, { useState } from 'react';
import {
  Radio,
  ExternalLink,
  Copy,
  Check,
  Clock,
  User,
  BookOpen,
  Calendar,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { BATCHES } from '../constants/scheduleConfig';

import { copyToClipboard } from '../utils/clipboard';

export function LiveTracker({
  currentDay,
  formattedTime,
  activeSlot,
  remainingSecondsInSlot,
  bookings,
  zoomConfig,
  nextSlot,
  minutesUntilNextSlot,
  onShowToast,
}) {
  const [copiedField, setCopiedField] = useState(null);

  // Find if there is a booking matching currentDay and activeSlot
  const currentBooking = activeSlot
    ? bookings.find(b => b.day === currentDay && b.timeSlot === activeSlot.label)
    : null;

  // Find next booking today
  const nextBookingToday = nextSlot
    ? bookings.find(b => b.day === currentDay && b.timeSlot === nextSlot.label)
    : null;

  const currentBatch = currentBooking
    ? BATCHES.find(b => b.id === currentBooking.batch)
    : null;

  const handleCopy = async (text, fieldName) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedField(fieldName);
      onShowToast({
        type: 'success',
        title: 'Tersalin ke Clipboard!',
        message: `${fieldName} berhasil disalin.`,
      });
      setTimeout(() => {
        setCopiedField(null);
      }, 2000);
    } else {
      onShowToast({
        type: 'error',
        title: 'Gagal Menyalin',
        message: `Tidak dapat mengakses clipboard. Silakan salin manual: ${text}`,
      });
    }
  };

  // Format countdown mm:ss
  const formatCountdown = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Calculate slot progress percentage
  const totalSlotDurationSeconds = activeSlot
    ? ((activeSlot.endH * 60 + activeSlot.endM) - (activeSlot.startH * 60 + activeSlot.startM)) * 60
    : 1;
  const elapsedSeconds = totalSlotDurationSeconds - remainingSecondsInSlot;
  const progressPercent = Math.min(100, Math.max(0, (elapsedSeconds / totalSlotDurationSeconds) * 100));

  return (
    <div className="no-print bg-white dark:bg-zinc-900/90 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs mb-3 sm:mb-3.5 overflow-hidden transition-all">
      <div className="p-3.5 sm:p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5 lg:gap-5">
          {/* Status & Session Details */}
          <div className="flex-1 min-w-0">
            {/* Header Status Tag */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {currentBooking ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                  <span className="tracking-wide uppercase font-semibold">Live Sekarang</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span className="tracking-wide uppercase font-semibold">Ruangan Tersedia</span>
                </div>
              )}

              <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 font-medium">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                <span>{currentDay}</span>
                <span className="text-zinc-300 dark:text-zinc-700">&bull;</span>
                <span>Slot: <strong className="font-mono text-zinc-700 dark:text-zinc-300 font-semibold">{activeSlot ? activeSlot.label : 'Di luar jam baku'}</strong></span>
              </span>
            </div>

            {/* Main Info */}
            {currentBooking ? (
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-medium ${currentBatch?.badge || 'bg-zinc-100 text-zinc-700'}`}>
                    Angkatan {currentBooking.batch}
                  </span>
                  <h2 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                    {currentBooking.note || 'Kegiatan Perkuliahan'}
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-zinc-600 dark:text-zinc-400 mb-2.5">
                  {currentBooking.pic && (
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Dosen: <strong className="font-medium text-zinc-800 dark:text-zinc-200">{currentBooking.pic}</strong></span>
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 font-mono text-zinc-500">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Waktu: {activeSlot?.label} WIB</span>
                  </span>
                </div>

                {/* Clean Countdown & Subtle Progress */}
                <div className="max-w-xs sm:max-w-sm">
                  <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                    <span className="text-[11px]">Sisa Waktu Sesi</span>
                    <span className="font-mono font-semibold text-rose-600 dark:text-rose-400 text-xs">
                      {formatCountdown(remainingSecondsInSlot)}
                    </span>
                  </div>
                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-rose-500 dark:bg-rose-400 h-full rounded-full transition-all duration-1000 ease-linear"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight mb-0.5">
                  Tidak Ada Perkuliahan Berlangsung Saat Ini
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xl mb-2.5 leading-relaxed">
                  Akun Zoom saat ini sedang kosong dan siap digunakan untuk persiapan perkuliahan atau sesi berikutnya.
                </p>

                {nextBookingToday ? (
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60 text-xs text-zinc-700 dark:text-zinc-300">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    <span>
                      Jadwal berikutnya: <strong className="font-medium">Angkatan {nextBookingToday.batch}</strong> &mdash; {nextBookingToday.note || 'Kuliah'} (<span className="font-mono">{nextSlot?.label}</span>, ~{minutesUntilNextSlot} menit lagi)
                    </span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60 text-xs text-zinc-500 dark:text-zinc-400">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Tidak ada jadwal perkuliahan tersisa untuk hari ini.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Zoom Credentials & Direct Access */}
          <div className="w-full lg:w-auto flex flex-col sm:flex-row lg:flex-col gap-2 min-w-[240px]">
            {/* Direct Join Button */}
            <a
              href={zoomConfig.joinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl font-medium text-xs bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-xs transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka Ruang Zoom</span>
            </a>

            {/* Quick Copy Credentials */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleCopy(zoomConfig.meetingId, 'Meeting ID')}
                className="flex items-center justify-between px-2.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/80 hover:border-zinc-300 dark:hover:border-zinc-600 text-xs text-zinc-700 dark:text-zinc-200 transition-colors group"
                title="Klik untuk salin Meeting ID"
              >
                <div className="text-left overflow-hidden">
                  <div className="text-[10px] text-zinc-400 font-medium">Meeting ID</div>
                  <div className="font-mono font-semibold text-xs truncate">{zoomConfig.meetingId}</div>
                </div>
                {copiedField === 'Meeting ID' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 flex-shrink-0" />
                )}
              </button>

              <button
                onClick={() => handleCopy(zoomConfig.passcode, 'Passcode')}
                className="flex items-center justify-between px-2.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/80 hover:border-zinc-300 dark:hover:border-zinc-600 text-xs text-zinc-700 dark:text-zinc-200 transition-colors group"
                title="Klik untuk salin Passcode"
              >
                <div className="text-left overflow-hidden">
                  <div className="text-[10px] text-zinc-400 font-medium">Passcode</div>
                  <div className="font-mono font-semibold text-xs truncate">{zoomConfig.passcode}</div>
                </div>
                {copiedField === 'Passcode' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 flex-shrink-0" />
                )}
              </button>
            </div>

            {/* Copy Zoom Link */}
            <button
              onClick={() => {
                handleCopy(zoomConfig.joinUrl, 'Link Zoom');
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs text-zinc-600 dark:text-zinc-300 transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
              title="Klik untuk menyalin langsung tautan/link Zoom Meeting"
            >
              {copiedField === 'Link Zoom' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Link Zoom Disalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="text-[11px]">Salin Link Zoom</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
