import React from 'react';
import { Plus, Edit2, Clock, MoreHorizontal, Video, CheckCheck } from 'lucide-react';
import { BATCHES, BOOKING_STATUS, getLecturerInitials } from '../constants/scheduleConfig';

/**
 * Returns true if this time slot has already ended TODAY.
 * isToday must be true; uses currentTotalMinutes from the clock hook.
 */
function isSlotPastToday(slot, isToday, currentTotalMinutes) {
  if (!isToday) return false;
  const endMin = slot.endH * 60 + slot.endM;
  return currentTotalMinutes >= endMin;
}


function BookingCard({
  booking,
  day,
  slot,
  isLiveNow,
  isPast = false,
  isAdmin,
  onSelectCell,
  onShowDetail,
  isCompact = false,
}) {
  const isPending = (booking?.status || BOOKING_STATUS.APPROVED) === BOOKING_STATUS.PENDING;
  const isGmeet = (booking?.room || 'zoom') === 'gmeet';

  const batchInfo = booking
    ? BATCHES.find(b => b.id === booking.batch) || {
      badge: 'bg-white/80 text-zinc-800',
      cardBg: 'bg-white dark:bg-zinc-850 text-zinc-900 dark:text-zinc-100 shadow-sm',
      avatarBg: 'bg-zinc-900 text-white',
      progressSolid: 'bg-zinc-900 dark:bg-zinc-100',
      progressMuted: 'bg-zinc-900/20 dark:bg-zinc-100/20',
      dot: 'bg-zinc-400',
    }
    : null;

  const handleClick = (e) => {
    e.stopPropagation();
    if (isAdmin) {
      onSelectCell({ day, slot, booking });
    } else if (booking) {
      onShowDetail(booking);
    }
  };

  if (isPending) {
    return (
      <div
        onClick={handleClick}
        title={`[MENUNGGU PERSETUJUAN]\n${booking.note || 'Perkuliahan'}\nRuang: ${isGmeet ? 'Google Meet' : 'Zoom'}\nPemohon: ${booking.requestedBy || '-'}\nDosen: ${booking.pic || '-'}\n(Klik untuk setujui/tolak)`}
        className={`group relative p-2.5 sm:p-3 rounded-2xl bg-amber-100/90 dark:bg-amber-950/50 text-amber-950 dark:text-amber-100 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between ${isCompact ? 'min-h-[90px]' : 'min-h-[110px] sm:min-h-[120px]'
          } ${isPast ? 'opacity-50 grayscale-[30%]' : ''}`}
      >
        <div className="flex items-start justify-between gap-1.5">
          <h4
            title={booking.note || 'Pengajuan Jadwal'}
            className="font-bold text-[12px] sm:text-[12.5px] leading-snug line-clamp-2 tracking-tight flex-1"
          >
            {booking.note || 'Pengajuan Jadwal'}
          </h4>
          <span className="inline-flex items-center gap-1 text-[8px] font-bold text-amber-900 bg-amber-200/90 px-1.5 py-0.5 rounded-md flex-shrink-0">
            <Clock className="w-2.5 h-2.5 text-amber-700" />
            <span>PENDING</span>
          </span>
        </div>

        {/* Jam & Ruang */}
        <div className="flex items-center justify-between gap-1.5 my-1 text-amber-900/90">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-800" />
            <span className="text-[10px] sm:text-[10.5px] font-mono font-semibold whitespace-nowrap">
              {slot.label} WIB
            </span>
          </div>
          {isGmeet ? (
            <span className="text-[8.5px] font-bold px-1.5 py-0.2 rounded bg-teal-200/80 text-teal-900 inline-flex items-center gap-0.5">
              <Video className="w-2.5 h-2.5" /> Google Meet
            </span>
          ) : (
            <span className="text-[8.5px] font-bold px-1.5 py-0.2 rounded bg-sky-200/80 text-sky-900">
              Zoom
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 pt-1.5 border-t border-amber-900/10">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold bg-amber-900 text-amber-100 shadow-2xs flex-shrink-0">
            {getLecturerInitials(booking.requestedBy || booking.pic)}
          </div>
          <div className="min-w-0 flex-1">
            <div
              title={booking.requestedBy ? `Oleh: ${booking.requestedBy}` : (booking.pic || '-')}
              className="text-[11px] font-bold truncate leading-tight"
            >
              {booking.requestedBy ? `Oleh: ${booking.requestedBy}` : (booking.pic || '-')}
            </div>
            <div className="text-[9.5px] text-amber-900/70 truncate">
              Angkatan {booking.batch}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Approved Booking Card
  return (
    <div
      onClick={handleClick}
      title={`${booking.note || 'Perkuliahan'}\nRuang: ${isGmeet ? 'Google Meet' : 'Zoom Kebidanan'}\nDosen: ${booking.pic || '-'}\nAngkatan: ${booking.batch}\n(Klik untuk detail)`}
      className={`group relative p-2.5 sm:p-3 rounded-2xl ${batchInfo?.cardBg || ''} transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer flex flex-col justify-between ${isCompact ? 'min-h-[90px]' : 'min-h-[110px] sm:min-h-[120px]'
        } ${isLiveNow ? 'ring-2 ring-emerald-500 shadow-md z-10' : ''} ${isPast ? 'opacity-55 grayscale-[20%] saturate-50' : ''}`}
    >
      {/* Badge Selesai – hanya pada slot hari ini yang sudah lewat */}
      {isPast && (
        <div className="absolute top-1.5 right-1.5 z-10">
          <span className="inline-flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-zinc-500/80 dark:bg-zinc-600/80 text-white tracking-wide">
            <CheckCheck className="w-2.5 h-2.5" />
            Selesai
          </span>
        </div>
      )}

      {/* Top Row: Course Title & Action */}
      <div className="flex items-start justify-between gap-1.5">
        <h4
          title={booking.note || 'Kegiatan Perkuliahan'}
          className="font-bold text-[12px] sm:text-[12.5px] leading-snug line-clamp-2 tracking-tight flex-1"
        >
          {booking.note || 'Kegiatan Perkuliahan'}
        </h4>
        <div className="flex items-center gap-1 flex-shrink-0">
          {isLiveNow && (
            <span className="inline-flex items-center gap-1.5 text-[8.5px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs tracking-wider">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75 motion-reduce:hidden"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
              </span>
              LIVE
            </span>
          )}
          {isAdmin && (
            <span className="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/20 transition-colors">
              <Edit2 className="w-3 h-3" />
            </span>
          )}
          <button
            type="button"
            className="w-5 h-5 rounded-full flex items-center justify-center opacity-50 group-hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/20 transition-all"
            title="Opsi & Detail"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Middle Row: Jam Perkuliahan + Ruang Badge */}
      <div className="flex items-center justify-between gap-1.5 my-1.5">
        <div className="flex items-center gap-1.5 opacity-85">
          <Clock className="w-3 h-3 opacity-60" />
          <span className="text-[10px] sm:text-[10.5px] font-mono font-semibold tracking-tight whitespace-nowrap">
            {slot.label} WIB
          </span>
        </div>
        {isGmeet ? (
          <span
            title="Ruang Google Meet Resmi"
            className="inline-flex items-center gap-0.5 text-[8.5px] font-bold px-1.5 py-0.5 rounded bg-teal-600 dark:bg-teal-600 text-white shadow-2xs tracking-tight"
          >
            <Video className="w-2.5 h-2.5" /> Google Meet
          </span>
        ) : (
          <span
            title="Ruang Zoom Resmi Kebidanan"
            className="inline-flex items-center text-[8.5px] font-bold px-1.5 py-0.5 rounded bg-[#17324D] dark:bg-sky-600 text-white shadow-2xs tracking-tight"
          >
            Zoom
          </span>
        )}
      </div>

      {/* Bottom Row: Avatar Circle + Lecturer Name + Batch */}
      <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-black/10 dark:border-white/10">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shadow-xs flex-shrink-0 ${batchInfo?.avatarBg || 'bg-zinc-900 text-white'}`}>
            {getLecturerInitials(booking.pic || booking.requestedBy)}
          </div>
          <div className="min-w-0 flex-1">
            <div
              title={booking.pic || 'Dosen'}
              className="text-[11px] font-bold truncate leading-tight"
            >
              {booking.pic || 'Dosen'}
            </div>
            <div className="text-[9.5px] opacity-75 truncate">
              Angkatan {booking.batch}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ScheduleCell({
  day,
  slot,
  booking,
  bookings = [],
  isToday,
  isLiveNow,
  isAdmin,
  onSelectCell,
  onShowDetail,
  onRequestSlot,
  currentTotalMinutes = 0,
}) {
  const activeBookings = bookings && bookings.length > 0
    ? bookings
    : booking ? [booking] : [];

  // Opsi C: apakah slot hari ini sudah berlalu?
  const isPast = isSlotPastToday(slot, isToday, currentTotalMinutes);

  // Empty Slot (Soft off-white dashed card)
  if (activeBookings.length === 0) {
    const handleEmptyClick = () => {
      if (isPast && !isAdmin) return; // Mahasiswa tidak bisa ajukan slot yang sudah lewat hari ini
      if (isAdmin) {
        onSelectCell({ day, slot, booking: null });
      } else if (onRequestSlot) {
        onRequestSlot({ day, slot });
      }
    };

    // Slot kosong yang sudah selesai hari ini (tampilan khusus untuk mahasiswa)
    if (isPast && !isAdmin) {
      return (
        <div
          title={`Sesi ${slot.label} hari ini sudah selesai`}
          className="group relative p-2.5 sm:p-3 rounded-2xl bg-zinc-100/50 dark:bg-zinc-900/25 border border-zinc-200/40 dark:border-zinc-800/40 flex flex-col justify-between min-h-[110px] sm:min-h-[120px] opacity-45 cursor-not-allowed"
        >
          <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-600">
            <span className="text-[10px] font-mono font-medium whitespace-nowrap">{slot.label}</span>
            <span className="text-zinc-300 dark:text-zinc-700 font-mono text-xs">—</span>
          </div>
          <div className="flex flex-col items-center justify-center my-1 gap-1">
            <CheckCheck className="w-4 h-4 text-zinc-300 dark:text-zinc-600" />
            <span className="text-[10.5px] font-semibold text-zinc-400 dark:text-zinc-500">Sesi Selesai</span>
          </div>
          <div className="text-[9.5px] text-zinc-300 dark:text-zinc-600 text-center">
            Sudah berlalu hari ini
          </div>
        </div>
      );
    }

    return (
      <div
        onClick={handleEmptyClick}
        title={
          isAdmin
            ? `Klik untuk jadwalkan sesi ${slot.label} (${day})`
            : onRequestSlot
              ? `Klik untuk ajukan permintaan jadwal pada sesi ${slot.label} (${day})`
              : `Tidak ada perkuliahan (${day}, ${slot.label} WIB)`
        }
        className={`group relative p-2.5 sm:p-3 rounded-2xl bg-white/70 dark:bg-zinc-900/50 border-2 border-dashed border-zinc-200/90 dark:border-zinc-800 hover:border-emerald-500 hover:bg-white dark:hover:bg-zinc-850 dark:hover:border-emerald-400 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[110px] sm:min-h-[120px] ${isAdmin || onRequestSlot ? 'cursor-pointer' : 'cursor-default'
          }`}
      >
        <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-400">
          <span className="text-[10px] font-mono font-medium whitespace-nowrap">{slot.label}</span>
          <span className="text-zinc-300 dark:text-zinc-500 font-mono text-xs">—</span>
        </div>

        <div className="flex flex-col items-center justify-center my-1">
          {isAdmin ? (
            <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
              <Plus className="w-3.5 h-3.5" />
              <span>Jadwalkan</span>
            </div>
          ) : onRequestSlot ? (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-semibold text-zinc-600 dark:text-zinc-300 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/40 transition-all">
              <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Ajukan Jadwal</span>
            </div>
          ) : (
            <span className="text-xs text-zinc-300 dark:text-zinc-600">Kosong</span>
          )}
        </div>

        <div className="text-[9.5px] text-zinc-400 dark:text-zinc-400 text-center truncate">
          Ruang Tersedia
        </div>
      </div>
    );
  }

  // Multiple bookings in the same slot (Parallel classes: Zoom + Google Meet)
  if (activeBookings.length > 1) {
    return (
      <div className="space-y-1.5">
        {activeBookings.map((b) => (
          <BookingCard
            key={b.id}
            booking={b}
            day={day}
            slot={slot}
            isLiveNow={isLiveNow}
            isPast={isPast}
            isAdmin={isAdmin}
            onSelectCell={onSelectCell}
            onShowDetail={onShowDetail}
            isCompact={true}
          />
        ))}
      </div>
    );
  }

  // Single booking card
  return (
    <BookingCard
      booking={activeBookings[0]}
      day={day}
      slot={slot}
      isLiveNow={isLiveNow}
      isPast={isPast}
      isAdmin={isAdmin}
      onSelectCell={onSelectCell}
      onShowDetail={onShowDetail}
    />
  );
}
