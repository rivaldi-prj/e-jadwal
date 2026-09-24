import React from 'react';
import fikesLogo from '../assets/logo-fikes-unbrah.png';
import {
  GraduationCap,
  ShieldAlert,
  ShieldCheck,
  Settings,
  Printer,
  Sun,
  Moon,
  Clock,
  Sparkles
} from 'lucide-react';

export function Header({
  isAdmin,
  onOpenPinModal,
  onLockAdmin,
  onOpenConfigModal,
  darkMode,
  onToggleDarkMode,
  formattedTime,
  formattedDate,
  zoomConfig,
  cloudStatus = 'disconnected',
}) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <header className="no-print sticky top-0 z-30 border-b border-zinc-200/80 dark:border-zinc-800/90 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md transition-colors">
      <div className="max-w-[1580px] mx-auto px-3.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-15 sm:h-16">
          {/* Logo & Academic Title */}
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-zinc-900 p-0.5 flex items-center justify-center shadow-xs border border-zinc-200 dark:border-zinc-800 flex-shrink-0">
              <img
                src={fikesLogo}
                alt="Logo FIKES Universitas Baiturrahmah"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                  Jadwal Ruang Zoom &bull; S1 Kebidanan
                </h1>
                <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700/80 uppercase tracking-wider">
                  FIKES UNBRAH
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 hidden sm:block tracking-tight">
                Fakultas Ilmu Kesehatan &bull; Universitas Baiturrahmah
              </p>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Cloud Sync Status Indicator */}
            {cloudStatus === 'connected' ? (
              <div
                onClick={onOpenConfigModal}
                title="Terhubung ke Database Cloud Supabase (Sinkronisasi Realtime Aktif)"
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-100/80 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px] font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span className="hidden xs:inline sm:inline">Cloud Sync</span>
              </div>
            ) : cloudStatus === 'connecting' ? (
              <div
                title="Menghubungkan ke Supabase Cloud..."
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] font-medium text-amber-600 dark:text-amber-400"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                <span className="hidden xs:inline sm:inline">Menghubungkan...</span>
              </div>
            ) : null}

            {/* Live Clock Badge */}
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-100/80 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-600 dark:text-zinc-400">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>{formattedDate}</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-200">{formattedTime}</span>
            </div>

            {/* Role Switcher */}
            {isAdmin ? (
              <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-2 sm:px-2.5 py-1 rounded-lg">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span className="text-[11px] sm:text-xs font-medium text-amber-700 dark:text-amber-300">
                  Mode Admin
                </span>
                <button
                  onClick={onLockAdmin}
                  className="ml-0.5 text-[10px] sm:text-[11px] font-semibold text-amber-700 dark:text-amber-300 hover:underline px-1 py-0.5"
                  title="Kunci Mode Pengelola"
                >
                  Kunci
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenPinModal}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors border border-zinc-200 dark:border-zinc-800"
                title="Beralih ke Mode Pengelola"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-[11px] sm:text-xs font-medium">
                  Masuk Admin
                </span>
              </button>
            )}

            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block mx-0.5" />

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
              title="Cetak Jadwal Perkuliahan"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Settings Button */}
            <button
              onClick={onOpenConfigModal}
              className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
              title="Pengaturan Akun Zoom & Database Cloud"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={onToggleDarkMode}
              className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
              title={darkMode ? "Ganti ke Mode Terang" : "Ganti ke Mode Gelap"}
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-600" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

