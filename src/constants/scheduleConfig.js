export const TIME_SLOTS = [
  { id: 'slot-1', label: '08.00 - 09.40', startH: 8, startM: 0, endH: 9, endM: 40 },
  { id: 'slot-2', label: '10.00 - 11.40', startH: 10, startM: 0, endH: 11, endM: 40 },
  { id: 'slot-3', label: '13.30 - 15.10', startH: 13, startM: 30, endH: 15, endM: 10 },
  { id: 'slot-4', label: '16.00 - 17.40', startH: 16, startM: 0, endH: 17, endM: 40 },
  { id: 'slot-5', label: '17.00 - 18.40', startH: 17, startM: 0, endH: 18, endM: 40 },
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
    id: '2022',
    name: 'Angkatan 2022',
    accentBorder: 'border-l-zinc-500 dark:border-l-zinc-400',
    badge: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/80',
    dot: 'bg-zinc-500 dark:bg-zinc-400',
    activeTab: 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs',
  },
  {
    id: '2023',
    name: 'Angkatan 2023',
    accentBorder: 'border-l-sky-500 dark:border-l-sky-400',
    badge: 'bg-sky-50/80 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/60',
    dot: 'bg-sky-500 dark:bg-sky-400',
    activeTab: 'bg-sky-600 text-white dark:bg-sky-500 dark:text-white shadow-xs',
  },
  {
    id: '2024',
    name: 'Angkatan 2024',
    accentBorder: 'border-l-emerald-500 dark:border-l-emerald-400',
    badge: 'bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60',
    dot: 'bg-emerald-500 dark:bg-emerald-400',
    activeTab: 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-white shadow-xs',
  },
  {
    id: '2025',
    name: 'Angkatan 2025',
    accentBorder: 'border-l-indigo-500 dark:border-l-indigo-400',
    badge: 'bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60',
    dot: 'bg-indigo-500 dark:bg-indigo-400',
    activeTab: 'bg-indigo-600 text-white dark:bg-indigo-500 dark:text-white shadow-xs',
  },
  {
    id: '2026',
    name: 'Angkatan 2026',
    accentBorder: 'border-l-amber-500 dark:border-l-amber-400',
    badge: 'bg-amber-50/80 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60',
    dot: 'bg-amber-500 dark:bg-amber-400',
    activeTab: 'bg-amber-600 text-white dark:bg-amber-500 dark:text-white shadow-xs',
  },
];

export const DEFAULT_ZOOM_CONFIG = {
  name: 'ZOOM KEBIDANAN',
  joinUrl: 'https://zoom.us/j/91053222846?pwd=IVBzhDahrYwKkOZtl80RS88eZH1JzE.1',
  meetingId: '910 5322 2846',
  passcode: '433452',
};

export const DEFAULT_ADMIN_PIN = '1234';

// Jadwal awal kosong secara default (hanya perkuliahan yang menggunakan Zoom yang dijadwalkan)
export const INITIAL_BOOKINGS = [];
