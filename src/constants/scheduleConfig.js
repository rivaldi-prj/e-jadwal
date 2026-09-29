export const TIME_SLOTS = [
  { id: 'slot-1', label: '08.00 - 09.40', startH: 8, startM: 0, endH: 9, endM: 40 },
  { id: 'slot-2', label: '10.00 - 11.40', startH: 10, startM: 0, endH: 11, endM: 40 },
  { id: 'slot-3', label: '13.30 - 15.10', startH: 13, startM: 30, endH: 15, endM: 10 },
  { id: 'slot-4', label: '16.00 - 17.40', startH: 16, startM: 0, endH: 17, endM: 40 },
  { id: 'slot-5', label: '17.40 - 18.40', startH: 17, startM: 40, endH: 18, endM: 40 },
  { id: 'slot-6', label: '19.00 - 20.40', startH: 19, startM: 0, endH: 20, endM: 40 },
];

export const DAYS_OF_WEEK = [
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
  'Minggu',
];

export const BATCHES = [
  {
    id: '2023',
    name: 'Angkatan 2023',
    accentBorder: 'border-l-sky-500',
    cardBg: 'bg-[#BAE6FD] dark:bg-sky-950/80 text-sky-950 dark:text-sky-100 shadow-sm',
    badge: 'bg-white/80 dark:bg-sky-900/60 text-sky-900 dark:text-sky-200',
    avatarBg: 'bg-sky-950 text-white dark:bg-sky-200 dark:text-sky-950',
    progressSolid: 'bg-sky-950 dark:bg-sky-200',
    progressMuted: 'bg-sky-950/20 dark:bg-sky-200/20',
    dot: 'bg-sky-500 dark:bg-sky-400',
    activeTab: 'bg-sky-600 text-white dark:bg-sky-500 dark:text-white shadow-xs',
  },
  {
    id: '2024',
    name: 'Angkatan 2024',
    accentBorder: 'border-l-rose-500',
    cardBg: 'bg-[#FBCFE8] dark:bg-rose-950/80 text-rose-950 dark:text-rose-100 shadow-sm',
    badge: 'bg-white/80 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200',
    avatarBg: 'bg-rose-950 text-white dark:bg-rose-200 dark:text-rose-950',
    progressSolid: 'bg-rose-950 dark:bg-rose-200',
    progressMuted: 'bg-rose-950/20 dark:bg-rose-200/20',
    dot: 'bg-rose-500 dark:bg-rose-400',
    activeTab: 'bg-rose-600 text-white dark:bg-rose-500 dark:text-white shadow-xs',
  },
  {
    id: '2025',
    name: 'Angkatan 2025',
    accentBorder: 'border-l-violet-500',
    cardBg: 'bg-[#DDD6FE] dark:bg-violet-950/80 text-violet-950 dark:text-violet-100 shadow-sm',
    badge: 'bg-white/80 dark:bg-violet-900/60 text-violet-900 dark:text-violet-200',
    avatarBg: 'bg-violet-950 text-white dark:bg-violet-200 dark:text-violet-950',
    progressSolid: 'bg-violet-950 dark:bg-violet-200',
    progressMuted: 'bg-violet-950/20 dark:bg-violet-200/20',
    dot: 'bg-violet-500 dark:bg-violet-400',
    activeTab: 'bg-violet-600 text-white dark:bg-violet-500 dark:text-white shadow-xs',
  },
  {
    id: '2026',
    name: 'Angkatan 2026',
    accentBorder: 'border-l-amber-500',
    cardBg: 'bg-[#FDE047] dark:bg-amber-500/80 text-amber-950 dark:text-amber-950 shadow-sm',
    badge: 'bg-white/80 dark:bg-amber-950/60 text-amber-950 dark:text-amber-100',
    avatarBg: 'bg-amber-950 text-white dark:bg-amber-950 dark:text-amber-200',
    progressSolid: 'bg-amber-950 dark:bg-amber-950',
    progressMuted: 'bg-amber-950/20 dark:bg-amber-950/20',
    dot: 'bg-amber-500 dark:bg-amber-400',
    activeTab: 'bg-amber-600 text-white dark:bg-amber-500 dark:text-white shadow-xs',
  },
];

export function getLecturerInitials(name) {
  if (!name || name === '-') return 'DK';
  const cleaned = name.replace(/^(Dr\.|Dra\.|Prof\.|Ns\.|Bd\.|Bdn\.|H\.|Hj\.)\s*/gi, '').trim();
  const parts = cleaned.split(/[\s,]+/).filter(Boolean);
  if (parts.length === 0) return 'DK';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export const DEFAULT_ZOOM_CONFIG = {
  name: 'ZOOM KEBIDANAN',
  joinUrl: 'https://zoom.us/j/91053222846?pwd=IVBzhDahrYwKkOZtl80RS88eZH1JzE.1',
  meetingId: '910 5322 2846',
  passcode: '433452',
  gmeetUrl: 'https://meet.google.com/kqe-reho-vbd',
};

export const DEFAULT_ADMIN_PIN = '1234';

// Status reservasi jadwal
export const BOOKING_STATUS = {
  PENDING:  'pending',   // Diajukan publik, menunggu persetujuan admin
  APPROVED: 'approved',  // Disetujui admin, tampil di jadwal publik
  REJECTED: 'rejected',  // Ditolak admin, tidak tampil
};

// Jadwal awal kosong secara default (hanya perkuliahan yang menggunakan Zoom yang dijadwalkan)
export const INITIAL_BOOKINGS = [];
