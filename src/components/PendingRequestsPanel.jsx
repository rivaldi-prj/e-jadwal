import React, { useState } from 'react';
import {
  Clock,
  User,
  BookOpen,
  CheckCircle2,
  XCircle,
  Layers,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Inbox,
  Mail,
  Video,
} from 'lucide-react';
import { BATCHES, BOOKING_STATUS, TIME_SLOTS } from '../constants/scheduleConfig';

// Helper to calculate slot minute boundaries
function getSlotMinutes(timeSlotLabel) {
  const slot = TIME_SLOTS.find(s => s.label === timeSlotLabel);
  if (!slot) return null;
  return {
    start: slot.startH * 60 + slot.startM,
    end: slot.endH * 60 + slot.endM,
  };
}

function checkTimesOverlap(slotLabelA, slotLabelB) {
  if (slotLabelA === slotLabelB) return true;
  const minutesA = getSlotMinutes(slotLabelA);
  const minutesB = getSlotMinutes(slotLabelB);
  if (!minutesA || !minutesB) return false;
  return minutesA.start < minutesB.end && minutesA.end > minutesB.start;
}

function getDuplicateInfo(booking, pendingList = [], allList = []) {
  const currentCourse = (booking.note || '').trim().toLowerCase();
  const bookingRoom = booking.room || 'zoom';

  // 1. Cek semua jadwal resmi (APPROVED) pada slot waktu yang sama
  const approvedMatches = allList.filter(b => {
    if (b.id === booking.id) return false;
    const s = (b.status || BOOKING_STATUS.APPROVED).toLowerCase();
    const isApproved = s === 'approved' || s === 'disetujui';
    if (!isApproved) return false;
    if (b.day !== booking.day) return false;
    return checkTimesOverlap(booking.timeSlot, b.timeSlot);
  });

  const sameCourseApproved = approvedMatches.find(b =>
    currentCourse && (b.note || '').trim().toLowerCase() === currentCourse
  );

  if (sameCourseApproved) {
    return {
      type: 'course_duplicate',
      canFallbackMeet: false,
      label: 'Mata Kuliah Sudah Terdaftar Resmi',
      message: `Mata kuliah "${sameCourseApproved.note}" sudah disetujui sebelumnya di jadwal resmi (${sameCourseApproved.day}, ${sameCourseApproved.timeSlot} WIB - Angkatan ${sameCourseApproved.batch}).`,
    };
  }

  // Cek apakah ada jadwal approved di ruang yang sama
  const roomConflict = approvedMatches.find(b => {
    const existingRoom = b.room || 'zoom';
    return bookingRoom === existingRoom;
  });

  if (roomConflict) {
    const isZoomConflict = bookingRoom === 'zoom';
    // Cek apakah Google Meet kosong di slot ini
    const meetOccupied = approvedMatches.some(b => (b.room || 'zoom') === 'gmeet');
    const canFallbackMeet = isZoomConflict && !meetOccupied;

    return {
      type: 'room_conflict',
      conflictRoom: bookingRoom,
      canFallbackMeet,
      conflictingBooking: roomConflict,
      label: canFallbackMeet ? 'Ruang Zoom Terisi · Alihkan ke Google Meet' : `Bentrok Ruang ${bookingRoom === 'gmeet' ? 'Google Meet' : 'Zoom'} Terisi`,
      message: canFallbackMeet
        ? `Ruang Zoom pada hari ${roomConflict.day} (${roomConflict.timeSlot} WIB) sudah resmi terisi perkuliahan "${roomConflict.note}" (Angkatan ${roomConflict.batch}). Google Meet tersedia sebagai ruang alternatif.`
        : `Ruang ${bookingRoom === 'gmeet' ? 'Google Meet' : 'Zoom'} pada hari ${roomConflict.day} (${roomConflict.timeSlot} WIB) sudah resmi terisi perkuliahan "${roomConflict.note}" (Angkatan ${roomConflict.batch}).`,
    };
  }

  // 2. Cek konflik dengan permohonan pending lain (antrean bentrok ruang / double entry)
  const pendingMatch = pendingList.find(b => {
    if (b.id === booking.id) return false;
    if (b.day !== booking.day) return false;
    const existingRoom = b.room || 'zoom';
    if (bookingRoom !== existingRoom) return false;
    return checkTimesOverlap(booking.timeSlot, b.timeSlot);
  });

  if (pendingMatch) {
    const isSameCourse = currentCourse && (pendingMatch.note || '').trim().toLowerCase() === currentCourse;
    const roomName = bookingRoom === 'gmeet' ? 'Google Meet' : 'Zoom';
    return {
      type: 'pending',
      canFallbackMeet: false,
      label: isSameCourse ? 'Duplikat Antrean Terdeteksi' : `Antrean Bentrok Ruang ${roomName}`,
      message: isSameCourse
        ? `Terdapat pengajuan ganda untuk "${pendingMatch.note}" pada slot ini (diajukan juga oleh ${pendingMatch.requestedBy || 'mahasiswa lain'}).`
        : `Terdapat pengajuan lain yang juga memperebutkan slot ruang ${roomName} ini ("${pendingMatch.note}" - Angkatan ${pendingMatch.batch} oleh ${pendingMatch.requestedBy || 'mahasiswa lain'}).`,
    };
  }

  return null;
}

export function PendingRequestsPanel({
  pendingBookings = [],
  allBookings = [],
  onApprove,
  onReject,
  onShowToast,
}) {
  const [expanded, setExpanded] = useState(true);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  if (pendingBookings.length === 0) return null;

  const handleApprove = async (booking, overrideRoom = null) => {
    const res = await onApprove(booking.id, overrideRoom);
    if (res.success) {
      const emailNote = booking.requesterEmail ? ` Notifikasi email dikirim ke ${booking.requesterEmail}.` : '';
      const finalRoom = res.target?.room || overrideRoom || booking.room || 'zoom';
      const redirectedText = res.switchedToMeet || (booking.room !== 'gmeet' && finalRoom === 'gmeet')
        ? ' (Otomatis dialihkan ke Google Meet karena Ruang Zoom terisi)'
        : ` via ${finalRoom === 'gmeet' ? 'Google Meet' : 'Zoom'}`;
      onShowToast({
        type: 'success',
        title: 'Jadwal Disetujui',
        message: `Jadwal ${booking.note} (${booking.batch}) berhasil disetujui${redirectedText}.${emailNote}`,
      });
    } else {
      onShowToast({ type: 'error', title: 'Gagal Menyetujui', message: res.message });
    }
  };

  const handleReject = async (booking) => {
    const res = await onReject(booking.id, rejectReason);
    if (res.success) {
      const emailNote = booking.requesterEmail ? ` Notifikasi penolakan dikirim ke ${booking.requesterEmail}.` : '';
      onShowToast({
        type: 'info',
        title: 'Jadwal Ditolak',
        message: `Permintaan jadwal ${booking.note} ditolak.${emailNote}`,
      });
      setRejectingId(null);
      setRejectReason('');
    }
  };

  return (
    <div className="no-print mb-3 rounded-lg border border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/20 overflow-hidden transition-all">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Inbox className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            Permintaan Jadwal Menunggu Persetujuan
          </span>
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
            {pendingBookings.length}
          </span>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-amber-500" />
          : <ChevronDown className="w-4 h-4 text-amber-500" />
        }
      </button>

      {/* List */}
      {expanded && (
        <div className="divide-y divide-amber-200/60 dark:divide-amber-800/30">
          {pendingBookings.map((booking) => {
            const batchInfo = BATCHES.find(b => b.id === booking.batch);
            const isRejecting = rejectingId === booking.id;
            const dupInfo = getDuplicateInfo(booking, pendingBookings, allBookings);

            return (
              <div key={booking.id} className="px-4 py-3 bg-white/60 dark:bg-zinc-900/40">
                {/* Info row */}
                <div className="flex flex-wrap items-start gap-x-4 gap-y-1 mb-2.5">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${batchInfo?.badge || 'bg-slate-100 text-slate-700'}`}>
                    Angkatan {booking.batch}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                      booking.room === 'gmeet'
                        ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border border-teal-300 dark:border-teal-800'
                        : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-300 dark:border-sky-800'
                    }`}
                  >
                    {booking.room === 'gmeet' ? <Video className="w-2.5 h-2.5" /> : null}
                    <span>{booking.room === 'gmeet' ? 'Google Meet' : 'Zoom'}</span>
                  </span>
                  {dupInfo && (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                        dupInfo.canFallbackMeet
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                      }`}
                      title={dupInfo.message}
                    >
                      {dupInfo.canFallbackMeet ? (
                        <Video className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      ) : (
                        <AlertCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                      )}
                      <span>{dupInfo.label}</span>
                    </span>
                  )}
                  <div className="flex items-center gap-1 text-xs text-slate-700 dark:text-zinc-200">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium">{booking.note || '—'}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-zinc-400">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{booking.day}, {booking.timeSlot} WIB</span>
                  </div>
                  {booking.pic && (
                    <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-zinc-400">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{booking.pic}</span>
                    </div>
                  )}
                  {booking.requestedBy && (
                    <div className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400">
                      <User className="w-3 h-3" />
                      <span>Pemohon: <strong>{booking.requestedBy}</strong></span>
                    </div>
                  )}
                  {booking.requesterEmail && (
                    <div className="flex items-center gap-1 text-[11px] text-amber-800 dark:text-amber-300">
                      <Mail className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      <a
                        href={`mailto:${booking.requesterEmail}`}
                        className="underline hover:text-amber-950 dark:hover:text-white"
                        title="Klik untuk kirim email ke mahasiswa ini"
                      >
                        {booking.requesterEmail}
                      </a>
                    </div>
                  )}
                </div>

                {/* Duplicate / room conflict warning explanation */}
                {dupInfo && (
                  dupInfo.canFallbackMeet ? (
                    <div className="mb-2.5 px-3 py-2 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-[11.5px] text-teal-900 dark:text-teal-200 flex items-start gap-2">
                      <Video className="w-4 h-4 flex-shrink-0 text-teal-600 mt-0.5" />
                      <div>
                        <strong className="block text-teal-950 dark:text-teal-100 font-semibold mb-0.5">
                          Ruang Zoom Terisi &bull; Siap Dialihkan ke Google Meet
                        </strong>
                        <span className="leading-relaxed">{dupInfo.message}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-2.5 px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 text-[11px] text-rose-700 dark:text-rose-400 flex items-start gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-rose-500 mt-0.5" />
                      <span>{dupInfo.message}</span>
                    </div>
                  )
                )}

                {/* Reject reason input */}
                {isRejecting && (
                  <div className="mb-2 animate-dropdown-pop">
                    <input
                      type="text"
                      placeholder="Alasan penolakan (opsional)..."
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-rose-300 dark:border-rose-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-rose-400"
                      autoFocus
                    />
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {!isRejecting ? (
                    <>
                      {dupInfo?.canFallbackMeet ? (
                        <button
                          type="button"
                          onClick={() => handleApprove(booking, 'gmeet')}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                        >
                          <Video className="w-3.5 h-3.5" />
                          Setujui via Google Meet
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleApprove(booking)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Setujui
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setRejectingId(booking.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-rose-50 border border-rose-300 text-rose-600 dark:border-rose-800 dark:text-rose-400 dark:bg-zinc-900 dark:hover:bg-rose-950/30 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Tolak
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleReject(booking)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Konfirmasi Tolak
                      </button>
                      <button
                        type="button"
                        onClick={() => { setRejectingId(null); setRejectReason(''); }}
                        className="text-xs text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer px-2 py-1.5"
                      >
                        Batal
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
