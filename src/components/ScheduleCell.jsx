import React from 'react';
import { Plus, User, Edit2 } from 'lucide-react';
import { BATCHES } from '../constants/scheduleConfig';

export function ScheduleCell({
  day,
  slot,
  booking,
  isToday,
  isLiveNow,
  isAdmin,
  onSelectCell,
  onShowDetail,
}) {
  const batchInfo = booking
    ? BATCHES.find(b => b.id === booking.batch) || {
        badge: 'bg-slate-100 text-slate-700 border border-slate-200',
        accentBorder: 'border-l-slate-400',
        dot: 'bg-slate-400',
      }
    : null;

  const handleClick = () => {
    if (isAdmin) {
      onSelectCell({ day, slot, booking });
    } else if (booking) {
      onShowDetail(booking);
    }
  };

  // Empty Slot
  if (!booking) {
    return (
      <div
        onClick={isAdmin ? handleClick : undefined}
        title={isAdmin ? `Klik untuk jadwalkan slot ${slot.label} pada hari ${day}` : undefined}
        className={`group min-h-[98px] sm:min-h-[102px] h-full rounded-xl border border-dashed transition-all flex flex-col items-center justify-center text-center p-2 ${
          isAdmin
            ? 'cursor-pointer border-zinc-200 hover:border-zinc-400 bg-zinc-50/40 hover:bg-zinc-100/80 dark:border-zinc-800 dark:hover:border-zinc-700 dark:bg-zinc-900/20 dark:hover:bg-zinc-800/40'
            : 'border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50/20 dark:bg-zinc-900/10'
        }`}
      >
        {isAdmin ? (
          <div className="flex items-center gap-1 text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-colors">
            <Plus className="w-3.5 h-3.5" />
            <span className="text-[10px] font-medium">Jadwalkan</span>
          </div>
        ) : (
          <span className="text-[9.5px] text-zinc-300 dark:text-zinc-700 font-mono tracking-wider uppercase select-none">
            Kosong
          </span>
        )}
      </div>
    );
  }

  // Booked Slot
  return (
    <div
      onClick={handleClick}
      title={`${booking.note || 'Perkuliahan'}\nDosen: ${booking.pic || '-'}\nAngkatan: ${booking.batch}\n(Klik untuk detail)`}
      className={`group min-h-[98px] sm:min-h-[102px] h-full p-2 sm:p-2.5 rounded-xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 transition-all cursor-pointer flex flex-col justify-between ${
        batchInfo.accentBorder
      } border-l-[3.5px] ${
        isLiveNow
          ? 'ring-2 ring-rose-500/50 bg-rose-500/[0.04] dark:bg-rose-500/[0.08] shadow-xs'
          : 'hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-xs hover:-translate-y-0.5'
      }`}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between gap-1 flex-shrink-0">
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] sm:text-[9.5px] font-medium tracking-tight ${batchInfo.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${batchInfo.dot}`} />
          <span>{booking.batch}</span>
        </span>

        {isLiveNow && (
          <span className="inline-flex items-center gap-1 text-[8.5px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
            <span>LIVE</span>
          </span>
        )}

        {isAdmin && !isLiveNow && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <span className="p-0.5 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
              <Edit2 className="w-3 h-3" />
            </span>
          </div>
        )}
      </div>

      {/* Course Title */}
      <div className="flex-1 flex items-center my-1 py-0.5">
        <h4 className="font-semibold text-[10.5px] sm:text-[11px] text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-snug tracking-tight">
          {booking.note || 'Kegiatan Perkuliahan'}
        </h4>
      </div>

      {/* Lecturer / PIC */}
      <div className="flex items-center gap-1.5 text-[9px] sm:text-[9.5px] text-zinc-600 dark:text-zinc-400 truncate flex-shrink-0 pt-1.5 border-t border-zinc-100 dark:border-zinc-800/80">
        <User className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-zinc-400 flex-shrink-0" />
        <span className="truncate font-medium">{booking.pic || <span className="italic text-zinc-400">Dosen -</span>}</span>
      </div>
    </div>
  );
}


