import React from 'react';
import fikesLogo from '../assets/logo-fikes-unbrah.png';
import {
  ShieldCheck,
  Settings,
  Sun,
  Moon,
  Clock,
  LogOut,
  Inbox,
  HelpCircle,
} from 'lucide-react';

export function Header({
  isAdmin,
  onLogoutAdmin,
  onOpenConfigModal,
  onOpenGuideModal,
  darkMode,
  onToggleDarkMode,
  formattedTime,
  formattedDate,
  zoomConfig,
  cloudStatus = 'disconnected',
  pendingCount = 0,
}) {
  return (
    <header className="no-print sticky top-0 z-30 border-b border-slate-200/80 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md transition-colors">
      {/* Top Brand Accent Line: FIKES UNBRAH Emerald & Gold */}
      <div className="h-[2.5px] w-full bg-gradient-to-r from-emerald-600 via-teal-500 to-amber-500" />

      <div className="max-w-[1580px] mx-auto px-3.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo & Academic Title */}
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-zinc-900 p-1 flex items-center justify-center border border-slate-200/80 dark:border-zinc-800 flex-shrink-0 shadow-2xs">
              <img
                src={fikesLogo}
                alt="Logo FIKES Universitas Baiturrahmah"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-sm font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
                  E-Jadwal Zoom
                </span>
                <span className="text-slate-300 dark:text-zinc-700">&bull;</span>
                <span className="text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  S1 Kebidanan
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-zinc-400 block tracking-tight truncate max-w-[160px] sm:max-w-none">
                FIKES &bull; Univ. Baiturrahmah
              </p>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Academic Clock & Live Status (Visible on mobile too) */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400">
              <span className="flex items-center gap-1.5" title="Sistem terhubung secara realtime">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-medium text-slate-600 dark:text-zinc-300 hidden md:inline">{formattedDate} &bull;</span>
              </span>
              <span className="font-mono font-semibold text-slate-800 dark:text-zinc-200 text-[11px] sm:text-[11.5px] whitespace-nowrap">{formattedTime}</span>
            </div>

            {/* Admin Management Controls */}
            {isAdmin && (
              <>
                {pendingCount > 0 && (
                  <div
                    title={`${pendingCount} permintaan jadwal menunggu persetujuan`}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500 text-white text-xs font-semibold shadow-xs animate-pulse"
                  >
                    <Inbox className="w-3.5 h-3.5" />
                    <span>{pendingCount} Menunggu</span>
                  </div>
                )}

                <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 pl-2.5 pr-1.5 py-1 rounded-lg text-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                    Admin
                  </span>
                  <button
                    type="button"
                    onClick={onLogoutAdmin}
                    className="ml-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-100/60 dark:hover:bg-rose-950/60 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                    title="Keluar dari akun Admin"
                  >
                    Keluar
                  </button>
                </div>

                <button
                  onClick={onOpenConfigModal}
                  className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Pengaturan Akun Zoom & Supabase"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </>
            )}

            <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800 hidden sm:block" />

            {/* User Friendly Actions: Panduan & Dark Mode */}
            {onOpenGuideModal && (
              <button
                type="button"
                onClick={onOpenGuideModal}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                title="Buku Petunjuk Penggunaan E-Jadwal"
              >
                <HelpCircle className="w-4 h-4 text-blue-500" />
                <span className="hidden sm:inline">Petunjuk</span>
              </button>
            )}

            <button
              type="button"
              onClick={onToggleDarkMode}
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              title={darkMode ? "Ganti ke Mode Terang" : "Ganti ke Mode Gelap"}
              aria-label="Ganti Tema"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-500 dark:text-zinc-400" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
