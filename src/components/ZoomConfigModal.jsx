import React, { useState } from 'react';
import {
  X,
  Settings,
  KeyRound,
  Download,
  Upload,
  RotateCcw,
  Video,
  CheckCircle2,
  AlertTriangle,
  Database,
  Cloud,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Mail,
  Send,
  Zap,
  Eye,
  EyeOff,
  Layers,
  ShieldCheck,
  Bell,
} from 'lucide-react';
import { showConfirmDialog } from '../utils/sweetalert';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  testSupabaseConnection,
  isSupabaseConfigured,
  cleanSupabaseUrl,
  cleanSupabaseKey,
} from '../utils/supabaseClient';
import { copyToClipboard } from '../utils/clipboard';
import { getEmailConfig, saveEmailConfig, sendTestEmail } from '../utils/emailService';

const SQL_SCHEMA = `-- 1. Buat Tabel Jadwal (bookings)
CREATE TABLE IF NOT EXISTS public.bookings (
    id TEXT PRIMARY KEY,
    day TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    batch TEXT NOT NULL,
    note TEXT NOT NULL,
    pic TEXT DEFAULT '',
    room TEXT DEFAULT 'zoom',
    status TEXT DEFAULT 'APPROVED',
    requested_by TEXT DEFAULT '',
    user_email TEXT DEFAULT '',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS room TEXT DEFAULT 'zoom';

-- 2. Buat Tabel Akun Zoom & Meet (zoom_config)
CREATE TABLE IF NOT EXISTS public.zoom_config (
    id INT PRIMARY KEY DEFAULT 1,
    name TEXT DEFAULT 'ZOOM KEBIDANAN',
    join_url TEXT NOT NULL,
    meeting_id TEXT NOT NULL,
    passcode TEXT NOT NULL,
    gmeet_url TEXT DEFAULT 'https://meet.google.com/kqe-reho-vbd',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.zoom_config ADD COLUMN IF NOT EXISTS gmeet_url TEXT DEFAULT 'https://meet.google.com/kqe-reho-vbd';

INSERT INTO public.zoom_config (id, name, join_url, meeting_id, passcode, gmeet_url)
VALUES (1, 'ZOOM KEBIDANAN', 'https://zoom.us/j/91053222846?pwd=IVBzhDahrYwKkOZtl80RS88eZH1JzE.1', '910 5322 2846', '433452', 'https://meet.google.com/kqe-reho-vbd')
ON CONFLICT (id) DO NOTHING;

-- 3. Aktifkan RLS & Kebijakan
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoom_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Bookings" ON public.bookings FOR SELECT USING (true);
CREATE POLICY "Public Insert Bookings" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Bookings" ON public.bookings FOR UPDATE USING (true);
CREATE POLICY "Public Delete Bookings" ON public.bookings FOR DELETE USING (true);
CREATE POLICY "Public Read Zoom Config" ON public.zoom_config FOR SELECT USING (true);
CREATE POLICY "Public Update Zoom Config" ON public.zoom_config FOR UPDATE USING (true);
CREATE POLICY "Public Insert Zoom Config" ON public.zoom_config FOR INSERT WITH CHECK (true);

-- 4. Aktifkan Realtime Sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.zoom_config;

-- 5. Cegah bentrok slot pada platform yang sama di tingkat database
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_booking_slot_room 
ON public.bookings (day, time_slot, room) 
WHERE status != 'rejected';`;

export function ZoomConfigModal({
  isOpen,
  onClose,
  zoomConfig,
  onUpdateZoomConfig,
  isAdmin,
  onUpdatePin,
  onResetDefault,
  exportData,
  importData,
  onShowToast,
  cloudStatus = 'disconnected',
  lastSyncTime = null,
  onPushLocalToCloud,
}) {
  const [activeTab, setActiveTab] = useState('zoom'); // 'zoom' | 'database' | 'pin' | 'data'

  const [configForm, setConfigForm] = useState({
    name: zoomConfig.name || '',
    joinUrl: zoomConfig.joinUrl || '',
    meetingId: zoomConfig.meetingId || '',
    passcode: zoomConfig.passcode || '',
    gmeetUrl: zoomConfig.gmeetUrl || 'https://meet.google.com/kqe-reho-vbd',
  });

  const [supabaseForm, setSupabaseForm] = useState(() => {
    const saved = getSupabaseConfig();
    return {
      url: saved.url || '',
      anonKey: saved.anonKey || '',
    };
  });

  const [testState, setTestState] = useState(null); // { loading, success, message }
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCopiedSql, setIsCopiedSql] = useState(false);

  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinMessage, setPinMessage] = useState(null);

  // Email Notification configuration state
  const [emailForm, setEmailForm] = useState(() => getEmailConfig());
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [showBrevoKey, setShowBrevoKey] = useState(false);

  if (!isOpen) return null;

  const handleSaveEmailConfig = (e) => {
    e.preventDefault();
    if (!isAdmin) {
      onShowToast({
        type: 'warning',
        title: 'Akses Ditolak',
        message: 'Silakan login sebagai Mode Pengelola untuk menyimpan konfigurasi email.',
      });
      return;
    }
    saveEmailConfig(emailForm);
    onShowToast({
      type: 'success',
      title: 'Konfigurasi Email Disimpan',
      message: 'Pengaturan notifikasi email otomatis (Brevo & EmailJS) berhasil diperbarui.',
    });
  };

  const handleSendTest = async () => {
    if (!testEmailAddress.trim()) {
      onShowToast({
        type: 'warning',
        title: 'Email Tujuan Kosong',
        message: 'Masukkan alamat email tujuan uji coba terlebih dahulu.',
      });
      return;
    }
    setIsSendingTest(true);
    try {
      const res = await sendTestEmail(testEmailAddress.trim());
      const providerLabel = res?.provider === 'brevo'
        ? 'Brevo (Utama - 300/hari)'
        : res?.fallbackUsed
          ? 'EmailJS (Cadangan Failover)'
          : 'EmailJS';

      onShowToast({
        type: 'success',
        title: 'Email Uji Coba Terkirim!',
        message: `Email notifikasi uji coba berhasil dikirim ke ${testEmailAddress} via ${providerLabel}. Silakan cek kotak masuk atau folder spam Anda.`,
      });
    } catch (err) {
      onShowToast({
        type: 'error',
        title: 'Gagal Mengirim Email',
        message: err?.text || err?.message || 'Periksa kembali API Key Brevo atau kredensial EmailJS Anda.',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleSaveZoomConfig = (e) => {
    e.preventDefault();
    if (!isAdmin) {
      onShowToast({
        type: 'warning',
        title: 'Akses Ditolak',
        message: 'Silakan login sebagai Mode Pengelola untuk mengubah pengaturan ini.',
      });
      return;
    }
    onUpdateZoomConfig(configForm);
    onShowToast({
      type: 'success',
      title: 'Kredensial Zoom Diperbarui',
      message: 'Perubahan link dan ID Zoom berhasil disimpan.',
    });
    onClose();
  };

  const handleTestDatabase = async () => {
    setTestState({ loading: true });
    const res = await testSupabaseConnection(supabaseForm.url, supabaseForm.anonKey);
    setTestState({
      loading: false,
      success: res.success,
      message: res.message,
    });
  };

  const handleSaveDatabaseConfig = (e) => {
    e.preventDefault();
    if (!isAdmin) {
      onShowToast({
        type: 'warning',
        title: 'Akses Ditolak',
        message: 'Silakan login sebagai Mode Pengelola untuk menyimpan konfigurasi database.',
      });
      return;
    }

    const saved = saveSupabaseConfig(supabaseForm.url, supabaseForm.anonKey);
    if (saved) {
      onShowToast({
        type: 'success',
        title: 'Konfigurasi Tersimpan',
        message: 'Koneksi Supabase berhasil disimpan. Halaman akan menyinkronkan data secara otomatis.',
      });
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } else {
      onShowToast({
        type: 'info',
        title: 'Konfigurasi Direset',
        message: 'Kredensial database cloud dihapus, kembali ke mode penyimpanan lokal.',
      });
    }
  };

  const handleSyncToCloud = async () => {
    if (!onPushLocalToCloud) return;
    setIsSyncing(true);
    const res = await onPushLocalToCloud();
    setIsSyncing(false);
    if (res.success) {
      onShowToast({
        type: 'success',
        title: 'Sinkronisasi Berhasil',
        message: res.message,
      });
    } else {
      onShowToast({
        type: 'error',
        title: 'Sinkronisasi Gagal',
        message: res.message,
      });
    }
  };

  const handleCopySql = async () => {
    const success = await copyToClipboard(SQL_SCHEMA);
    if (success) {
      setIsCopiedSql(true);
      onShowToast({
        type: 'success',
        title: 'Skema SQL Tersalin!',
        message: 'Silakan tempel di SQL Editor dashboard Supabase Anda.',
      });
      setTimeout(() => setIsCopiedSql(false), 2500);
    }
  };

  const handleSavePin = (e) => {
    e.preventDefault();
    if (!isAdmin) {
      onShowToast({
        type: 'warning',
        title: 'Akses Ditolak',
        message: 'Silakan login sebagai Mode Pengelola untuk mengubah PIN.',
      });
      return;
    }
    if (newPin.length < 4) {
      setPinMessage({ type: 'error', text: 'PIN minimal 4 digit karakter!' });
      return;
    }
    if (newPin !== confirmPin) {
      setPinMessage({ type: 'error', text: 'Konfirmasi PIN tidak cocok!' });
      return;
    }

    onUpdatePin(newPin);
    setPinMessage({ type: 'success', text: 'PIN berhasil diubah!' });
    onShowToast({
      type: 'success',
      title: 'PIN Diperbarui',
      message: 'PIN Pengelola berhasil diubah.',
    });
    setNewPin('');
    setConfirmPin('');
  };

  const handleExport = () => {
    const dataStr = exportData();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zoom-schedule-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    onShowToast({
      type: 'success',
      title: 'Data Diekspor',
      message: 'Cadangan data jadwal (.json) berhasil diunduh.',
    });
  };

  const handleImportFile = (e) => {
    if (!isAdmin) {
      onShowToast({
        type: 'warning',
        title: 'Akses Ditolak',
        message: 'Login Mode Pengelola diperlukan untuk impor data.',
      });
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const res = importData(event.target.result);
      if (res.success) {
        onShowToast({
          type: 'success',
          title: 'Impor Berhasil',
          message: 'Seluruh data jadwal & konfigurasi berhasil dipulihkan.',
        });
        onClose();
      } else {
        onShowToast({
          type: 'error',
          title: 'Gagal Impor',
          message: res.message,
        });
      }
    };
    reader.readAsText(file);
  };

  const handleReset = async () => {
    if (!isAdmin) {
      onShowToast({
        type: 'warning',
        title: 'Akses Ditolak',
        message: 'Login Mode Pengelola diperlukan untuk reset data.',
      });
      return;
    }
    const confirmed = await showConfirmDialog({
      title: 'Reset Seluruh Jadwal?',
      text: 'Semua perubahan reservasi dan pengaturan akan dihapus dan dikembalikan ke data awal perkuliahan.',
      icon: 'warning',
      confirmButtonText: 'Ya, Reset Data',
      cancelButtonText: 'Batal',
      isDanger: true,
    });
    if (confirmed) {
      onResetDefault();
      onShowToast({
        type: 'info',
        title: 'Data Direset',
        message: 'Jadwal telah dikembalikan ke template awal perkuliahan.',
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden transform transition-all animate-modal-pop">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/40">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-zinc-500" />
            <h3 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 tracking-tight">
              Pengaturan Sistem & Database
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-200/80 dark:border-zinc-800/80 text-xs font-medium bg-zinc-50/50 dark:bg-zinc-900/20 overflow-x-auto">
          <button
            onClick={() => setActiveTab('zoom')}
            className={`flex-1 py-2.5 px-3 text-center transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'zoom'
                ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100 bg-white dark:bg-zinc-950 font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            Ruang Virtual (Zoom & Meet)
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={`flex-1 py-2.5 px-3 text-center transition-colors border-b-2 whitespace-nowrap flex items-center justify-center gap-1.5 ${
              activeTab === 'database'
                ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100 bg-white dark:bg-zinc-950 font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Database Cloud</span>
            <span className={`w-1.5 h-1.5 rounded-full ${cloudStatus === 'connected' ? 'bg-emerald-500' : 'bg-zinc-400'}`}></span>
          </button>
          <button
            onClick={() => setActiveTab('pin')}
            className={`flex-1 py-2.5 px-3 text-center transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'pin'
                ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100 bg-white dark:bg-zinc-950 font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            PIN Pengelola
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={`flex-1 py-2.5 px-3 text-center transition-colors border-b-2 whitespace-nowrap flex items-center justify-center gap-1.5 ${
              activeTab === 'email'
                ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100 bg-white dark:bg-zinc-950 font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email Notifikasi</span>
            <span className={`w-1.5 h-1.5 rounded-full ${emailForm.enabled && (emailForm.brevoApiKey || emailForm.serviceId) ? 'bg-emerald-500' : 'bg-zinc-400'}`}></span>
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`flex-1 py-2.5 px-3 text-center transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'data'
                ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100 bg-white dark:bg-zinc-950 font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            Cadangan
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 max-h-[75vh] overflow-y-auto">
          {/* TAB 1: ZOOM CONFIG */}
          {activeTab === 'zoom' && (
            <form onSubmit={handleSaveZoomConfig} className="space-y-3.5">
              {!isAdmin && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Mode Mahasiswa (Hanya baca). Masuk Pengelola untuk mengedit.</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Nama Ruang / Akun
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={configForm.name}
                  onChange={(e) => setConfigForm({ ...configForm, name: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 text-zinc-900 dark:text-zinc-100 disabled:opacity-60 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  URL Undangan Zoom
                </label>
                <input
                  type="url"
                  disabled={!isAdmin}
                  required
                  value={configForm.joinUrl}
                  onChange={(e) => setConfigForm({ ...configForm, joinUrl: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 text-zinc-900 dark:text-zinc-100 disabled:opacity-60 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 focus:outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Meeting ID
                  </label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    required
                    value={configForm.meetingId}
                    onChange={(e) => setConfigForm({ ...configForm, meetingId: e.target.value })}
                    className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 text-zinc-900 dark:text-zinc-100 disabled:opacity-60 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Passcode
                  </label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    required
                    value={configForm.passcode}
                    onChange={(e) => setConfigForm({ ...configForm, passcode: e.target.value })}
                    className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 text-zinc-900 dark:text-zinc-100 disabled:opacity-60 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-200/80 dark:border-zinc-800/80">
                <div className="flex items-center gap-2 mb-1.5">
                  <Video className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    Tautan Google Meet
                  </label>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                    Google Meet
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-2 leading-relaxed">
                  Tautan ini otomatis diberikan kepada mahasiswa ketika ruang Zoom pada jam tersebut sudah terisi oleh perkuliahan lain.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    disabled={!isAdmin}
                    required
                    placeholder="https://meet.google.com/..."
                    value={configForm.gmeetUrl}
                    onChange={(e) => setConfigForm({ ...configForm, gmeetUrl: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 text-zinc-900 dark:text-zinc-100 disabled:opacity-60 focus:ring-1 focus:ring-teal-500 focus:outline-none transition-colors font-mono"
                  />
                  {configForm.gmeetUrl && (
                    <a
                      href={configForm.gmeetUrl.startsWith('http') ? configForm.gmeetUrl : `https://${configForm.gmeetUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors flex-shrink-0"
                      title="Buka link Meet"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>

              {isAdmin && (
                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-medium bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-white shadow-2xs transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Simpan Pengaturan Virtual Room</span>
                  </button>
                </div>
              )}
            </form>
          )}

          {/* TAB 2: SUPABASE CLOUD DATABASE */}
          {activeTab === 'database' && (
            <div className="space-y-4">
              {/* Status Header */}
              <div className="p-3.5 rounded-xl border flex items-center justify-between gap-3 bg-zinc-50/80 dark:bg-zinc-900/50 border-zinc-200/80 dark:border-zinc-800/80">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    cloudStatus === 'connected' ? 'bg-emerald-500' :
                    cloudStatus === 'connecting' ? 'bg-amber-500 animate-ping' :
                    cloudStatus === 'error' ? 'bg-rose-500' : 'bg-zinc-400'
                  }`} />
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      {cloudStatus === 'connected' ? 'Database Cloud Terhubung (Aktif)' :
                       cloudStatus === 'connecting' ? 'Menghubungkan ke Cloud...' :
                       cloudStatus === 'error' ? 'Koneksi Cloud Terputus / Error' : 'Database Cloud Belum Terhubung'}
                    </h4>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {cloudStatus === 'connected'
                        ? 'Setiap jadwal tersinkronisasi otomatis secara realtime ke seluruh perangkat mahasiswa.'
                        : 'Jadwal saat ini tersimpan di memori browser lokal. Hubungkan Supabase untuk akses online.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Input */}
              <form onSubmit={handleSaveDatabaseConfig} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Supabase Project URL
                  </label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    placeholder="https://xyzcompany.supabase.co"
                    value={supabaseForm.url}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.includes('SUPABASE_ANON_KEY') || val.includes('PUBLISHABLE_KEY')) {
                        const parsedUrl = cleanSupabaseUrl(val);
                        const parsedKey = cleanSupabaseKey(val);
                        setSupabaseForm({
                          url: parsedUrl || cleanSupabaseUrl(val) || val,
                          anonKey: parsedKey || supabaseForm.anonKey,
                        });
                        return;
                      }
                      setSupabaseForm({ ...supabaseForm, url: cleanSupabaseUrl(val) || val });
                    }}
                    className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 text-zinc-900 dark:text-zinc-100 disabled:opacity-60 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 focus:outline-none placeholder-zinc-400 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Supabase Anon Public API Key / Publishable Key
                  </label>
                  <textarea
                    rows={2}
                    disabled={!isAdmin}
                    placeholder="sb_publishable_... atau eyJhbGciOi..."
                    value={supabaseForm.anonKey}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.includes('SUPABASE_URL')) {
                        const parsedUrl = cleanSupabaseUrl(val);
                        const parsedKey = cleanSupabaseKey(val);
                        setSupabaseForm({
                          url: parsedUrl || supabaseForm.url,
                          anonKey: parsedKey || cleanSupabaseKey(val) || val,
                        });
                        return;
                      }
                      setSupabaseForm({ ...supabaseForm, anonKey: cleanSupabaseKey(val) || val });
                    }}
                    className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 text-zinc-900 dark:text-zinc-100 disabled:opacity-60 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 focus:outline-none placeholder-zinc-400 resize-none transition-colors"
                  />
                </div>

                {/* Connection Test Status Banner */}
                {testState && (
                  <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                    testState.success
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-300'
                  }`}>
                    {testState.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                    )}
                    <span className="leading-relaxed">{testState.message}</span>
                  </div>
                )}

                {/* Action Buttons */}
                {isAdmin && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={!supabaseForm.url || !supabaseForm.anonKey || testState?.loading}
                      onClick={handleTestDatabase}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-medium border border-zinc-200 dark:border-zinc-800 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${testState?.loading ? 'animate-spin' : ''}`} />
                      <span>{testState?.loading ? 'Menguji...' : 'Uji Koneksi'}</span>
                    </button>

                    <button
                      type="submit"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-medium bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-white shadow-2xs transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Simpan & Hubungkan</span>
                    </button>
                  </div>
                )}
              </form>

              {/* Sync Current Local Data Button */}
              {cloudStatus === 'connected' && isAdmin && (
                <div className="p-3.5 rounded-xl bg-zinc-100/60 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block">
                        Unggah Jadwal Lokal ke Cloud
                      </span>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Kirim data jadwal di laptop ini ke Supabase agar langsung sinkron ke seluruh mahasiswa.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={handleSyncToCloud}
                      className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shadow-2xs transition-colors flex-shrink-0"
                    >
                      <Upload className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce' : ''}`} />
                      <span>{isSyncing ? 'Mengunggah...' : 'Upload Jadwal'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Quick Guide & Copy SQL Schema */}
              <div className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    Panduan Setup Database Supabase:
                  </span>
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors"
                  >
                    {isCopiedSql ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{isCopiedSql ? 'SQL Tersalin' : 'Salin Kode SQL'}</span>
                  </button>
                </div>
                <ol className="text-[11px] text-zinc-600 dark:text-zinc-400 space-y-1 list-decimal list-inside leading-relaxed">
                  <li>Buka <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-zinc-900 dark:text-zinc-200 font-medium underline">supabase.com</a> dan buat Project baru (Gratis).</li>
                  <li>Buka menu <strong>SQL Editor</strong> &bull; klik <strong>New query</strong> &bull; tempel kode SQL dari tombol di atas &bull; klik <strong>Run</strong>.</li>
                  <li>Masuk ke <strong>Project Settings &rarr; Data API</strong>, salin <strong>URL</strong> dan <strong>anon key</strong> ke form di atas.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 3: PIN PENGELOLA */}
          {activeTab === 'pin' && (
            <form onSubmit={handleSavePin} className="space-y-3.5">
              {!isAdmin && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Mode Mahasiswa (Hanya baca). Masuk Pengelola untuk mengganti PIN.</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  PIN Baru (Minimal 4 karakter)
                </label>
                <input
                  type="password"
                  disabled={!isAdmin}
                  required
                  placeholder="Ketik PIN baru..."
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 text-zinc-900 dark:text-zinc-100 disabled:opacity-60 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Konfirmasi PIN Baru
                </label>
                <input
                  type="password"
                  disabled={!isAdmin}
                  required
                  placeholder="Ulangi PIN baru..."
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 text-zinc-900 dark:text-zinc-100 disabled:opacity-60 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 focus:outline-none transition-colors"
                />
              </div>

              {pinMessage && (
                <div
                  className={`p-3 rounded-xl text-xs ${
                    pinMessage.type === 'error'
                      ? 'bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300'
                      : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                  }`}
                >
                  {pinMessage.text}
                </div>
              )}

              {isAdmin && (
                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-medium bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-white shadow-2xs transition-colors"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Perbarui PIN Pengelola</span>
                  </button>
                </div>
              )}
            </form>
          )}

          {/* TAB 4: CADANGAN & IMPOR/EKSPOR */}
          {activeTab === 'data' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-2.5">
                <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Ekspor & Impor Berkas Jadwal (.json)
                </h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal">
                  Unduh cadangan data seluruh reservasi jadwal perkuliahan dan link Zoom ke dalam file, atau pulihkan dari cadangan sebelumnya.
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleExport}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-medium bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Ekspor Data (JSON)</span>
                  </button>

                  <label className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-medium border transition-colors ${
                    isAdmin
                      ? 'bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700 cursor-pointer'
                      : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-400 border-zinc-200 dark:border-zinc-800 cursor-not-allowed opacity-60'
                  }`}>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Impor Data (JSON)</span>
                    <input
                      type="file"
                      accept=".json"
                      disabled={!isAdmin}
                      onChange={handleImportFile}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {isAdmin && (
                <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 dark:bg-rose-950/20 space-y-2.5">
                  <h4 className="text-xs font-semibold text-rose-800 dark:text-rose-300">
                    Reset Jadwal ke Awal
                  </h4>
                  <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 leading-normal">
                    Menghapus seluruh perubahan dan mengembalikan jadwal perkuliahan ke data default.
                  </p>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white shadow-2xs transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Seluruh Jadwal</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: EMAIL NOTIFICATION CONFIG (BREVO + EMAILJS DUAL PROVIDER) */}
          {activeTab === 'email' && (
            <div className="space-y-4">
              {/* Master Toggle */}
              <div className="flex items-start justify-between gap-3 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40">
                <div className="flex items-start gap-2.5">
                  <Mail className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 block">
                      Notifikasi Email Otomatis Mahasiswa
                    </span>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal mt-0.5">
                      Kirim email otomatis saat mahasiswa <strong>Mengajukan</strong> jadwal, saat <strong>Disetujui</strong> (memuat akses Link Zoom), atau saat <strong>Ditolak</strong> (memuat alasan).
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={emailForm.enabled}
                    onChange={(e) => setEmailForm({ ...emailForm, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Provider Strategy Selection */}
              <div>
                <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
                  Metode Pengiriman Email (Provider)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Option 1: Smart Failover (Brevo + EmailJS) */}
                  <button
                    type="button"
                    onClick={() => setEmailForm({ ...emailForm, provider: 'smart' })}
                    className={`p-3 rounded-xl border text-left transition-all relative ${
                      emailForm.provider === 'smart' || !emailForm.provider
                        ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/20 ring-1 ring-emerald-500/30'
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded">
                        Rekomendasi
                      </span>
                      <Zap className={`w-3.5 h-3.5 ${emailForm.provider === 'smart' ? 'text-emerald-600' : 'text-zinc-400'}`} />
                    </div>
                    <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                      Otomatis (Smart Failover)
                    </div>
                    <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 mt-1 leading-snug">
                      Brevo utama (300/hari). Jika limit atau ada gangguan, otomatis dialihkan ke EmailJS.
                    </p>
                  </button>

                  {/* Option 2: Brevo Only */}
                  <button
                    type="button"
                    onClick={() => setEmailForm({ ...emailForm, provider: 'brevo' })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      emailForm.provider === 'brevo'
                        ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/20 ring-1 ring-indigo-500/30'
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/50 px-1.5 py-0.5 rounded">
                        300 / Hari
                      </span>
                      <Sparkles className={`w-3.5 h-3.5 ${emailForm.provider === 'brevo' ? 'text-indigo-600' : 'text-zinc-400'}`} />
                    </div>
                    <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                      Hanya Brevo
                    </div>
                    <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 mt-1 leading-snug">
                      REST API langsung (9.000 email/bln). Desain HTML resmi otomatis tanpa setting manual.
                    </p>
                  </button>

                  {/* Option 3: EmailJS Only */}
                  <button
                    type="button"
                    onClick={() => setEmailForm({ ...emailForm, provider: 'emailjs' })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      emailForm.provider === 'emailjs'
                        ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/20 ring-1 ring-amber-500/30'
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded">
                        200 / Bulan
                      </span>
                      <Mail className={`w-3.5 h-3.5 ${emailForm.provider === 'emailjs' ? 'text-amber-600' : 'text-zinc-400'}`} />
                    </div>
                    <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                      Hanya EmailJS
                    </div>
                    <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 mt-1 leading-snug">
                      Kirim melalui EmailJS Browser SDK dengan Template ID yang dibuat di dashboard EmailJS.
                    </p>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSaveEmailConfig} className="space-y-4">
                {/* 0. SECTION OPERATOR ALERT NOTIFICATION (HP OPERATOR) */}
                <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-amber-500 text-white flex items-center justify-center text-[10px]">
                        <Bell className="w-3 h-3" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block">
                          Notifikasi Instan ke HP Operator Prodi
                        </span>
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          Kirim peringatan email langsung ke HP pengelola saat ada mahasiswa mengajukan jadwal
                        </span>
                      </div>
                    </div>
                    <span
                      className={`text-[10.5px] font-medium px-2 py-0.5 rounded-full ${
                        emailForm.operatorEmail
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}
                    >
                      {emailForm.operatorEmail ? 'Aktif' : 'Belum Diisi'}
                    </span>
                  </div>

                  <div className="pt-1">
                    <label className="block text-[11.5px] font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Email Penerima Operator (HP)
                    </label>
                    <input
                      type="email"
                      placeholder="contoh: operator@gmail.com"
                      value={emailForm.operatorEmail || ''}
                      onChange={(e) => setEmailForm({ ...emailForm, operatorEmail: e.target.value.trim() })}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono focus:ring-1 focus:ring-amber-400 focus:outline-none"
                    />
                    <span className="text-[10.5px] text-zinc-500 dark:text-zinc-400 mt-1.5 block leading-normal">
                      Gunakan email yang terpasang di aplikasi Gmail HP Anda. Boleh menggunakan email yang sama dengan pengirim Brevo (<strong>s1kebidanan@fikes.unbrah.ac.id</strong>) atau email pribadi operator.
                    </span>
                  </div>
                </div>

                {/* 1. SECTION BREVO */}
                {(emailForm.provider === 'smart' || emailForm.provider === 'brevo' || !emailForm.provider) && (
                  <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/20 dark:bg-indigo-950/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-md bg-indigo-500 text-white flex items-center justify-center text-[10px] font-bold">
                          B
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block">
                            Pengaturan Brevo (Sendinblue)
                          </span>
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                            Kuota gratis 300 email/hari &bull; Template HTML otomatis dari sistem
                          </span>
                        </div>
                      </div>
                      <span
                        className={`text-[10.5px] font-medium px-2 py-0.5 rounded-full ${
                          emailForm.brevoApiKey && emailForm.brevoSenderEmail
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}
                      >
                        {emailForm.brevoApiKey && emailForm.brevoSenderEmail ? 'Siap Digunakan' : 'Belum Lengkap'}
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11.5px] font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Brevo API Key (v3)
                      </label>
                      <div className="relative">
                        <input
                          type={showBrevoKey ? 'text' : 'password'}
                          placeholder="xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          value={emailForm.brevoApiKey || ''}
                          onChange={(e) => setEmailForm({ ...emailForm, brevoApiKey: e.target.value.trim() })}
                          className="w-full text-xs pr-9 pl-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono focus:ring-1 focus:ring-indigo-400 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowBrevoKey(!showBrevoKey)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                        >
                          {showBrevoKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <span className="text-[10.5px] text-zinc-500 dark:text-zinc-400 mt-1 block">
                        Dapatkan di menu <strong>SMTP &amp; API &rarr; API Keys</strong> pada dashboard Brevo.
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11.5px] font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                          Email Pengirim (Sender Email)
                        </label>
                        <input
                          type="email"
                          placeholder="email.anda@gmail.com"
                          value={emailForm.brevoSenderEmail || ''}
                          onChange={(e) => setEmailForm({ ...emailForm, brevoSenderEmail: e.target.value.trim() })}
                          className="w-full text-xs px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono focus:ring-1 focus:ring-indigo-400 focus:outline-none"
                        />
                        <span className="text-[10.5px] text-zinc-500 dark:text-zinc-400 mt-1 block">
                          Wajib email yang telah terverifikasi sebagai <em>Sender</em> di akun Brevo.
                        </span>
                      </div>

                      <div>
                        <label className="block text-[11.5px] font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                          Nama Pengirim (Sender Name)
                        </label>
                        <input
                          type="text"
                          placeholder="E-Jadwal S1 Kebidanan UNBRAH"
                          value={emailForm.brevoSenderName || ''}
                          onChange={(e) => setEmailForm({ ...emailForm, brevoSenderName: e.target.value })}
                          className="w-full text-xs px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-1 focus:ring-indigo-400 focus:outline-none"
                        />
                        <span className="text-[10.5px] text-zinc-500 dark:text-zinc-400 mt-1 block">
                          Nama instansi/prodi yang tampil pada kotak masuk penerima.
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. SECTION EMAILJS */}
                {(emailForm.provider === 'smart' || emailForm.provider === 'emailjs' || !emailForm.provider) && (
                  <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-md bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold">
                          E
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block">
                            Pengaturan EmailJS
                          </span>
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                            {emailForm.provider === 'smart'
                              ? 'Sebagai cadangan otomatis (failover) saat Brevo limit/gangguan'
                              : 'Layanan utama (200 email/bulan gratis)'}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`text-[10.5px] font-medium px-2 py-0.5 rounded-full ${
                          emailForm.serviceId && emailForm.publicKey
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}
                      >
                        {emailForm.serviceId && emailForm.publicKey ? 'Siap Digunakan' : 'Belum Lengkap'}
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11.5px] font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Service ID (EmailJS)
                      </label>
                      <input
                        type="text"
                        placeholder="contoh: service_kebidanan"
                        value={emailForm.serviceId || ''}
                        onChange={(e) => setEmailForm({ ...emailForm, serviceId: e.target.value.trim() })}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono focus:ring-1 focus:ring-amber-400 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11.5px] font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                          Template ID Disetujui
                        </label>
                        <input
                          type="text"
                          placeholder="contoh: template_approved"
                          value={emailForm.templateApprovedId || ''}
                          onChange={(e) => setEmailForm({ ...emailForm, templateApprovedId: e.target.value.trim() })}
                          className="w-full text-xs px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono focus:ring-1 focus:ring-amber-400 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11.5px] font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                          Template ID Ditolak (Opsional)
                        </label>
                        <input
                          type="text"
                          placeholder="contoh: template_rejected"
                          value={emailForm.templateRejectedId || ''}
                          onChange={(e) => setEmailForm({ ...emailForm, templateRejectedId: e.target.value.trim() })}
                          className="w-full text-xs px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono focus:ring-1 focus:ring-amber-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11.5px] font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Public Key (User ID EmailJS)
                      </label>
                      <input
                        type="text"
                        placeholder="contoh: user_xxxxxxxx atau public_key"
                        value={emailForm.publicKey || ''}
                        onChange={(e) => setEmailForm({ ...emailForm, publicKey: e.target.value.trim() })}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono focus:ring-1 focus:ring-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-1">
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shadow-2xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Simpan Pengaturan Email</span>
                  </button>
                </div>
              </form>

              {/* Uji Coba Pengiriman Email */}
              <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-zinc-500" />
                    Uji Coba Pengiriman Email
                  </span>
                  <span className="text-[10px] text-zinc-500 font-medium">
                    Mode Aktif: {emailForm.provider === 'smart' ? 'Smart Failover' : emailForm.provider === 'brevo' ? 'Brevo' : 'EmailJS'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Tes apakah kredensial pengiriman email sudah terhubung dengan benar ke kotak masuk Anda.
                </p>
                <div className="flex gap-2 pt-0.5">
                  <input
                    type="email"
                    placeholder="Ketik email penerima uji coba..."
                    value={testEmailAddress}
                    onChange={(e) => setTestEmailAddress(e.target.value)}
                    className="flex-1 text-xs px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                  />
                  <button
                    type="button"
                    disabled={isSendingTest}
                    onClick={handleSendTest}
                    className="px-4 py-2 rounded-xl text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white transition-colors disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
                  >
                    <Send className={`w-3.5 h-3.5 ${isSendingTest ? 'animate-spin' : ''}`} />
                    <span>{isSendingTest ? 'Mengirim...' : 'Kirim Test'}</span>
                  </button>
                </div>
              </div>

              {/* Panduan Singkat Setup Brevo & EmailJS */}
              <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 space-y-2.5">
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  Panduan Cepat Setup Provider:
                </span>

                <div className="space-y-2 text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                    <strong className="text-indigo-950 dark:text-indigo-200 block mb-1">
                      1. Brevo (Sangat Mudah - 300 email/hari gratis):
                    </strong>
                    <ol className="list-decimal pl-4 space-y-0.5">
                      <li>Buka <a href="https://www.brevo.com" target="_blank" rel="noreferrer" className="underline font-medium text-indigo-700 dark:text-indigo-300">brevo.com</a> dan buat akun gratis.</li>
                      <li>Di menu <strong>Profil &rarr; Senders, Domains &amp; Dedicated IPs &rarr; Senders</strong>, pastikan email Anda berstatus <em>Verified</em>. Masukkan email tersebut ke kolom <em>Sender Email</em> di atas.</li>
                      <li>Buka menu <strong>SMTP &amp; API &rarr; API Keys</strong>, klik <strong>Generate a new API key</strong>, beri nama, lalu salin kodenya ke form <em>Brevo API Key</em>.</li>
                      <li><em>Selesai!</em> Sistem otomatis merender template email resmi berlogo kampus tanpa perlu setting template di Brevo.</li>
                    </ol>
                  </div>

                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <strong className="text-amber-950 dark:text-amber-200 block mb-1">
                      2. EmailJS (Sebagai Cadangan Failover - 200 email/bulan gratis):
                    </strong>
                    <ol className="list-decimal pl-4 space-y-0.5">
                      <li>Buka <a href="https://www.emailjs.com" target="_blank" rel="noreferrer" className="underline font-medium text-amber-800 dark:text-amber-300">emailjs.com</a> dan hubungkan akun Gmail di menu <strong>Email Services</strong> (dapat <em>Service ID</em>).</li>
                      <li>Di menu <strong>Email Templates</strong> buat template baru dengan variabel <code className="bg-amber-100 dark:bg-amber-950 px-1 rounded font-mono">{`{{to_name}}`}</code>, <code className="bg-amber-100 dark:bg-amber-950 px-1 rounded font-mono">{`{{course_name}}`}</code>, <code className="bg-amber-100 dark:bg-amber-950 px-1 rounded font-mono">{`{{zoom_meeting_id}}`}</code>, <code className="bg-amber-100 dark:bg-amber-950 px-1 rounded font-mono">{`{{zoom_passcode}}`}</code>.</li>
                      <li>Salin <em>Public Key</em> dari menu <strong>Account</strong> ke form di atas.</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
