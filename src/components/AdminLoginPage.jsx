import React, { useState } from 'react';
import {
  AtSign,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  X,
  ShieldCheck,
  Info,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import fikesLogo from '../assets/logo-fikes-unbrah.png';

export function AdminLoginPage({
  onLoginSuccess,
  onBackToPublic,
  verifyAdminPin,
}) {
  const [emailInput, setEmailInput] = useState('admin@unbrah.ac.id');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');
    const passTrimmed = passwordInput.trim();
    if (!passTrimmed) {
      setErrorMessage('Harap masukkan Kata Sandi / PIN Pengelola.');
      return;
    }
    setIsLoading(true);
    // verifyAdminPin is async (SHA-256 hash comparison)
    verifyAdminPin(passTrimmed).then((isValid) => {
      setIsLoading(false);
      if (isValid) {
        onLoginSuccess();
      } else {
        setErrorMessage('Kata sandi atau PIN pengelola salah. Akses ditolak.');
        setPasswordInput('');
      }
    });
  };

  const handleForgotPassword = () => {
    setErrorMessage('');
    setShowInfoModal(true);
  };

  return (
    <div className="relative min-h-screen bg-[#F5F7FA] flex flex-col items-center justify-center p-4 sm:p-6 antialiased overflow-hidden selection:bg-[#0D4F6C] selection:text-white">

      {/* Subtle background texture — two soft tone blocks */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-1/2 bg-[#0A3D56]/[0.04]" />
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-transparent" />
      </div>

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-[840px] bg-white rounded-2xl shadow-[0_8px_32px_-8px_rgba(10,61,86,0.14),0_2px_8px_-2px_rgba(0,0,0,0.06)] border border-slate-200/80 overflow-hidden flex flex-col md:flex-row animate-fade-in-up">

        {/* ── LEFT: Institution Info Panel ─────────────────────────────── */}
        <div className="w-full md:w-[42%] relative bg-[#0A3D56] text-white flex flex-col justify-between p-8 sm:p-10 overflow-hidden select-none">
          {/* Dot-grid decorative texture */}
          <div className="absolute inset-0 dot-grid-pattern pointer-events-none" />

          {/* Top: Brand */}
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center mb-5">
              <img
                src={fikesLogo}
                alt="Logo FIKES UNBRAH"
                className="w-8 h-8 object-contain"
              />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50 mb-1">
              Universitas Baiturrahmah
            </p>
            <h1 className="text-xl sm:text-2xl font-bold leading-snug text-white">
              Fakultas Ilmu<br />Kesehatan
            </h1>
            <div className="mt-3 w-8 h-0.5 bg-white/30 rounded-full" />
          </div>

          {/* Middle: Floating illustration area */}
          <div className="relative z-10 my-8 flex flex-col items-center text-center animate-float-slow">
            {/* Simple calendar-style icon block */}
            <div className="w-24 h-24 rounded-2xl bg-white/10 border border-white/15 flex flex-col items-center justify-center gap-1 shadow-inner mb-4">
              <Calendar className="w-10 h-10 text-white/80 stroke-[1.5]" />
            </div>
            <p className="text-sm font-semibold text-white/90 leading-snug">
              Sistem Jadwal Zoom
            </p>
            <p className="text-xs text-white/50 mt-1">
              S1 Kebidanan — FIKES UNBRAH
            </p>
          </div>

          {/* Bottom: "Pelajari" link */}
          <div className="relative z-10">
            <button
              type="button"
              onClick={() => setShowInfoModal(true)}
              className="text-xs text-white/50 hover:text-white/90 transition-colors underline underline-offset-2 cursor-pointer"
            >
              Tentang sistem ini →
            </button>
          </div>
        </div>

        {/* ── RIGHT: Login Form ─────────────────────────────────────────── */}
        <div className="w-full md:w-[58%] p-8 sm:p-10 flex flex-col justify-center bg-white">

          {/* Institution tagline */}
          <p className="text-[11px] font-semibold text-[#0A3D56]/50 uppercase tracking-[0.18em] mb-6">
            Portal Pengelola
          </p>

          {/* Heading */}
          <div className="mb-7">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Masuk ke Akun
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Masukkan kredensial pengelola untuk melanjutkan.
            </p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Email */}
            <div className="group relative flex items-center">
              <div className="absolute left-3.5 text-slate-400 group-focus-within:text-[#0A3D56] transition-colors pointer-events-none">
                <AtSign className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="Alamat Email / Akun Pengelola"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0A3D56]/20 focus:border-[#0A3D56]/60 focus:bg-white transition-all"
              />
            </div>

            {/* Password */}
            <div className={`group relative flex items-center ${errorMessage ? 'animate-shake-subtle' : ''}`}>
              <div className={`absolute left-3.5 ${errorMessage ? 'text-rose-500' : 'text-slate-400 group-focus-within:text-[#0A3D56]'} transition-colors pointer-events-none`}>
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="Kata Sandi / PIN Pengelola"
                autoFocus
                className={`w-full pl-10 pr-11 py-2.5 rounded-lg border text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition-all ${
                  errorMessage
                    ? 'border-rose-300 bg-rose-50/40 ring-2 ring-rose-100'
                    : 'border-slate-200 bg-slate-50 hover:bg-white focus:ring-2 focus:ring-[#0A3D56]/20 focus:border-[#0A3D56]/60 focus:bg-white'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                title={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between pt-0.5 text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-500 hover:text-slate-700 transition-colors">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-[#0A3D56] border-slate-300 focus:ring-[#0A3D56]/20 cursor-pointer"
                />
                <span>Ingat saya</span>
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-[#0A3D56] hover:underline font-medium cursor-pointer"
              >
                Lupa sandi?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 mt-1.5 rounded-lg bg-[#0A3D56] hover:bg-[#0C4866] active:bg-[#072E42] text-white font-semibold text-sm tracking-wide shadow-sm hover:shadow-md hover:shadow-[#0A3D56]/20 hover:-translate-y-px active:translate-y-0 transition-all duration-150 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 group"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <>
                  <span>Masuk Sekarang</span>
                  <ArrowRight className="w-4 h-4 opacity-70 group-hover:translate-x-0.5 transition-transform duration-150" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-5 flex items-center">
            <div className="flex-1 border-t border-slate-200" />
            <span className="px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
              atau
            </span>
            <div className="flex-1 border-t border-slate-200" />
          </div>

          {/* Back to public */}
          <button
            type="button"
            onClick={onBackToPublic}
            className="group w-full py-2.5 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 active:scale-[0.99] flex items-center justify-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-all duration-150 cursor-pointer"
          >
            <Calendar className="w-4 h-4 text-[#0A3D56]" />
            <span>Lihat Jadwal Kuliah (Tanpa Login)</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-5 text-center text-xs text-slate-400 font-medium z-10 relative">
        © {new Date().getFullYear()}{' '}
        <strong className="font-semibold text-slate-500">Fakultas Ilmu Kesehatan</strong>{' '}
        Universitas Baiturrahmah.
      </footer>

      {/* Info Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-2xl p-6 relative animate-modal-pop">
            <button
              onClick={() => setShowInfoModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-[#0A3D56]/10 flex items-center justify-center text-[#0A3D56] flex-shrink-0">
                <Info className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Sistem Informasi E-Jadwal Zoom
                </h4>
                <p className="text-[11px] text-slate-500">
                  Program Studi S1 Kebidanan · FIKES UNBRAH
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                Sistem ini digunakan untuk mengoordinasikan dan memantau jadwal penggunaan ruang virtual Zoom perkuliahan di lingkungan Program Studi S1 Kebidanan.
              </p>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Petunjuk Penggunaan:</span>
                </div>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600">
                  <li>Mahasiswa &amp; Dosen dapat melihat jadwal langsung tanpa perlu login.</li>
                  <li>Halaman ini khusus untuk Pengelola &amp; Admin Prodi untuk mengatur jadwal.</li>
                  <li>PIN Default Pengelola: <strong className="text-slate-800 font-mono">1234</strong></li>
                </ul>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowInfoModal(false)}
              className="w-full mt-5 py-2.5 rounded-lg bg-[#0A3D56] hover:bg-[#0C4866] text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
