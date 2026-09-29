import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  ExternalLink,
  Copy,
  Check,
  Lock,
  ShieldCheck,
  Video,
  Share2,
} from 'lucide-react';
import { BATCHES, DEFAULT_ZOOM_CONFIG } from '../constants/scheduleConfig';
import { copyToClipboard } from '../utils/clipboard';
import { openWhatsAppShare } from '../utils/shareUtils';

export function DetailModal({
  isOpen,
  onClose,
  booking,
  zoomConfig,
  isLiveNow,
  onShowToast,
  isAdmin = false,
  isAuthorized = false,
  onOpenCampusLogin = null,
}) {
  const [copiedField, setCopiedField] = useState(null);

  if (!isOpen || !booking) return null;

  const batchInfo = BATCHES.find(b => b.id === booking.batch) || {
    badge: 'bg-slate-100 text-slate-700 border border-slate-200',
    dot: 'bg-slate-500',
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md max-h-[92vh] flex flex-col bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden transform transition-all animate-modal-pop">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50/80 dark:bg-zinc-900/60 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${batchInfo.badge}`}>
              Angkatan {booking.batch}
            </span>
            {(booking.room || 'zoom') === 'gmeet' ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-800 dark:text-teal-300 bg-teal-100 dark:bg-teal-950/60 px-2 py-0.5 rounded border border-teal-300 dark:border-teal-800">
                <Video className="w-3 h-3 text-teal-600" />
                <span>GOOGLE MEET</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-800 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/60 px-2 py-0.5 rounded border border-sky-300 dark:border-sky-800">
                <span>ZOOM</span>
              </span>
            )}
            {isLiveNow && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60 px-2 py-0.5 rounded border border-rose-300 dark:border-rose-800">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
                <span>SEDANG LIVE</span>
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              Mata Kuliah / Kegiatan
            </span>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100 mt-0.5 leading-snug tracking-tight">
              {booking.note || 'Kegiatan Perkuliahan'}
            </h3>
          </div>

          <div className="space-y-2 p-3 rounded-lg bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/60 text-xs">
            <div className="flex items-center gap-2.5 text-slate-700 dark:text-zinc-300">
              <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span>Hari: <strong className="font-semibold text-slate-900 dark:text-zinc-100">{booking.day}</strong></span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-700 dark:text-zinc-300">
              <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span>Waktu: <strong className="font-mono text-slate-900 dark:text-zinc-100">{booking.timeSlot} WIB</strong></span>
            </div>
            {booking.pic && (
              <div className="flex items-center gap-2.5 text-slate-700 dark:text-zinc-300">
                <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span>Dosen: <strong className="font-medium text-slate-900 dark:text-zinc-100">{booking.pic}</strong></span>
              </div>
            )}
            <div className="flex items-center gap-2.5 text-slate-700 dark:text-zinc-300">
              <Video className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span>
                Ruang Virtual:{' '}
                <strong className={(booking.room || 'zoom') === 'gmeet' ? 'text-teal-700 dark:text-teal-300 font-semibold' : 'text-sky-700 dark:text-sky-300 font-semibold'}>
                  {(booking.room || 'zoom') === 'gmeet' ? 'Google Meet' : (zoomConfig?.name || 'Zoom Kebidanan')}
                </strong>
              </span>
            </div>
          </div>

          {/* Virtual Room Access Area */}
          {(booking.room || 'zoom') === 'gmeet' ? (
            isAdmin ? (
              <div className="space-y-3 pt-1">
                <div className="p-3 rounded-xl bg-teal-50/90 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/80">
                  <div className="flex items-center gap-2 mb-1.5 text-teal-900 dark:text-teal-200 font-semibold text-xs">
                    <Video className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>Ruang Google Meet (Admin)</span>
                  </div>
                  <p className="text-[11.5px] text-teal-800/90 dark:text-teal-300/90 leading-relaxed mb-3">
                    Perkuliahan ini menggunakan Google Meet karena ruang Zoom sedang dipakai oleh sesi lain pada waktu yang sama.
                  </p>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <a
                      href={zoomConfig?.gmeetUrl || DEFAULT_ZOOM_CONFIG.gmeetUrl || 'https://meet.google.com/kqe-reho-vbd'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-semibold text-xs bg-teal-600 hover:bg-teal-700 text-white shadow-2xs transition-colors cursor-pointer"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Buka Google Meet</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => handleCopy(zoomConfig?.gmeetUrl || DEFAULT_ZOOM_CONFIG.gmeetUrl || 'https://meet.google.com/kqe-reho-vbd', 'Link Google Meet')}
                      title="Salin Link Google Meet"
                      className="px-3 py-2 rounded-lg border border-teal-200 dark:border-teal-800 bg-white dark:bg-zinc-900 hover:bg-teal-50 dark:hover:bg-zinc-800 text-xs font-medium text-teal-800 dark:text-teal-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copiedField === 'Link Google Meet' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-[11px] text-emerald-600 font-semibold">Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-teal-600" />
                          <span className="text-[11px]">Salin Link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openWhatsAppShare(booking, zoomConfig)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Bagikan ke WhatsApp Grup Kelas</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-semibold text-slate-800 dark:text-zinc-200 block">
                      Akses Ruang Google Meet Terproteksi
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                      Tautan Google Meet dibagikan secara khusus oleh Koordinator/Pemohon jadwal kepada dosen pengampu dan mahasiswa di kelas yang bersangkutan.
                    </p>
                  </div>
                </div>
              </div>
            )
          ) : isAdmin ? (
            <div className="space-y-2 pt-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block">
                Akses Tautan & Kredensial Zoom (Admin Only)
              </span>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(zoomConfig?.meetingId || DEFAULT_ZOOM_CONFIG.meetingId, 'Meeting ID')}
                  className="flex items-center justify-between p-2 rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 text-left transition-colors cursor-pointer group"
                >
                  <div>
                    <div className="text-[10px] text-slate-400 font-medium">Meeting ID</div>
                    <div className="font-mono text-xs font-semibold text-slate-900 dark:text-zinc-100">{zoomConfig?.meetingId || DEFAULT_ZOOM_CONFIG.meetingId}</div>
                  </div>
                  {copiedField === 'Meeting ID' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleCopy(zoomConfig?.passcode || DEFAULT_ZOOM_CONFIG.passcode, 'Passcode')}
                  className="flex items-center justify-between p-2 rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 text-left transition-colors cursor-pointer group"
                >
                  <div>
                    <div className="text-[10px] text-slate-400 font-medium">Passcode</div>
                    <div className="font-mono text-xs font-semibold text-slate-900 dark:text-zinc-100">{zoomConfig?.passcode || DEFAULT_ZOOM_CONFIG.passcode}</div>
                  </div>
                  {copiedField === 'Passcode' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                </button>
              </div>

              {/* Direct Join and Copy Link */}
              <div className="flex items-center gap-2 pt-1">
                <a
                  href={zoomConfig?.joinUrl || DEFAULT_ZOOM_CONFIG.joinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-semibold text-xs bg-[#17324D] hover:bg-[#112437] text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shadow-2xs transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka Ruang Zoom</span>
                </a>

                <button
                  type="button"
                  onClick={() => handleCopy(zoomConfig?.joinUrl || DEFAULT_ZOOM_CONFIG.joinUrl, 'Link Zoom')}
                  title="Salin Link Zoom Meeting"
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedField === 'Link Zoom' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-[11px] text-emerald-600 font-semibold">Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-[11px]">Salin Link</span>
                    </>
                  )}
                </button>
              </div>

              {/* Share to WhatsApp */}
              <button
                type="button"
                onClick={() => openWhatsAppShare(booking, zoomConfig)}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 mt-1.5 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Bagikan ke WhatsApp Grup Kelas</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-semibold text-slate-800 dark:text-zinc-200 block">
                    Akses Ruang Zoom Terproteksi
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    Tautan & Passcode Zoom dibagikan secara khusus oleh Koordinator/Pemohon jadwal kepada dosen pengampu dan mahasiswa di kelas yang bersangkutan.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
