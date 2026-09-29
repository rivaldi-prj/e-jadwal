import React, { useState, useMemo } from 'react';
import {
  X,
  Clock,
  BookOpen,
  User,
  Calendar,
  Layers,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Radio,
  CalendarDays,
} from 'lucide-react';
import { TIME_SLOTS, BATCHES, BOOKING_STATUS } from '../constants/scheduleConfig';

export function TodayScheduleModal({
  isOpen,
  onClose,
  bookings = [],
  currentDay,
  formattedDate,
  formattedTime,
  currentTotalMinutes = 0,
  activeSlot = null,
  remainingSecondsInSlot = 0,
  zoomConfig = {},
  isAdmin = false,
  onSelectBooking = null,
  onShowToast = null,
}) {
  const [selectedBatch, setSelectedBatch] = useState('ALL');

  // Filter all approved bookings for today
  const todayBookings = useMemo(() => {
    return bookings.filter(b => {
      if (b.status === BOOKING_STATUS.REJECTED) return false;
      const isApproved = !b.status || b.status === BOOKING_STATUS.APPROVED;
      return isApproved && b.day === currentDay;
    });
  }, [bookings, currentDay]);

  // Bookings filtered by selected batch
  const filteredTodayBookings = useMemo(() => {
    if (selectedBatch === 'ALL') return todayBookings;
    return todayBookings.filter(b => b.batch === selectedBatch);
  }, [todayBookings, selectedBatch]);

  // Find currently active booking right now
  const liveBooking = useMemo(() => {
    if (!activeSlot) return null;
    return todayBookings.find(b => b.timeSlot === activeSlot.label);
  }, [todayBookings, activeSlot]);

  if (!isOpen) return null;

  const formatCountdown = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Helper to determine slot progress status
  const getSlotStatus = (slot) => {
    const startMin = slot.startH * 60 + slot.startM;
    const endMin = slot.endH * 60 + slot.endM;

    if (activeSlot && activeSlot.label === slot.label) {
      return { status: 'LIVE', label: 'SEDANG LIVE', color: 'rose' };
    }
    if (currentTotalMinutes > endMin) {
      return { status: 'PASSED', label: 'SELESAI', color: 'slate' };
    }
    const minsUntil = Math.max(0, startMin - currentTotalMinutes);
    return {
      status: 'UPCOMING',
      label: minsUntil > 0 ? `~${minsUntil} mnt lagi` : 'SEGERA',
      color: 'amber',
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden transform transition-all animate-modal-pop">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between bg-gradient-to-r from-emerald-50/70 via-white to-amber-50/30 dark:from-emerald-950/30 dark:via-zinc-900 dark:to-zinc-900/80 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-2xs">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 tracking-tight">
                  Kuliah Hari Ini ({currentDay})
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Monitor
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3.5 h-3.5" />
                <span>{formattedDate} &bull; <strong>{formattedTime}</strong></span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Angkatan Filter Tabs */}
        <div className="px-5 py-2.5 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/50 flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0">
          <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase mr-1">Angkatan:</span>
          <button
            type="button"
            onClick={() => setSelectedBatch('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              selectedBatch === 'ALL'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800'
            }`}
          >
            Semua ({todayBookings.length})
          </button>
          {BATCHES.map(b => {
            const count = todayBookings.filter(item => item.batch === b.id).length;
            const isSelected = selectedBatch === b.id;
            return (
              <button
                type="button"
                key={b.id}
                onClick={() => setSelectedBatch(b.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? `${b.activeTab} shadow-xs ring-1 ring-inset ring-black/5`
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : b.dot}`} />
                <span>{b.id}</span>
                <span className="text-[10px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Active Live Banner (Hero Card) */}
          {liveBooking && (
            <div className="p-4 rounded-xl border border-rose-300 dark:border-rose-900/70 bg-gradient-to-r from-rose-50/90 via-white to-amber-50/30 dark:from-rose-950/40 dark:via-zinc-900 dark:to-zinc-900 shadow-sm animate-fade-in animate-live-card-glow">
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-extrabold bg-rose-600 text-white shadow-2xs tracking-wider">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-radar-ring absolute inline-flex h-full w-full rounded-full bg-rose-300 opacity-80"></span>
                      <span className="animate-radar-ring-delayed absolute inline-flex h-full w-full rounded-full bg-white opacity-60"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                    </span>
                    SEDANG BERLANGSUNG
                  </span>
                  <span className="text-xs font-mono text-rose-800 dark:text-rose-300 font-semibold">
                    {activeSlot?.label} WIB
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-mono text-rose-700 dark:text-rose-300 font-bold px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900">
                  <Clock className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 animate-clock-tick" />
                  <span>Sisa {formatCountdown(remainingSecondsInSlot)}</span>
                </div>
              </div>

              <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight mb-1">
                {liveBooking.note}
              </h4>

              <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400 mt-2">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                  BATCHES.find(b => b.id === liveBooking.batch)?.badge || 'bg-slate-100 text-slate-700'
                }`}>
                  Angkatan {liveBooking.batch}
                </span>
                {liveBooking.pic && (
                  <div className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Dosen: <strong>{liveBooking.pic}</strong></span>
                  </div>
                )}
              </div>

              {/* Virtual Room Access Info */}
              <div className="mt-3 pt-3 border-t border-rose-200/60 dark:border-rose-900/40 flex items-center justify-between gap-2">
                {isAdmin ? (
                  <a
                    href={(liveBooking.room === 'gmeet' ? zoomConfig?.gmeetUrl : zoomConfig?.joinUrl) || 'https://meet.google.com/kqe-reho-vbd'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors cursor-pointer ${
                      liveBooking.room === 'gmeet'
                        ? 'bg-teal-600 hover:bg-teal-700'
                        : 'bg-[#17324D] hover:bg-[#112437]'
                    }`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{liveBooking.room === 'gmeet' ? 'Buka Google Meet' : 'Buka Ruang Zoom'}</span>
                  </a>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>
                      {liveBooking.room === 'gmeet'
                        ? `Tautan Google Meet perkuliahan telah dibagikan melalui PJ Angkatan ${liveBooking.batch}.`
                        : `Tautan & Passcode Zoom telah dibagikan melalui PJ Angkatan ${liveBooking.batch}.`}
                    </span>
                  </div>
                )}

                {onSelectBooking && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSelectBooking(liveBooking);
                    }}
                    className="text-xs font-semibold text-rose-700 dark:text-rose-300 hover:underline cursor-pointer flex items-center gap-0.5 ml-auto"
                  >
                    <span>Rincian</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Timeline of all 6 slots today */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-semibold px-1">
              <span>Rangkaian Sesi Kuliah Hari Ini</span>
              <span>{filteredTodayBookings.length} Kuliah Terjadwal</span>
            </div>

            {TIME_SLOTS.map((slot, index) => {
              const slotStatus = getSlotStatus(slot);
              const slotBookings = filteredTodayBookings.filter(b => b.timeSlot === slot.label);
              const isLive = slotStatus.status === 'LIVE';

              return (
                <div
                  key={slot.id}
                  className={`rounded-xl border p-3.5 transition-all ${
                    isLive
                      ? 'border-rose-300 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-950/20 ring-1 ring-rose-300/50 dark:ring-rose-800/40'
                      : slotStatus.status === 'PASSED'
                      ? 'border-zinc-200/70 dark:border-zinc-800/70 bg-zinc-50/50 dark:bg-zinc-900/30 opacity-80'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  {/* Slot Header */}
                  <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-zinc-100 dark:border-zinc-800/60">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[11px] font-bold text-zinc-600 dark:text-zinc-300 flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="font-mono text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        {slot.label} WIB
                      </span>
                    </div>

                    <div>
                      {isLive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                          SEDANG LIVE
                        </span>
                      ) : slotStatus.status === 'PASSED' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          <CheckCircle2 className="w-3 h-3 text-zinc-400" />
                          SELESAI
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-amber-100/70 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/70 dark:border-amber-900/50">
                          <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          {slotStatus.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Slot Content */}
                  {slotBookings.length > 0 ? (
                    <div className="space-y-2">
                      {slotBookings.map((b) => {
                        const batchConfig = BATCHES.find(batch => batch.id === b.batch);
                        return (
                          <div
                            key={b.id}
                            onClick={() => {
                              if (onSelectBooking) {
                                onClose();
                                onSelectBooking(b);
                              }
                            }}
                            className="p-2.5 rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex items-center justify-between gap-3 cursor-pointer group shadow-2xs"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                  batchConfig?.badge || 'bg-slate-100 text-slate-700'
                                }`}>
                                  Angkatan {b.batch}
                                </span>
                                <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9.5px] font-bold ${
                                  (b.room || 'zoom') === 'gmeet'
                                    ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                                    : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                                }`}>
                                  {(b.room || 'zoom') === 'gmeet' ? 'Meet' : 'Zoom'}
                                </span>
                                <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                  {b.note}
                                </span>
                              </div>
                              {b.pic && (
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1 truncate">
                                  <User className="w-3 h-3 text-zinc-400 shrink-0" />
                                  <span>{b.pic}</span>
                                </p>
                              )}
                            </div>

                            <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 group-hover:translate-x-0.5 transition-all shrink-0" />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-2.5 text-center text-xs text-zinc-400 dark:text-zinc-500 italic bg-zinc-50/50 dark:bg-zinc-900/20 rounded-lg border border-dashed border-zinc-200/70 dark:border-zinc-800/60">
                      Ruang Zoom kosong &bull; Tidak ada jadwal kuliah di sesi ini
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-zinc-900/60 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            Total <strong>{filteredTodayBookings.length}</strong> sesi kuliah hari ini untuk{' '}
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
              {selectedBatch === 'ALL' ? 'Semua Angkatan' : `Angkatan ${selectedBatch}`}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white transition-colors cursor-pointer shadow-xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
