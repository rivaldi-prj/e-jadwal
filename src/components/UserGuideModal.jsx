import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Calendar,
  Send,
  CheckCircle2,
  Clock,
  Lightbulb,
  ArrowRight,
  Video,
  Info,
  Layers,
  Sparkles,
  Laptop,
} from 'lucide-react';

export function UserGuideModal({
  isOpen,
  onClose,
  onOpenRequestModal,
}) {
  const [activeTab, setActiveTab] = useState('platforms'); // 'platforms' | 'flow'
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem('hasSeenStudentGuide', 'true');
      } catch (e) {
        console.warn('LocalStorage error:', e);
      }
    }
    onClose();
  };

  const handleStartRequest = () => {
    handleClose();
    if (onOpenRequestModal) {
      onOpenRequestModal();
    }
  };

  const steps = [
    {
      step: '1',
      title: 'Cari & Pilih Sesi Perkuliahan',
      icon: <Calendar className="w-4 h-4 text-sky-600 dark:text-sky-400" />,
      color: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-900/50',
      badge: 'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300',
      description:
        'Periksa kalender jadwal pada hari dan jam yang diinginkan. Anda dapat mengklik kotak kosong bertanda "+ Ajukan Jadwal" atau tombol "+ Ajukan Jadwal" di menu atas.',
    },
    {
      step: '2',
      title: 'Pilih Jam & Platform Otomatis',
      icon: <Video className="w-4 h-4 text-teal-600 dark:text-teal-400" />,
      color: 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-900/50',
      badge: 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300',
      description:
        'Saat memilih Jam Kuliah, sistem otomatis menentukan ruang: Zoom jika masih kosong, atau dialihkan ke Google Meet jika Zoom telah terisi oleh angkatan lain.',
    },
    {
      step: '3',
      title: 'Lengkapi Data & Kirim Pengajuan',
      icon: <Send className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
      color: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50',
      badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300',
      description:
        'Pilih Angkatan, Mata Kuliah, Dosen Pengampu, Nama PJ Mahasiswa, dan alamat email aktif. Tekan "Kirim Pengajuan Jadwal" untuk mengirim ke antrean Prodi.',
    },
    {
      step: '4',
      title: 'Verifikasi & Tautan Perkuliahan',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      color: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50',
      badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300',
      description:
        'Operator Prodi akan meninjau pengajuan Anda. Setelah disetujui, jadwal tampil resmi di kalender dan notifikasi email berisi tautan perkuliahan otomatis terkirim.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden animate-modal-pop">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-900/60 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-900/50">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 tracking-tight">
                Panduan Penggunaan Sistem E-Jadwal
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Panduan Platform Virtual &bull; Prodi S1 Kebidanan FIKES UNBRAH
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 pt-3 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/40 dark:bg-zinc-900/30 flex gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('platforms')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'platforms'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Panduan Platform: Zoom & Google Meet</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('flow')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'flow'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Alur Pengajuan Jadwal</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'platforms' ? (
            <div className="space-y-4 animate-fade-in">
              {/* Introduction Banner */}
              <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50">
                <div className="flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed">
                    <strong className="block text-slate-900 dark:text-zinc-100 font-semibold mb-0.5">
                      Mengapa Ada Dua Platform (Zoom & Google Meet)?
                    </strong>
                    Program Studi S1 Kebidanan menggunakan <strong>1 Akun Zoom Resmi Bersama</strong>. Agar dua angkatan berbeda dapat melangsungkan perkuliahan daring pada jam yang sama tanpa saling mengganggu, sistem secara otomatis menyediakan <strong>Google Meet</strong> sebagai ruang alternatif resmi.
                  </div>
                </div>
              </div>

              {/* Two Platform Comparison Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Platform 1: Zoom */}
                <div className="p-4 rounded-xl border-2 border-sky-300 dark:border-sky-800 bg-sky-50/60 dark:bg-sky-950/25 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#17324D] text-white">
                        Ruang Utama &bull; Zoom
                      </span>
                      <span className="text-[10px] font-semibold text-sky-700 dark:text-sky-300 uppercase tracking-wider">
                        Prioritas 1
                      </span>
                    </div>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-zinc-100 mb-1.5">
                      Akun Zoom Resmi Kebidanan
                    </h4>
                    <p className="text-[11.5px] text-slate-600 dark:text-zinc-300 leading-relaxed mb-3">
                      Digunakan otomatis sebagai pilihan utama setiap kali slot waktu perkuliahan masih kosong/tersedia.
                    </p>
                    <div className="space-y-1.5 text-[11px] text-slate-700 dark:text-zinc-300 border-t border-sky-200 dark:border-sky-900/60 pt-2.5">
                      <div className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 flex-shrink-0 mt-0.5" />
                        <span><strong>Tanda di Jadwal:</strong> Kotak berwarna dengan badge biru bertuliskan <strong>Zoom</strong>.</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 flex-shrink-0 mt-0.5" />
                        <span><strong>Akses Masuk:</strong> Menggunakan Meeting ID dan Passcode resmi yang dibagikan Dosen / PJ Mata Kuliah.</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Platform 2: Google Meet */}
                <div className="p-4 rounded-xl border-2 border-teal-300 dark:border-teal-800 bg-teal-50/60 dark:bg-teal-950/25 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-teal-600 text-white">
                        <Video className="w-3 h-3" />
                        Ruang Alternatif &bull; Google Meet
                      </span>
                      <span className="text-[10px] font-semibold text-teal-700 dark:text-teal-300 uppercase tracking-wider">
                        Otomatis
                      </span>
                    </div>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-zinc-100 mb-1.5">
                      Ruang Alternatif Google Meet
                    </h4>
                    <p className="text-[11.5px] text-slate-600 dark:text-zinc-300 leading-relaxed mb-3">
                      Aktif secara otomatis ketika ruang Zoom pada jam tersebut telah terisi oleh angkatan lain. Perkuliahan tetap dapat berjalan lancar!
                    </p>
                    <div className="space-y-1.5 text-[11px] text-slate-700 dark:text-zinc-300 border-t border-teal-200 dark:border-teal-900/60 pt-2.5">
                      <div className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" />
                        <span><strong>Tanda di Jadwal:</strong> Kotak berwarna dengan badge hijau/teal bertuliskan <strong>Google Meet</strong>.</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" />
                        <span><strong>Akses Masuk:</strong> Cukup klik tautan link Google Meet langsung dari browser/HP tanpa memerlukan Passcode.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* How Students Know Which Platform */}
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
                <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Laptop className="w-3.5 h-3.5 text-blue-500" />
                  Bagaimana Mahasiswa Mengetahui Kuliahnya Memakai Zoom atau Google Meet?
                </span>
                <ol className="list-decimal pl-4 space-y-1 text-[11.5px] text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  <li>
                    <strong>Lihat Kalender Jadwal:</strong> Di setiap kotak mata kuliah, terdapat label tegas bertuliskan <strong>Zoom</strong> (biru) atau <strong>Google Meet</strong> (hijau/teal).
                  </li>
                  <li>
                    <strong>Klik Jadwal Kuliah:</strong> Klik pada kartu mata kuliah Anda untuk membuka detail lengkap ruangan perkuliahan.
                  </li>
                  <li>
                    <strong>Cek Email Masuk:</strong> Saat pengajuan disetujui Admin, pemohon (PJ Mata Kuliah) akan menerima email otomatis yang memuat rincian platform dan tautan resmi.
                  </li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              {/* Quick Flow Intro */}
              <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/50">
                <p className="text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed">
                  Ikuti 4 langkah mudah di bawah ini untuk mengajukan jadwal perkuliahan daring bagi angkatan Anda:
                </p>
              </div>

              {/* 4 Step Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {steps.map((st) => (
                  <div
                    key={st.step}
                    className={`p-3 rounded-xl border ${st.color} flex flex-col justify-between transition-all`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10.5px] font-bold ${st.badge}`}>
                            {st.step}
                          </span>
                          <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                            {st.title}
                          </h4>
                        </div>
                        {st.icon}
                      </div>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-300 leading-relaxed">
                        {st.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pro-Tips Callout */}
              <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1 text-[11px] leading-relaxed">
                  <span className="font-semibold text-amber-800 dark:text-amber-300">Tips Penting:</span>
                  <ul className="list-disc pl-4 space-y-0.5 text-amber-900/90 dark:text-amber-200/90">
                    <li>Ajukan jadwal minimal <strong>1 hari sebelum</strong> pelaksanaan perkuliahan.</li>
                    <li>Pastikan <strong>alamat email</strong> yang Anda ketik aktif untuk menerima konfirmasi tautan.</li>
                    <li>Jika pada jam yang Anda pilih ruang Zoom sudah terpakai, sistem otomatis mengalihkan ke <strong>Google Meet</strong> sehingga perkuliahan tetap bisa diselenggarakan.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          <label className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500"
            />
            <span>Jangan tampilkan otomatis lagi</span>
          </label>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Tutup
            </button>
            {onOpenRequestModal && (
              <button
                type="button"
                onClick={handleStartRequest}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                <span>Ajukan Jadwal Sekarang</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserGuideModal;
