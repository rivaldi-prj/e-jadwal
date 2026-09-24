import React, { useState, useEffect } from 'react';
import { TIME_SLOTS, DAYS_OF_WEEK, BATCHES } from '../constants/scheduleConfig';
import { ScheduleCell } from './ScheduleCell';
import {
  Calendar,
  Clock,
  LayoutGrid,
  ListFilter,
  User,
  Plus,
  Edit2,
  Info
} from 'lucide-react';

export function ScheduleMatrix({
  bookings,
  currentDay,
  activeSlot,
  isAdmin,
  onSelectCell,
  onShowDetail,
  selectedBatch,
  selectedDay,
  searchQuery,
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

  // Function to filter a booking based on active filters
  const matchesFilter = (booking) => {
    if (!booking) return false;
    if (selectedBatch && selectedBatch !== 'ALL' && booking.batch !== selectedBatch) {
      return false;
    }
    if (searchQuery && searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchNote = (booking.note || '').toLowerCase().includes(q);
      const matchPic = (booking.pic || '').toLowerCase().includes(q);
      const matchBatch = (booking.batch || '').toLowerCase().includes(q);
      if (!matchNote && !matchPic && !matchBatch) return false;
    }
    return true;
  };

  const totalFiltered = bookings.filter(matchesFilter).length;
  const getDayCount = (day) => bookings.filter(b => b.day === day && matchesFilter(b)).length;

  return (
    <div className="schedule-table relative bg-white dark:bg-zinc-900/90 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs overflow-hidden mb-4 transition-all">
      {/* Top Header & View Switcher */}
      <div className="px-3.5 py-2.5 sm:px-4 sm:py-3 border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-zinc-400" />
          <h3 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Jadwal Perkuliahan &bull; S1 Kebidanan
          </h3>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/80">
            {totalFiltered} Sesi Terjadwal
          </span>
        </div>

        {/* View Mode Toggle (Agenda HP vs Tabel Matriks) */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-700/80">
          <button
            type="button"
            onClick={() => setViewMode('agenda')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
              viewMode === 'agenda'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
            title="Tampilan Agenda Harian"
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Agenda</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('matrix')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
              viewMode === 'matrix'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
            title="Tampilan Tabel Matriks Mingguan"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Tabel Matriks</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. MODE AGENDA HARIAN (Responsive & Touch-Friendly untuk HP) */}
      {/* ========================================================================= */}
      {viewMode === 'agenda' && (
        <div className="p-3 sm:p-4">
          {/* Day Selector Pills Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3.5 scrollbar-none">
            {DAYS_OF_WEEK.map((day) => {
              const isToday = day === currentDay;
              const isSelected = day === agendaDay;
              const dayCount = getDayCount(day);

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setAgendaDay(day)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                      : isToday
                      ? 'bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60'
                      : 'bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <span>{day}</span>
                  {isToday && (
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-500'}`}></span>
                  )}
                  <span
                    className={`text-[10px] px-1 py-0.2 rounded font-mono ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-zinc-200/70 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    {dayCount}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Agenda Slots Timeline Cards */}
          <div className="space-y-2.5">
            {TIME_SLOTS.map((slot, index) => {
              const isToday = agendaDay === currentDay;
              const isCurrentActiveSlot = isToday && activeSlot?.label === slot.label;

              // Find booking for this day and slot
              const rawBooking = bookings.find(
                (b) => b.day === agendaDay && b.timeSlot === slot.label
              );
              const booking = rawBooking && matchesFilter(rawBooking) ? rawBooking : null;

              const batchInfo = booking
                ? BATCHES.find((b) => b.id === booking.batch) || {
                    badge: 'bg-zinc-100 text-zinc-700 border border-zinc-200',
                    dot: 'bg-zinc-400',
                  }
                : null;

              return (
                <div
                  key={`agenda-${agendaDay}-${slot.id}`}
                  className={`rounded-xl border transition-all ${
                    isCurrentActiveSlot
                      ? 'border-rose-500/30 bg-rose-500/[0.03] dark:bg-rose-500/[0.06] ring-1 ring-rose-500/20'
                      : booking
                      ? 'border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 shadow-2xs'
                      : 'border-dashed border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/30 dark:bg-zinc-900/20'
                  } p-3 sm:p-3.5`}
                >
                  {/* Slot Top Meta */}
                  <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-zinc-100 dark:border-zinc-800/80">
                    <div className="flex items-center gap-2">
                      <span className="text-[10.5px] font-semibold text-zinc-400 uppercase tracking-wider">
                        Slot {index + 1}
                      </span>
                      <span className="text-xs font-mono font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-400" />
                        {slot.label} WIB
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isCurrentActiveSlot && (
                        <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                          <span>LIVE</span>
                        </span>
                      )}
                      {booking && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${batchInfo.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${batchInfo.dot}`} />
                          <span>Angkatan {booking.batch}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Slot Content Body */}
                  {booking ? (
                    <div>
                      <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 leading-snug mb-1 tracking-tight">
                        {booking.note || 'Kegiatan Perkuliahan'}
                      </h4>

                      <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 mb-2.5">
                        <User className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                        <span>
                          Dosen:{' '}
                          <strong className="text-zinc-800 dark:text-zinc-200 font-medium">
                            {booking.pic || '-'}
                          </strong>
                        </span>
                      </div>

                      {/* Action Buttons for Mobile */}
                      <div className="flex items-center gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
                        <button
                          type="button"
                          onClick={() => onShowDetail(booking)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
                        >
                          <Info className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Detail & Tautan Zoom</span>
                        </button>

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => onSelectCell({ day: agendaDay, slot, booking })}
                            className="flex items-center justify-center gap-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 transition-colors"
                            title="Edit Jadwal"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Empty Slot */
                    <div className="flex items-center justify-between py-1">
                      <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium italic">
                        Ruang Zoom Kosong / Tersedia
                      </span>

                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={() => onSelectCell({ day: agendaDay, slot, booking: null })}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Jadwalkan</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-zinc-300 dark:text-zinc-700 uppercase font-mono tracking-wider">
                          Tersedia
                        </span>
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
          <div className="md:hidden px-3.5 py-1.5 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between font-medium">
            <span>Geser tabel secara horizontal untuk melihat seluruh hari</span>
          </div>

          <div className="w-full overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[740px] md:min-w-full border-collapse table-fixed">
              <thead>
                <tr className="bg-zinc-50/90 dark:bg-zinc-900/90 border-b border-zinc-200 dark:border-zinc-800">
                  {/* Sticky Slot Header Column */}
                  <th className="w-[84px] md:w-[94px] py-2 px-2.5 text-left text-[10.5px] font-semibold text-zinc-400 uppercase tracking-wider bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-zinc-400" />
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
                        className={`py-2 px-1.5 sm:px-2 text-center transition-colors border-r border-zinc-100 dark:border-zinc-800/60 last:border-r-0 ${
                          isToday
                            ? 'bg-indigo-500/[0.04] dark:bg-indigo-500/[0.08] border-t-2 border-t-indigo-500'
                            : ''
                        }`}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <div className="flex items-center gap-1">
                            <span className={`text-xs sm:text-sm font-bold ${
                              isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-800 dark:text-zinc-200'
                            }`}>
                              {day}
                            </span>
                            {isToday && (
                              <span className="hidden sm:inline-block px-1 py-0.2 rounded text-[8px] sm:text-[9px] font-semibold uppercase bg-indigo-600 text-white tracking-wider">
                                Hari Ini
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] sm:text-[10px] font-medium text-zinc-400 dark:text-zinc-500">
                            {dayCount > 0 ? `${dayCount} Sesi` : 'Kosong'}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {TIME_SLOTS.map((slot, index) => {
                  const isCurrentActiveSlot = activeSlot?.label === slot.label;
                  const slotTitle = `Slot ${index + 1}`;

                  return (
                    <tr
                      key={slot.id}
                      className={`group transition-colors ${
                        isCurrentActiveSlot
                          ? 'bg-zinc-50/80 dark:bg-zinc-900/40'
                          : 'hover:bg-zinc-50/40 dark:hover:bg-zinc-900/30'
                      }`}
                    >
                      {/* Time Slot Label Cell */}
                      <td className="p-2 sm:p-2.5 align-top bg-white dark:bg-zinc-900 group-hover:bg-zinc-50/80 dark:group-hover:bg-zinc-800/40 border-r border-zinc-200 dark:border-zinc-800 h-full">
                        <div className="flex flex-col justify-between h-full min-h-[98px] sm:min-h-[102px]">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className={`text-[9.5px] sm:text-[10.5px] font-semibold uppercase tracking-wider ${
                                isCurrentActiveSlot
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-zinc-700 dark:text-zinc-300'
                              }`}>
                                {slotTitle}
                              </span>
                              {isCurrentActiveSlot && (
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" title="Sesi Sedang Berjalan" />
                              )}
                            </div>
                            <span className="text-[9px] sm:text-[10px] font-mono text-zinc-500 dark:text-zinc-400 leading-tight block mt-1">
                              {slot.label.replace(' - ', '-')}
                            </span>
                          </div>
                          <div className="pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
                            <span className="text-[8.5px] font-medium text-zinc-400 dark:text-zinc-500 font-mono">
                              100m
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Day Cells */}
                      {displayDays.map((day) => {
                        const isToday = day === currentDay;
                        const isLiveNow = isToday && isCurrentActiveSlot;

                        // Find booking for this day and slot
                        const rawBooking = bookings.find(
                          (b) => b.day === day && b.timeSlot === slot.label
                        );

                        // If filtered out, treat as dimmed or empty
                        const booking = rawBooking && matchesFilter(rawBooking)
                          ? rawBooking
                          : (rawBooking && (selectedBatch !== 'ALL' || searchQuery) ? null : rawBooking);

                        return (
                          <td
                            key={`${day}_${slot.id}`}
                            className={`p-1 align-top border-r border-zinc-100 dark:border-zinc-800/60 last:border-r-0 h-full ${
                              isToday
                                ? 'bg-indigo-500/[0.02] dark:bg-indigo-500/[0.04]'
                                : ''
                            }`}
                          >
                            <ScheduleCell
                              day={day}
                              slot={slot}
                              booking={booking}
                              isToday={isToday}
                              isLiveNow={isLiveNow}
                              isAdmin={isAdmin}
                              onSelectCell={onSelectCell}
                              onShowDetail={onShowDetail}
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
    </div>
  );
}
