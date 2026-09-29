import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ExternalLink,
  Copy,
  Check,
  Clock,
  User,
  AlertCircle,
  ShieldCheck,
  CalendarDays,
  X,
  UserCheck,
  ChevronRight,
  Video,
  Share2,
} from 'lucide-react';
import { BATCHES, BOOKING_STATUS, TIME_SLOTS, DEFAULT_ZOOM_CONFIG } from '../constants/scheduleConfig';
import { copyToClipboard } from '../utils/clipboard';
import { openWhatsAppShare } from '../utils/shareUtils';

// Helper to strictly parse time in Asia/Jakarta (WIB)
function getWibTimeNow() {
  const now = new Date();
  try {
    const timeStr = now.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Jakarta',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });
    const [h, m] = timeStr.split(':').map(Number);
    const day = now.toLocaleDateString('id-ID', {
      timeZone: 'Asia/Jakarta',
      weekday: 'long',
    });
    return {
      totalMin: h * 60 + m,
      day,
      formattedTime: `${String(h).padStart(2, '0')}.${String(m).padStart(2, '0')}`,
    };
  } catch {
    const h = now.getHours();
    const m = now.getMinutes();
    const INDONESIAN_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return {
      totalMin: h * 60 + m,
      day: INDONESIAN_DAYS[now.getDay()],
      formattedTime: `${String(h).padStart(2, '0')}.${String(m).padStart(2, '0')}`,
    };
  }
}

// Helper to parse start & end minutes from timeSlot label
function parseSlotMinutes(timeSlotStr) {
  if (!timeSlotStr || typeof timeSlotStr !== 'string') return null;
  const cleaned = timeSlotStr.replace(/\s+/g, '');
  const found = TIME_SLOTS.find(s => s.label.replace(/\s+/g, '') === cleaned);
  if (found) {
    return {
      startMin: found.startH * 60 + found.startM,
      endMin: found.endH * 60 + found.endM,
      startFormatted: `${String(found.startH).padStart(2, '0')}.${String(found.startM).padStart(2, '0')}`,
      endFormatted: `${String(found.endH).padStart(2, '0')}.${String(found.endM).padStart(2, '0')}`,
    };
  }
  const m = timeSlotStr.match(/(\d{1,2})[:.](\d{2})\s*[-–—]\s*(\d{1,2})[:.](\d{2})/);
  if (m) {
    const sH = parseInt(m[1], 10);
    const sM = parseInt(m[2], 10);
    const eH = parseInt(m[3], 10);
    const eM = parseInt(m[4], 10);
    return {
      startMin: sH * 60 + sM,
      endMin: eH * 60 + eM,
      startFormatted: `${String(sH).padStart(2, '0')}.${String(sM).padStart(2, '0')}`,
      endFormatted: `${String(eH).padStart(2, '0')}.${String(eM).padStart(2, '0')}`,
    };
  }
  return null;
}

export function LiveTracker({
  currentDay,
  bookings = [],
  zoomConfig = {},
  onShowToast = null,
  isLoading = false,
  syncError = null,
  onRefetch = null,
  isAdmin = false,
  onOpenTodaySchedule = null,
}) {
  // Current time in WIB, updated strictly once per minute
  const [wibNow, setWibNow] = useState(() => getWibTimeNow());
  const [copiedField, setCopiedField] = useState(null);
  const [selectedSessionForDetail, setSelectedSessionForDetail] = useState(null);
  const [showFullMobileBanner, setShowFullMobileBanner] = useState(false);

  // References for mobile auto-scroll
  const mobileStripRef = useRef(null);
  const cardRefs = useRef({});

  useEffect(() => {
    // Update time every 60 seconds (1 minute), not every second
    const interval = setInterval(() => {
      setWibNow(getWibTimeNow());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Filter approved sessions for today only (Disetujui)
  const effectiveDay = (currentDay || wibNow.day || '').toLowerCase();
  const todaySessions = useMemo(() => {
    return bookings
      .filter(b => {
        const status = (b.status || BOOKING_STATUS.APPROVED).toLowerCase();
        const isExcluded =
          status === 'pending' ||
          status === 'menunggu' ||
          status === 'rejected' ||
          status === 'ditolak' ||
          status === 'cancelled' ||
          status === 'dibatalkan';
        const isApproved =
          (status === BOOKING_STATUS.APPROVED || status === 'disetujui') &&
          !isExcluded;
        return isApproved && (b.day || '').toLowerCase() === effectiveDay;
      })
      .map(b => {
        const parsed = parseSlotMinutes(b.timeSlot);
        return {
          ...b,
          startMin: parsed?.startMin ?? 0,
          endMin: parsed?.endMin ?? 0,
          startFormatted: parsed?.startFormatted ?? b.timeSlot,
          endFormatted: parsed?.endFormatted ?? '',
        };
      })
      .sort((a, b) => a.startMin - b.startMin);
  }, [bookings, effectiveDay]);

  // Identify currently ongoing session and next upcoming session
  const ongoingSession = useMemo(() => {
    return (
      todaySessions.find(
        s => wibNow.totalMin >= s.startMin && wibNow.totalMin < s.endMin
      ) || null
    );
  }, [todaySessions, wibNow.totalMin]);

  const nextSession = useMemo(() => {
    return todaySessions.find(s => s.startMin > wibNow.totalMin) || null;
  }, [todaySessions, wibNow.totalMin]);

  // Banner State: 'ONGOING' | 'AVAILABLE' | 'FINISHED'
  const bannerState = useMemo(() => {
    if (ongoingSession) return 'ONGOING';
    if (nextSession) return 'AVAILABLE';
    return 'FINISHED';
  }, [ongoingSession, nextSession]);

  // Auto-scroll mobile strip to ongoing or next session on load / change
  useEffect(() => {
    const targetSession = ongoingSession || nextSession;
    if (!targetSession || !mobileStripRef.current) return;
    const timer = setTimeout(() => {
      const cardEl = cardRefs.current[targetSession.id];
      if (cardEl && mobileStripRef.current) {
        // Offset by 28px so previous card peeks through as a swipe hint
        const targetLeft = Math.max(0, cardEl.offsetLeft - 28);
        const isReduced =
          typeof window !== 'undefined' &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        mobileStripRef.current.scrollTo({
          left: targetLeft,
          behavior: isReduced ? 'auto' : 'smooth',
        });
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [ongoingSession?.id, nextSession?.id, todaySessions.length]);

  const handleCopy = async (text, fieldName) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedField(fieldName);
      if (onShowToast) {
        onShowToast({
          type: 'success',
          title: 'Tersalin',
          message: `${fieldName} berhasil disalin ke clipboard.`,
        });
      }
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  // Helper for computing session status in the strip
  const getSessionStatus = (s) => {
    if (wibNow.totalMin >= s.endMin) {
      return { type: 'PASSED', label: 'Selesai' };
    }
    if (wibNow.totalMin >= s.startMin && wibNow.totalMin < s.endMin) {
      const duration = Math.max(1, s.endMin - s.startMin);
      const elapsed = Math.max(0, wibNow.totalMin - s.startMin);
      const progressPercent = Math.min(100, Math.max(0, Math.round((elapsed / duration) * 100)));
      const remainingMin = Math.max(1, s.endMin - wibNow.totalMin);
      return {
        type: 'LIVE',
        label: 'Berlangsung',
        remainingMin,
        progressPercent,
      };
    }
    if (nextSession && s.id === nextSession.id) {
      const minsUntil = Math.max(1, s.startMin - wibNow.totalMin);
      return {
        type: 'NEXT',
        label: `~${minsUntil} mnt lagi`,
        minsUntil,
      };
    }
    return {
      type: 'LATER',
      label: `Mulai ${s.startFormatted}`,
    };
  };

  return (
    <div className="no-print rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs mb-3 transition-colors overflow-hidden">
      {/* Cloud Sync Alert Header (if any) */}
      {syncError && (
        <div className="px-3.5 py-1.5 bg-rose-50 dark:bg-rose-950/30 border-b border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Koneksi cloud terhambat. Menampilkan data lokal.</span>
          </div>
          {onRefetch && (
            <button
              type="button"
              onClick={onRefetch}
              className="font-medium underline hover:text-rose-900 dark:hover:text-rose-100 cursor-pointer"
            >
              Coba lagi
            </button>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          1. BANNER STATUS (DESKTOP: >=768px, MOBILE: <768px)
      ───────────────────────────────────────────────────────────────────────── */}
      <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-zinc-800/80">
        {/* DESKTOP BANNER (>=768px): Satu Baris */}
        <div className="hidden md:flex items-center justify-between gap-4">
          {/* Left: Badge + Text */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {isLoading ? (
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Memeriksa status ruang perkuliahan...</span>
              </div>
            ) : bannerState === 'ONGOING' ? (
              <>
                <span
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border shrink-0 ${
                    (ongoingSession.room || 'zoom') === 'gmeet'
                      ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300 border-teal-300 dark:border-teal-800'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                  }`}
                >
                  <span className="relative flex h-2 w-2">
                    <span
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 motion-reduce:hidden ${
                        (ongoingSession.room || 'zoom') === 'gmeet' ? 'bg-teal-400' : 'bg-emerald-400'
                      }`}
                    ></span>
                    <span
                      className={`relative inline-flex rounded-full h-2 w-2 ${
                        (ongoingSession.room || 'zoom') === 'gmeet' ? 'bg-teal-600 dark:bg-teal-400' : 'bg-emerald-600 dark:bg-emerald-400'
                      }`}
                    ></span>
                  </span>
                  {(ongoingSession.room || 'zoom') === 'gmeet' ? (
                    <span className="inline-flex items-center gap-1">
                      <Video className="w-3.5 h-3.5" />
                      <span>Meet Berlangsung</span>
                    </span>
                  ) : (
                    <span>Sedang berlangsung</span>
                  )}
                </span>
                <span className="text-xs text-slate-700 dark:text-zinc-300 truncate">
                  <strong className="font-semibold text-slate-900 dark:text-zinc-100">
                    {ongoingSession.note}
                  </strong>{' '}
                  &bull; Angkatan {ongoingSession.batch} &bull; Sisa{' '}
                  {Math.max(1, ongoingSession.endMin - wibNow.totalMin)} menit
                </span>
              </>
            ) : bannerState === 'AVAILABLE' ? (
              <>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-300 dark:border-sky-800 shrink-0">
                  Ruang tersedia
                </span>
                <span className="text-xs text-slate-700 dark:text-zinc-300 truncate">
                  Berikutnya:{' '}
                  <strong className="font-semibold text-slate-900 dark:text-zinc-100">
                    {nextSession.note}
                  </strong>{' '}
                  &bull; Angkatan {nextSession.batch} &bull; Jam {nextSession.startFormatted} (~
                  {Math.max(1, nextSession.startMin - wibNow.totalMin)} menit lagi){' '}
                  {(nextSession.room || 'zoom') === 'gmeet' && (
                    <span className="text-teal-700 dark:text-teal-400 font-semibold">[Google Meet]</span>
                  )}
                </span>
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 border border-slate-300 dark:border-zinc-700 shrink-0">
                  Selesai
                </span>
                <span className="text-xs text-slate-600 dark:text-zinc-400 font-medium">
                  Tidak ada kuliah lagi hari ini.
                </span>
              </>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {onOpenTodaySchedule && (
              <button
                type="button"
                onClick={onOpenTodaySchedule}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors cursor-pointer"
                title="Buka ringkasan seluruh kuliah hari ini"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Lihat Kuliah Hari Ini</span>
              </button>
            )}

            {/* Admin Zoom Quick Actions (if admin) */}
            {isAdmin && zoomConfig?.joinUrl && (
              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-zinc-800">
                <a
                  href={zoomConfig.joinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#17324D] hover:bg-[#112437] text-white transition-colors cursor-pointer"
                  title="Buka Zoom Admin"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Zoom</span>
                </a>
                {zoomConfig.meetingId && (
                  <button
                    type="button"
                    onClick={() => handleCopy(zoomConfig.meetingId, 'Meeting ID')}
                    className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-mono bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                    title="Salin Meeting ID"
                  >
                    <span>ID</span>
                    {copiedField === 'Meeting ID' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* MOBILE BANNER (<768px): Maksimal Dua Baris */}
        <div className="md:hidden flex flex-col gap-1.5">
          {/* Baris 1: Badge Status + Quick Action */}
          <div className="flex items-center justify-between gap-2">
            <div>
              {isLoading ? (
                <span className="text-xs text-slate-500 dark:text-zinc-400">Memeriksa...</span>
              ) : bannerState === 'ONGOING' ? (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    (ongoingSession.room || 'zoom') === 'gmeet'
                      ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300 border-teal-300 dark:border-teal-800'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                  }`}
                >
                  <span className="relative flex h-2 w-2">
                    <span
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 motion-reduce:hidden ${
                        (ongoingSession.room || 'zoom') === 'gmeet' ? 'bg-teal-400' : 'bg-emerald-400'
                      }`}
                    ></span>
                    <span
                      className={`relative inline-flex rounded-full h-2 w-2 ${
                        (ongoingSession.room || 'zoom') === 'gmeet' ? 'bg-teal-600 dark:bg-teal-400' : 'bg-emerald-600 dark:bg-emerald-400'
                      }`}
                    ></span>
                  </span>
                  {(ongoingSession.room || 'zoom') === 'gmeet' ? (
                    <span className="inline-flex items-center gap-1">
                      <Video className="w-3 h-3" />
                      <span>Meet Sedang Berlangsung</span>
                    </span>
                  ) : (
                    <span>Sedang berlangsung</span>
                  )}
                </span>
              ) : bannerState === 'AVAILABLE' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
                  Ruang tersedia
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 border border-slate-300 dark:border-zinc-700">
                  Selesai
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">


              {onOpenTodaySchedule && (
                <button
                  type="button"
                  onClick={onOpenTodaySchedule}
                  className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer min-h-[44px] px-1.5 justify-end"
                >
                  <span>Lihat Semua</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Baris 2: Satu Kalimat Singkat (Dapat Ditekan Jika Terpotong) */}
          <div
            onClick={() => setShowFullMobileBanner(prev => !prev)}
            className="cursor-pointer min-h-[44px] flex items-center"
            title="Ketuk untuk melihat teks lengkap"
          >
            {bannerState === 'ONGOING' ? (
              <p
                className={`text-xs text-slate-700 dark:text-zinc-300 leading-relaxed ${
                  showFullMobileBanner ? '' : 'line-clamp-2'
                }`}
              >
                <strong className="font-semibold text-slate-900 dark:text-zinc-100">
                  {ongoingSession.note}
                </strong>{' '}
                (Angkatan {ongoingSession.batch}) &bull; Sisa{' '}
                {Math.max(1, ongoingSession.endMin - wibNow.totalMin)} menit{' '}
                {(ongoingSession.room || 'zoom') === 'gmeet' && (
                  <span className="text-teal-700 dark:text-teal-400 font-semibold">[Google Meet]</span>
                )}
              </p>
            ) : bannerState === 'AVAILABLE' ? (
              <p
                className={`text-xs text-slate-700 dark:text-zinc-300 leading-relaxed ${
                  showFullMobileBanner ? '' : 'line-clamp-2'
                }`}
              >
                Berikutnya:{' '}
                <strong className="font-semibold text-slate-900 dark:text-zinc-100">
                  {nextSession.note}
                </strong>{' '}
                (Angkatan {nextSession.batch}) &bull; {nextSession.startFormatted}, ~
                {Math.max(1, nextSession.startMin - wibNow.totalMin)} menit lagi{' '}
                {(nextSession.room || 'zoom') === 'gmeet' && (
                  <span className="text-teal-700 dark:text-teal-400 font-semibold">[Google Meet]</span>
                )}
              </p>
            ) : (
              <p className="text-xs text-slate-600 dark:text-zinc-400 font-medium">
                Tidak ada kuliah lagi hari ini.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          2. STRIP GARIS WAKTU SESI HARI INI
      ───────────────────────────────────────────────────────────────────────── */}
      <div className="p-3 sm:p-4">
        {/* Label & Hint Header */}
        <div className="flex items-center justify-between mb-2.5 px-0.5">
          <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
            Hari ini &bull; {todaySessions.length} sesi
          </span>
          {todaySessions.length > 1 && (
            <span className="md:hidden text-xs text-slate-400 dark:text-zinc-500 flex items-center gap-1 font-medium">
              Geser &rarr;
            </span>
          )}
        </div>

        {/* Empty State: Tidak ada kuliah hari ini */}
        {todaySessions.length === 0 ? (
          <div className="py-6 px-4 text-center rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-dashed border-slate-200 dark:border-zinc-800 text-xs text-slate-500 dark:text-zinc-400">
            Tidak ada perkuliahan yang terjadwal untuk hari ini.
          </div>
        ) : (
          <>
            {/* DESKTOP STRIP (>=768px): Grid kartu dengan lebar sama */}
            <div
              className={`hidden md:grid gap-2.5 ${
                todaySessions.length === 1
                  ? 'grid-cols-1 max-w-sm'
                  : 'grid-flow-col auto-cols-fr'
              }`}
            >
              {todaySessions.map((session) => {
                const status = getSessionStatus(session);
                const batchConfig = BATCHES.find(b => b.id === session.batch);
                const isSelected = selectedSessionForDetail?.id === session.id;

                let cardStyle =
                  'border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 hover:border-slate-300 dark:hover:border-zinc-700';

                if (status.type === 'LIVE') {
                  cardStyle =
                    'border-2 border-emerald-500 dark:border-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100 shadow-2xs';
                } else if (status.type === 'NEXT') {
                  cardStyle =
                    'border-2 border-sky-500 dark:border-sky-400 bg-sky-50/50 dark:bg-sky-950/30 text-sky-950 dark:text-sky-100';
                } else if (status.type === 'PASSED') {
                  cardStyle =
                    'border border-slate-200/80 dark:border-zinc-800/80 bg-slate-100/60 dark:bg-zinc-900/40 text-slate-500 dark:text-zinc-400 opacity-75';
                }

                return (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() =>
                      setSelectedSessionForDetail(prev =>
                        prev?.id === session.id ? null : session
                      )
                    }
                    className={`text-left p-2.5 rounded-xl transition-all cursor-pointer flex flex-col justify-between min-h-[92px] min-w-0 ${cardStyle} ${
                      isSelected ? 'ring-2 ring-emerald-500' : ''
                    }`}
                  >
                    {/* Jam & Angkatan + Ruang Badge */}
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-mono text-xs font-semibold text-slate-600 dark:text-zinc-300 whitespace-nowrap">
                        {session.startFormatted} - {session.endFormatted}
                      </span>
                      <div className="flex items-center gap-1">
                        <span
                          className={`text-xs font-bold px-1.5 py-0.2 rounded ${
                            batchConfig?.badge || 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {session.batch}
                        </span>
                        {(session.room || 'zoom') === 'gmeet' ? (
                          <span
                            title="Ruang Google Meet"
                            className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200 border border-teal-200/60 dark:border-teal-800/60 inline-flex items-center gap-0.5"
                          >
                            <Video className="w-2.5 h-2.5" /> Meet
                          </span>
                        ) : (
                          <span
                            title="Ruang Zoom"
                            className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200 border border-sky-200/60 dark:border-sky-800/60"
                          >
                            Zoom
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Nama Kuliah Satu Baris dengan Ellipsis dan Tooltip */}
                    <p
                      title={session.note}
                      className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate w-full block"
                    >
                      {session.note}
                    </p>

                    {/* Status Sesi */}
                    <div className="mt-2 pt-1.5 border-t border-slate-200/60 dark:border-zinc-800/60">
                      {status.type === 'LIVE' ? (
                        <div>
                          <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-reduce:hidden"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                              </span>
                              Berlangsung
                            </span>
                            <span className="font-mono text-xs">Sisa {status.remainingMin} mnt</span>
                          </div>
                          {/* Progress bar sisa waktu */}
                          <div className="w-full bg-emerald-200/80 dark:bg-emerald-900/80 rounded-full h-1.5 overflow-hidden mt-1.5">
                            <div
                              className="bg-emerald-600 dark:bg-emerald-400 h-full rounded-full transition-all duration-500 motion-reduce:transition-none"
                              style={{ width: `${status.progressPercent}%` }}
                            />
                          </div>
                        </div>
                      ) : status.type === 'NEXT' ? (
                        <div className="flex items-center justify-between text-xs font-bold text-sky-800 dark:text-sky-300">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                            Berikutnya
                          </span>
                          <span className="font-mono text-xs">{status.label}</span>
                        </div>
                      ) : status.type === 'PASSED' ? (
                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-zinc-400">
                          <Check className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
                          <span>Selesai</span>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-600 dark:text-zinc-400 font-medium">
                          {status.label}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* MOBILE STRIP (<768px): Satu baris horizontal yang bisa digeser (overflow-x: auto) */}
            <div
              ref={mobileStripRef}
              className="md:hidden overflow-x-auto flex gap-2.5 pb-2 -mx-3 px-3 no-scrollbar"
              style={{
                scrollSnapType: 'x mandatory',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {todaySessions.map((session) => {
                const status = getSessionStatus(session);
                const batchConfig = BATCHES.find(b => b.id === session.batch);
                const isSelected = selectedSessionForDetail?.id === session.id;

                let cardStyle =
                  'border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200';

                if (status.type === 'LIVE') {
                  cardStyle =
                    'border-2 border-emerald-500 dark:border-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100';
                } else if (status.type === 'NEXT') {
                  cardStyle =
                    'border-2 border-sky-500 dark:border-sky-400 bg-sky-50/50 dark:bg-sky-950/30 text-sky-950 dark:text-sky-100';
                } else if (status.type === 'PASSED') {
                  cardStyle =
                    'border border-slate-200/80 dark:border-zinc-800/80 bg-slate-100/60 dark:bg-zinc-900/40 text-slate-500 dark:text-zinc-400 opacity-75';
                }

                return (
                  <button
                    key={session.id}
                    ref={el => {
                      if (el) cardRefs.current[session.id] = el;
                    }}
                    type="button"
                    onClick={() =>
                      setSelectedSessionForDetail(prev =>
                        prev?.id === session.id ? null : session
                      )
                    }
                    style={{ scrollSnapAlign: 'start' }}
                    className={`shrink-0 w-[150px] min-w-[150px] text-left p-3 rounded-xl transition-all cursor-pointer flex flex-col justify-between min-h-[96px] ${cardStyle} ${
                      isSelected ? 'ring-2 ring-emerald-500' : ''
                    }`}
                  >
                    {/* Jam & Angkatan + Ruang Badge */}
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-mono text-xs font-semibold text-slate-600 dark:text-zinc-300">
                        {session.startFormatted}
                      </span>
                      <div className="flex items-center gap-1">
                        <span
                          className={`text-xs font-bold px-1.5 py-0.2 rounded ${
                            batchConfig?.badge || 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {session.batch}
                        </span>
                        {(session.room || 'zoom') === 'gmeet' ? (
                          <span
                            title="Ruang Google Meet"
                            className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200 border border-teal-200/60 dark:border-teal-800/60 inline-flex items-center gap-0.5"
                          >
                            <Video className="w-2.5 h-2.5" /> Meet
                          </span>
                        ) : (
                          <span
                            title="Ruang Zoom"
                            className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200 border border-sky-200/60 dark:border-sky-800/60"
                          >
                            Zoom
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Nama Kuliah Satu Baris dengan Ellipsis */}
                    <p
                      title={session.note}
                      className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate w-full block"
                    >
                      {session.note}
                    </p>

                    {/* Status Sesi */}
                    <div className="mt-2 pt-1 border-t border-slate-200/60 dark:border-zinc-800/60">
                      {status.type === 'LIVE' ? (
                        <div>
                          <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
                            <span className="inline-flex items-center gap-1">
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-reduce:hidden"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-600"></span>
                              </span>
                              Live
                            </span>
                            <span className="font-mono text-xs">{status.remainingMin}m</span>
                          </div>
                          {/* Progress bar */}
                          <div className="w-full bg-emerald-200/80 dark:bg-emerald-900/80 rounded-full h-1.5 overflow-hidden mt-1">
                            <div
                              className="bg-emerald-600 dark:bg-emerald-400 h-full rounded-full transition-all duration-500 motion-reduce:transition-none"
                              style={{ width: `${status.progressPercent}%` }}
                            />
                          </div>
                        </div>
                      ) : status.type === 'NEXT' ? (
                        <div className="text-xs font-bold text-sky-800 dark:text-sky-300 truncate">
                          {status.label}
                        </div>
                      ) : status.type === 'PASSED' ? (
                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-zinc-400">
                          <Check className="w-3.5 h-3.5 text-slate-400" />
                          <span>Selesai</span>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-600 dark:text-zinc-400 font-medium truncate">
                          {status.label}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* ─────────────────────────────────────────────────────────────────────
            3. DETAIL PANEL / POPOVER (DESKTOP: Panel di dekat kartu)
        ───────────────────────────────────────────────────────────────────── */}
        {selectedSessionForDetail && (
          <div className="hidden md:block mt-3 p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-950/60 shadow-xs animate-fade-in">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-200/80 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200">
                    {selectedSessionForDetail.startFormatted} - {selectedSessionForDetail.endFormatted} WIB
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Angkatan {selectedSessionForDetail.batch}
                  </span>
                  {(selectedSessionForDetail.room || 'zoom') === 'gmeet' ? (
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border border-teal-200 dark:border-teal-800 inline-flex items-center gap-1">
                      <Video className="w-3 h-3 text-teal-600" /> Google Meet
                    </span>
                  ) : (
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                      Zoom Kebidanan
                    </span>
                  )}
                </div>
                {/* Full Unclipped Course Name */}
                <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100 break-words leading-snug">
                  {selectedSessionForDetail.note}
                </h4>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-zinc-400 pt-0.5">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Dosen: <strong>{selectedSessionForDetail.pic || '-'}</strong>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    PJ: <strong>{selectedSessionForDetail.requestedBy || selectedSessionForDetail.pic || '-'}</strong>
                  </span>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-zinc-800">
                  {isAdmin ? (
                    <>
                      {(selectedSessionForDetail.room || 'zoom') === 'gmeet' ? (
                        <a
                          href={zoomConfig?.gmeetUrl || DEFAULT_ZOOM_CONFIG.gmeetUrl || 'https://meet.google.com/kqe-reho-vbd'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-2xs transition-colors cursor-pointer"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Masuk Google Meet</span>
                        </a>
                      ) : (
                        zoomConfig?.joinUrl && (
                          <a
                            href={zoomConfig.joinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#17324D] hover:bg-[#112437] text-white shadow-2xs transition-colors cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Masuk Zoom</span>
                          </a>
                        )
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          const link = (selectedSessionForDetail.room || 'zoom') === 'gmeet'
                            ? (zoomConfig?.gmeetUrl || DEFAULT_ZOOM_CONFIG.gmeetUrl || 'https://meet.google.com/kqe-reho-vbd')
                            : (zoomConfig?.joinUrl || DEFAULT_ZOOM_CONFIG.joinUrl);
                          handleCopy(link, 'Tautan Perkuliahan');
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      >
                        {copiedField === 'Tautan Perkuliahan' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                        <span>Salin Link</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openWhatsAppShare(selectedSessionForDetail, zoomConfig)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                        title="Bagikan info jadwal ke WhatsApp grup kelas"
                      >
                        <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Bagi ke WhatsApp</span>
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 py-0.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>
                        Akses ruang perkuliahan terproteksi. Tautan & kredensial dibagikan oleh PJ Angkatan {selectedSessionForDetail.batch} kepada kelas yang bersangkutan.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSessionForDetail(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                aria-label="Tutup detail sesi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          4. DETAIL BOTTOM SHEET (MOBILE: <768px, Bottom Sheet Panel)
      ───────────────────────────────────────────────────────────────────────── */}
      {selectedSessionForDetail && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-fade-in">
          {/* Backdrop Tap Area */}
          <div
            className="flex-1"
            onClick={() => setSelectedSessionForDetail(null)}
          />

          {/* Bottom Sheet Card */}
          <div
            className="bg-white dark:bg-zinc-900 rounded-t-2xl border-t border-slate-200 dark:border-zinc-800 p-5 shadow-2xl animate-modal-pop"
            style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 16px))' }}
          >
            {/* Drag Pill Handle */}
            <div className="w-10 h-1 bg-slate-300 dark:bg-zinc-700 rounded-full mx-auto mb-4" />

            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200">
                  {selectedSessionForDetail.startFormatted} - {selectedSessionForDetail.endFormatted} WIB
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Angkatan {selectedSessionForDetail.batch}
                </span>
                {(selectedSessionForDetail.room || 'zoom') === 'gmeet' ? (
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border border-teal-200 dark:border-teal-800 inline-flex items-center gap-1">
                    <Video className="w-3 h-3 text-teal-600" /> Google Meet
                  </span>
                ) : (
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                    Zoom
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedSessionForDetail(null)}
                className="min-h-[44px] min-w-[44px] -mr-2 -mt-2 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 cursor-pointer"
                aria-label="Tutup detail"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nama Kuliah Lengkap */}
            <h4 className="text-base font-bold text-slate-900 dark:text-zinc-100 break-words leading-snug mb-3">
              {selectedSessionForDetail.note}
            </h4>

            {/* Detail List */}
            <div className="space-y-2 py-2 border-t border-b border-slate-100 dark:border-zinc-800 text-xs">
              <div className="flex items-center justify-between text-slate-600 dark:text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-slate-400" />
                  Dosen Pengajar:
                </span>
                <strong className="text-slate-900 dark:text-zinc-100">
                  {selectedSessionForDetail.pic || '-'}
                </strong>
              </div>

              <div className="flex items-center justify-between text-slate-600 dark:text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-slate-400" />
                  Penanggung Jawab / PJ:
                </span>
                <strong className="text-slate-900 dark:text-zinc-100">
                  {selectedSessionForDetail.requestedBy || selectedSessionForDetail.pic || '-'}
                </strong>
              </div>

              <div className="flex items-center justify-between text-slate-600 dark:text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-400" />
                  Hari Perkuliahan:
                </span>
                <strong className="text-slate-900 dark:text-zinc-100">
                  {selectedSessionForDetail.day}
                </strong>
              </div>

              <div className="flex items-center justify-between text-slate-600 dark:text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-slate-400" />
                  Ruang Virtual:
                </span>
                <strong className={(selectedSessionForDetail.room || 'zoom') === 'gmeet' ? 'text-teal-700 dark:text-teal-300 font-bold' : 'text-sky-700 dark:text-sky-300 font-bold'}>
                  {(selectedSessionForDetail.room || 'zoom') === 'gmeet' ? 'Google Meet (Alternatif)' : 'Zoom Kebidanan'}
                </strong>
              </div>
            </div>

            {/* Action Buttons: Protected for Public */}
            <div className="mt-3.5 space-y-2">
              {isAdmin ? (
                <>
                  {(selectedSessionForDetail.room || 'zoom') === 'gmeet' ? (
                    <a
                      href={zoomConfig?.gmeetUrl || DEFAULT_ZOOM_CONFIG.gmeetUrl || 'https://meet.google.com/kqe-reho-vbd'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full min-h-[44px] py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
                    >
                      <Video className="w-4 h-4" />
                      <span>Buka Google Meet</span>
                    </a>
                  ) : (
                    zoomConfig?.joinUrl && (
                      <a
                        href={zoomConfig.joinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full min-h-[44px] py-2.5 rounded-xl bg-[#17324D] hover:bg-[#112437] text-white text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Buka Ruang Zoom</span>
                      </a>
                    )
                  )}

                  <button
                    type="button"
                    onClick={() => openWhatsAppShare(selectedSessionForDetail, zoomConfig)}
                    className="w-full min-h-[44px] py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-4 h-4 text-emerald-600" />
                    <span>Bagikan Jadwal ke WhatsApp Grup</span>
                  </button>
                </>
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/80 flex items-start gap-2.5 text-xs text-slate-600 dark:text-zinc-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-zinc-200 block mb-0.5">
                      Akses Ruang Perkuliahan Terproteksi
                    </span>
                    <p className="text-[11px] leading-relaxed">
                      Tautan & kredensial perkuliahan dibagikan secara khusus oleh Koordinator/PJ Angkatan {selectedSessionForDetail.batch} kepada dosen dan mahasiswa di kelas yang bersangkutan.
                    </p>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setSelectedSessionForDetail(null)}
                className="w-full min-h-[44px] py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
