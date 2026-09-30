import React, { useState, useEffect } from 'react';
import { TIME_SLOTS, DAYS_OF_WEEK, BATCHES, BOOKING_STATUS, getLecturerInitials } from '../constants/scheduleConfig';
import { ScheduleCell } from './ScheduleCell';
import {
  Calendar,
  Clock,
  LayoutGrid,
  ListFilter,
  User,
  Plus,
  Edit2,
  Info,
  Printer,
  Search,
  RotateCcw,
  Send,
  Inbox,
  ClipboardList,
  HelpCircle,
  Video,
  CheckCheck,
} from 'lucide-react';

export function ScheduleMatrix({
  bookings,
  currentDay,
  activeSlot,
  currentTotalMinutes = 0,
  isAdmin,
  onSelectCell,
  onShowDetail,
  onRequestSlot,
  onOpenTrackRequests,
  onOpenGuideModal,
  myRequestsCount = 0,
  selectedBatch,
  selectedDay,
  searchQuery,
  onResetFilters,
  isLoading = false,
  syncError = null,
  onRefetch = null,
}) {
  // Mobile responsive view mode: 'agenda' (card list per day) or 'matrix' (full spreadsheet grid)
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'agenda';
    }
    return 'matrix';
  });

  // Active day for mobile agenda mode
  const [agendaDay, setAgendaDay] = useState(() => {
    if (selectedDay && selectedDay !== 'ALL') return selectedDay;
    if (DAYS_OF_WEEK.includes(currentDay)) return currentDay;
    return 'Senin';
  });

  // Keep agenda day in sync if user selected a day from global filter
  useEffect(() => {
    if (selectedDay && selectedDay !== 'ALL') {
      setAgendaDay(selectedDay);
    }
  }, [selectedDay]);

  // Filter days if user specifically selected a single day, else show all 7 days
  const displayDays = selectedDay && selectedDay !== 'ALL'
    ? [selectedDay]
    : DAYS_OF_WEEK;


  // Public: only approved. Admin: all bookings
  const visibleBookings = isAdmin
    ? bookings
    : bookings.filter(b => (b.status || BOOKING_STATUS.APPROVED) === BOOKING_STATUS.APPROVED);

  const pendingCount = bookings.filter(b => (b.status || BOOKING_STATUS.APPROVED) === BOOKING_STATUS.PENDING).length;

  const matchesFilter = (booking) => {
    if (!booking) return false;
    if (selectedBatch && selectedBatch !== 'ALL' && booking.batch !== selectedBatch) return false;
    if (searchQuery && searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchNote = (booking.note || '').toLowerCase().includes(q);
      const matchPic = (booking.pic || '').toLowerCase().includes(q);
      const matchBatch = (booking.batch || '').toLowerCase().includes(q);
      if (!matchNote && !matchPic && !matchBatch) return false;
    }
    return true;
  };

  const totalFiltered = visibleBookings.filter(matchesFilter).length;
  const getDayCount = (day) => visibleBookings.filter(b => b.day === day && matchesFilter(b)).length;
  const isFilterActive = (selectedBatch && selectedBatch !== 'ALL') || (selectedDay && selectedDay !== 'ALL') || (searchQuery && searchQuery.trim() !== '');

  return (
    <div className="schedule-table relative bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xs rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs overflow-hidden mb-4 transition-all">
      {/* Top Header & View Switcher */}
      <div className="px-3.5 py-2.5 sm:px-4 sm:py-2.5 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/60 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-zinc-200 tracking-tight">
            Agenda Perkuliahan
          </h3>
          <span className="text-xs text-slate-400 dark:text-zinc-500 font-normal">
            &bull; {totalFiltered} sesi
          </span>
          {isAdmin && pendingCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 animate-pulse">
              <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span>{pendingCount} Pengajuan Menunggu</span>
            </span>
          )}
        </div>

        {/* View Mode Toggle & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {!isAdmin && onRequestSlot && (
            <button
              type="button"
              onClick={() => onRequestSlot({ day: currentDay, slot: activeSlot })}
              className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-amber-500 via-amber-600 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-xs hover:shadow-md hover:shadow-amber-500/20 active:scale-95 transition-all cursor-pointer border border-amber-500/30"
              title="Ajukan Penggunaan Ruang Zoom Perkuliahan"
            >
              <Send className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              <span>Ajukan Jadwal</span>
            </button>
          )}

          {!isAdmin && onOpenTrackRequests && (
            <button
              type="button"
              onClick={onOpenTrackRequests}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-700 dark:text-zinc-300 bg-white hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-all border border-slate-200 dark:border-zinc-700 shadow-2xs cursor-pointer"
              title="Pantau Status Pengajuan Jadwal Saya"
            >
              <ClipboardList className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Status Pengajuan</span>
              {myRequestsCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[9.5px] font-bold flex items-center justify-center">
                  {myRequestsCount}
                </span>
              )}
            </button>
          )}

          {/* Tombol Panduan Mahasiswa */}
          {onOpenGuideModal && (
            <button
              type="button"
              onClick={onOpenGuideModal}
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-700 dark:text-zinc-300 bg-white hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-all border border-slate-200 dark:border-zinc-700 shadow-2xs cursor-pointer"
              title="Panduan & Petunjuk Penggunaan"
            >
              <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
              <span className="hidden sm:inline">Panduan</span>
            </button>
          )}

          {/* Print Button (Available on all devices) */}
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 bg-white hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-all border border-slate-200 dark:border-zinc-700 shadow-2xs cursor-pointer"
            title="Cetak Jadwal Perkuliahan"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cetak</span>
          </button>

          {/* View Mode Toggle (Agenda HP vs Tabel Matriks) */}
          <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-slate-200 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => setViewMode('agenda')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                viewMode === 'agenda'
                  ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
              title="Tampilan Agenda Harian"
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Agenda</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                viewMode === 'matrix'
                  ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
              title="Tampilan Tabel Matriks Mingguan"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Matriks</span>
            </button>
          </div>
        </div>
      </div>

      {/* Loading banner when fetching latest cloud schedule */}
      {isLoading && (
        <div className="px-3.5 py-1.5 bg-amber-500/[0.08] border-b border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
            <span>Memperbarui jadwal perkuliahan dari cloud...</span>
          </div>
        </div>
      )}

      {/* Sync error banner */}
      {syncError && (
        <div className="px-3.5 py-1.5 bg-rose-500/[0.08] border-b border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center justify-between">
          <span>Gagal memperbarui data dari database cloud. Menampilkan data tersimpan.</span>
          {onRefetch && (
            <button
              type="button"
              onClick={onRefetch}
              className="font-semibold underline ml-2 cursor-pointer hover:text-rose-800 dark:hover:text-rose-300"
            >
              Coba lagi
            </button>
          )}
        </div>
      )}

      {/* Empty Filter State (Bug C Resolution: Separates room status from filter results) */}
      {totalFiltered === 0 && isFilterActive ? (
        <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-400 mb-3 border border-slate-200 dark:border-zinc-700">
            <Search className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 mb-1 tracking-tight">
            Tidak Ada Jadwal yang Cocok
          </h4>
          <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mb-4 leading-relaxed">
            Tidak ditemukan jadwal perkuliahan untuk filter atau pencarian Anda. Ketersediaan ruang Zoom secara umum tetap mengacu pada jadwal keseluruhan.
          </p>
          {onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#17324D] hover:bg-[#112437] text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white transition-colors shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Semua Filter</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* 1. MODE AGENDA HARIAN (Responsive & Touch-Friendly untuk HP) */}
          {/* ========================================================================= */}
          {viewMode === 'agenda' && (
            <div className="p-3 sm:p-4">
              {/* Day Selector Pills Bar */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 mb-3.5 scrollbar-none bg-slate-100/90 dark:bg-zinc-800/80 p-1.5 rounded-xl">
                {DAYS_OF_WEEK.map((day) => {
                  const isToday = day === currentDay;
                  const isSelected = day === agendaDay;
                  const dayCount = getDayCount(day);

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setAgendaDay(day)}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs font-semibold'
                          : isToday
                          ? 'text-emerald-700 dark:text-emerald-400 font-medium hover:bg-white/50'
                          : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                      }`}
                    >
                      <span>{day}</span>
                      {isToday && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      )}
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                          isSelected
                            ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold'
                            : 'text-slate-400 dark:text-zinc-500'
                        }`}
                      >
                        {dayCount}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Agenda Slots Timeline Cards */}
              <div className="space-y-2">
                {TIME_SLOTS.map((slot, index) => {
                  const isToday = agendaDay === currentDay;
                  const isCurrentTimeSlot = isToday && activeSlot?.label === slot.label;
                  // Opsi C: slot hari ini yang jam-nya sudah berlalu
                  const slotEndMin = slot.endH * 60 + slot.endM;
                  const isPastSlot = isToday && currentTotalMinutes >= slotEndMin;

                  // Find bookings for this day and slot (respects visibility rules)
                  const rawBookings = visibleBookings.filter(
                    (b) => b.day === agendaDay && b.timeSlot === slot.label
                  );
                  const slotBookings = rawBookings.filter((b) => matchesFilter(b));
                  const hasBookings = slotBookings.length > 0;

                  // LIVE is strictly true ONLY when there is an actual booking AND it is the current active slot
                  const isLiveClass = Boolean(hasBookings && isCurrentTimeSlot);

                  return (
                    <div
                      key={`agenda-${agendaDay}-${slot.id}`}
                      className={`rounded-2xl border transition-all ${
                        isLiveClass
                          ? 'border-rose-400 bg-rose-50/70 dark:bg-rose-950/30 ring-2 ring-rose-400/80 shadow-xs'
                          : isCurrentTimeSlot && !hasBookings
                          ? 'border-emerald-300/80 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-2xs'
                          : hasBookings
                          ? `bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 shadow-2xs hover:shadow-xs ${isPastSlot ? 'opacity-60 grayscale-[15%]' : ''}`
                          : isPastSlot
                          ? 'border-zinc-200/40 dark:border-zinc-800/40 bg-zinc-100/40 dark:bg-zinc-900/20 opacity-40 cursor-not-allowed'
                          : 'border-slate-200/70 dark:border-zinc-800/70 bg-slate-50/60 dark:bg-zinc-900/30 border-dashed'
                      } p-3.5 sm:p-4`}
                    >
                      {/* Slot Top Meta */}
                      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-200/60 dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                            Sesi {index + 1}
                          </span>
                          <span className="text-xs font-mono font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {slot.label} WIB
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isPastSlot && !isLiveClass && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-700">
                              <CheckCheck className="w-3 h-3" />
                              Selesai
                            </span>
                          )}
                          {isLiveClass && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-300 dark:border-rose-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
                              <span>LIVE</span>
                            </span>
                          )}
                          {slotBookings.length > 1 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              {slotBookings.length} Sesi Paralel
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Slot Content Body */}
                      {hasBookings ? (
                        <div className="space-y-3">
                          {slotBookings.map((booking, bIdx) => {
                            const isGmeet = (booking.room || 'zoom') === 'gmeet';
                            const batchInfo = BATCHES.find((b) => b.id === booking.batch) || {
                              badge: 'bg-slate-100 text-slate-700 border border-slate-200',
                              cardBg: 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800',
                              avatarBg: 'bg-slate-200 text-slate-700',
                              dot: 'bg-slate-400',
                            };

                            return (
                              <div
                                key={booking.id || bIdx}
                                className={bIdx > 0 ? 'pt-3 border-t border-slate-200/60 dark:border-zinc-800' : ''}
                              >
                                <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                      isGmeet
                                        ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                                        : 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                                    }`}
                                  >
                                    {isGmeet ? <Video className="w-2.5 h-2.5" /> : null}
                                    <span>{isGmeet ? 'Google Meet' : 'Zoom'}</span>
                                  </span>

                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-tight ${batchInfo.badge}`}>
                                    <span>Angkatan {booking.batch}</span>
                                  </span>
                                </div>

                                <h4 className="font-bold text-sm text-slate-900 dark:text-zinc-100 leading-snug mb-2 tracking-tight">
                                  {booking.note || 'Kegiatan Perkuliahan'}
                                </h4>

                                {/* Lecturer / PIC with Avatar Circle */}
                                <div className="flex items-center gap-2 mb-3">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 shadow-2xs ${batchInfo.avatarBg || 'bg-slate-200 text-slate-700'}`}>
                                    {getLecturerInitials(booking.pic || booking.requestedBy)}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-xs font-semibold text-slate-800 dark:text-zinc-200 truncate">
                                      {booking.pic || <span className="text-slate-400 font-normal">Dosen belum ditentukan</span>}
                                    </div>
                                    {booking.requestedBy && (
                                      <div className="text-[10px] text-slate-500 dark:text-zinc-400 truncate">
                                        Pemohon: {booking.requestedBy}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Action Buttons for Mobile */}
                                <div className="flex items-center gap-2 pt-2 border-t border-slate-200/50 dark:border-zinc-800">
                                  <button
                                    type="button"
                                    onClick={() => onShowDetail(booking)}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold bg-white/90 hover:bg-white dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 shadow-2xs transition-all active:scale-95 cursor-pointer"
                                  >
                                    <Info className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Detail & Tautan {isGmeet ? 'Meet' : 'Zoom'}</span>
                                  </button>

                                  {isAdmin && (
                                    <button
                                      type="button"
                                      onClick={() => onSelectCell({ day: agendaDay, slot, booking })}
                                      className="flex items-center justify-center gap-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-[#17324D] hover:bg-[#112437] text-white dark:bg-zinc-100 dark:text-zinc-900 transition-all active:scale-95 shadow-2xs cursor-pointer"
                                      title="Edit Jadwal"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                      <span>Edit</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        /* Empty Slot */
                        <div className="flex items-center justify-between py-1">
                          {isPastSlot ? (
                            <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-600">
                              <CheckCheck className="w-3.5 h-3.5" />
                              <span className="text-xs font-medium">Sesi sudah selesai hari ini</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-500/80"></span>
                              <span className="text-xs text-slate-600 dark:text-zinc-400 font-medium">
                                {isCurrentTimeSlot ? 'Ruang siap digunakan sekarang' : 'Ruang virtual tersedia'}
                              </span>
                            </div>
                          )}

                          {!isPastSlot && isAdmin && (
                            <button
                              type="button"
                              onClick={() => onSelectCell({ day: agendaDay, slot, booking: null })}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#17324D] hover:bg-[#112437] text-white dark:bg-zinc-100 dark:text-zinc-900 transition-all active:scale-95 shadow-2xs cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Jadwalkan</span>
                            </button>
                          )}
                          {!isPastSlot && !isAdmin && onRequestSlot && (
                            <button
                              type="button"
                              onClick={() => onRequestSlot({ day: agendaDay, slot })}
                              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-2xs active:scale-95 transition-all cursor-pointer border border-amber-500/30"
                            >
                              <Send className="w-3 h-3" />
                              <span>Ajukan</span>
                            </button>
                          )}
                          {!isPastSlot && !isAdmin && !onRequestSlot && (
                            <span className="text-xs text-slate-300 dark:text-zinc-700 font-mono">—</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. MODE TABEL MATRIKS MINGGUAN (Horizontally Scrollable on Mobile) */}
          {/* ========================================================================= */}
          {viewMode === 'matrix' && (
            <div>
              {/* Mobile Swipe Tip Banner */}
              <div className="md:hidden px-3.5 py-1.5 bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-[11px] text-slate-500 dark:text-zinc-400 flex items-center justify-between font-medium">
                <span>Geser tabel secara horizontal untuk melihat seluruh hari</span>
              </div>

              <div className="w-full overflow-x-auto scrollbar-thin">
                <table className="w-full min-w-[740px] md:min-w-full border-collapse table-fixed">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-zinc-900/90 border-b border-slate-200 dark:border-zinc-800">
                      {/* Sticky Slot Header Column */}
                      <th className="w-[84px] md:w-[94px] py-2 px-2.5 text-left text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>Waktu</span>
                        </div>
                      </th>

                      {/* Day Columns */}
                      {displayDays.map((day) => {
                        const isToday = day === currentDay;
                        const dayCount = getDayCount(day);
                        return (
                          <th
                            key={day}
                            className={`py-3 px-2 text-center transition-colors border-r border-zinc-200/60 dark:border-zinc-800 last:border-r-0 ${
                              isToday ? 'bg-emerald-500/10' : ''
                            }`}
                          >
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-sm font-bold ${
                                  isToday
                                    ? 'text-emerald-700 dark:text-emerald-300'
                                    : 'text-zinc-800 dark:text-zinc-200'
                                }`}>
                                  {day}
                                </span>
                                {isToday && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                )}
                              </div>
                              <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500">
                                {dayCount > 0 ? `${dayCount} Sesi` : 'Kosong'}
                              </span>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-zinc-200/50 dark:divide-zinc-800/40">
                    {TIME_SLOTS.map((slot, index) => {
                      const isCurrentActiveSlot = activeSlot?.label === slot.label;
                      const hasLiveClassTodayInSlot = isCurrentActiveSlot && bookings.some(b => b.day === currentDay && b.timeSlot === slot.label);
                      const slotTitle = `Sesi ${index + 1}`;

                      return (
                        <tr
                          key={slot.id}
                          className={`group transition-colors ${
                            isCurrentActiveSlot
                              ? 'bg-slate-50/60 dark:bg-zinc-900/40'
                              : 'hover:bg-slate-50/30 dark:hover:bg-zinc-900/20'
                          }`}
                        >
                          {/* Time Slot Label Cell */}
                          <td className="p-2.5 align-top bg-white/60 dark:bg-zinc-900/60 group-hover:bg-slate-50/60 dark:group-hover:bg-zinc-850 border-r border-zinc-200/60 dark:border-zinc-800 h-full">
                            <div className="flex flex-col justify-between h-full min-h-[110px] sm:min-h-[125px]">
                              <div>
                                <div className="flex items-center justify-between">
                                  <span className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${
                                    isCurrentActiveSlot
                                      ? 'text-rose-600 dark:text-rose-400 font-extrabold'
                                      : 'text-zinc-700 dark:text-zinc-300'
                                  }`}>
                                    {slotTitle}
                                  </span>
                                  {hasLiveClassTodayInSlot && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" title="Perkuliahan Sedang Berlangsung" />
                                  )}
                                </div>
                                <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 leading-tight block mt-1">
                                  {slot.label.replace(' - ', '-')}
                                </span>
                              </div>
                              <div className="pt-1 border-t border-zinc-200/50 dark:border-zinc-800">
                                <span className="text-[9px] font-semibold text-zinc-400 dark:text-zinc-500 font-mono">
                                  {(slot.endH * 60 + slot.endM) - (slot.startH * 60 + slot.startM)}m
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Day Cells */}
                          {displayDays.map((day) => {
                            const isToday = day === currentDay;

                            // Find bookings (respects visibility per role)
                            const rawBookings = visibleBookings.filter(
                              (b) => b.day === day && b.timeSlot === slot.label
                            );

                            const filteredBookings = rawBookings.filter(b => matchesFilter(b));
                            const cellBookings = filteredBookings.length > 0
                              ? filteredBookings
                              : (rawBookings.length > 0 && (selectedBatch !== 'ALL' || searchQuery) ? [] : rawBookings);

                            // Bug A Fix: LIVE is strictly true ONLY when there is an actual booking AND it is today AND current active slot!
                            const isLiveNow = Boolean(cellBookings.length > 0 && isToday && isCurrentActiveSlot);

                            return (
                              <td
                                key={`${day}_${slot.id}`}
                                className={`p-1.5 align-top border-r border-zinc-200/40 dark:border-zinc-800/40 last:border-r-0 h-full transition-opacity ${
                                  isToday ? 'bg-emerald-500/[0.02]' : ''
                                }`}
                              >
                                <ScheduleCell
                                  day={day}
                                  slot={slot}
                                  bookings={cellBookings}
                                  booking={cellBookings[0] || null}
                                  isToday={isToday}
                                  isLiveNow={isLiveNow}
                                  isAdmin={isAdmin}
                                  onSelectCell={onSelectCell}
                                  onShowDetail={onShowDetail}
                                  onRequestSlot={onRequestSlot}
                                  currentTotalMinutes={currentTotalMinutes}
                                />
                              </td>
                            );
                          })}

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
