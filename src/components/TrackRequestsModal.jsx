import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  User,
  Search,
  RefreshCw,
  Send,
  Mail,
  RotateCcw,
  ExternalLink,
  Copy,
  Check,
  Video,
  MessageSquare,
} from 'lucide-react';
import { BATCHES, BOOKING_STATUS } from '../constants/scheduleConfig';
import { copyToClipboard } from '../utils/clipboard';
import { openWhatsAppShare } from '../utils/shareUtils';

export function TrackRequestsModal({
  isOpen,
  onClose,
  allBookings = [],
  zoomConfig,
  onOpenRequestModal,
}) {
  const [emailInput, setEmailInput] = useState('');
  const [queriedEmail, setQueriedEmail] = useState('');
  const [copiedField, setCopiedField] = useState(null);

  // Reset input setiap kali modal dibuka / ditutup
  useEffect(() => {
    if (!isOpen) {
      setEmailInput('');
      setQueriedEmail('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Lakukan pencarian email
  const handleSearch = (e) => {
    if (e) e.preventDefault();
    setQueriedEmail(emailInput.trim());
  };

  // Reset/Ganti email
  const handleClear = () => {
    setEmailInput('');
    setQueriedEmail('');
  };

  // Salin ke clipboard
  const handleCopy = async (text, label) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  // Filter pengajuan berdasarkan email yang dicari (case-insensitive)
  const emailResults = queriedEmail
    ? allBookings.filter(
        (b) =>
          b.requesterEmail &&
          b.requesterEmail.toLowerCase().trim() === queriedEmail.toLowerCase().trim()
      )
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden animate-modal-pop">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-900/60 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-900/50">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-zinc-100">
                Status Pengajuan Jadwal
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Cek persetujuan atau alasan penolakan jadwal Anda via email
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Email Input Form */}
        <div className="p-3.5 border-b border-zinc-200/60 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/40 flex-shrink-0">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                placeholder="Ketik alamat email Anda (contoh: mhs@gmail.com)..."
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
                className="w-full text-xs pl-9 pr-8 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              {emailInput && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded"
                  title="Hapus / ganti email"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-1.5 shadow-2xs flex-shrink-0 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Cari Status</span>
            </button>
          </form>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
          {!queriedEmail ? (
            /* State Belum Masukkan Email */
            <div className="p-8 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center mb-3 border border-blue-200 dark:border-blue-800/60">
                <Mail className="w-7 h-7" />
              </div>
              <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 mb-1">
                Pantau Pengajuan Dari Perangkat Mana Saja
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mb-4 leading-relaxed">
                Ketik alamat email yang Anda gunakan saat mengajukan jadwal pada kolom di atas, lalu klik <strong>Cari Status</strong> untuk melihat riwayat lengkap pengajuan Anda.
              </p>
              {onOpenRequestModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenRequestModal();
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 transition-colors shadow-2xs cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Ajukan Jadwal Sekarang</span>
                </button>
              )}
            </div>
          ) : emailResults.length === 0 ? (
            /* State Email Tidak Ditemukan */
            <div className="p-8 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center mb-3 border border-amber-200 dark:border-amber-800/60">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 mb-1">
                Tidak Ditemukan Pengajuan
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm leading-relaxed mb-4">
                Tidak ada data pengajuan dengan email <strong className="text-zinc-800 dark:text-zinc-200">"{queriedEmail}"</strong>. Pastikan penulisan alamat email sama persis dengan yang Anda gunakan saat mengajukan jadwal.
              </p>
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Coba email lain</span>
              </button>
            </div>
          ) : (
            /* State Hasil Ditemukan */
            <>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 px-1 pb-1 flex items-center justify-between">
                <span>
                  Ditemukan <strong className="text-zinc-800 dark:text-zinc-200">{emailResults.length}</strong> pengajuan untuk <strong className="text-blue-600 dark:text-blue-400">{queriedEmail}</strong>:
                </span>
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:underline"
                >
                  Ganti Email
                </button>
              </div>

              {emailResults.map((item) => {
                const batchInfo = BATCHES.find((b) => b.id === item.batch);
                const isPending = item.status === BOOKING_STATUS.PENDING;
                const isApproved = item.status === BOOKING_STATUS.APPROVED;
                const isRejected = item.status === BOOKING_STATUS.REJECTED;
                const isGmeet = (item.room || 'zoom') === 'gmeet';
                const gmeetLink = zoomConfig?.gmeetUrl || 'https://meet.google.com/kqe-reho-vbd';

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isRejected
                        ? 'border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20'
                        : isApproved
                        ? isGmeet
                          ? 'border-teal-200 dark:border-teal-900/50 bg-teal-50/30 dark:bg-teal-950/20'
                          : 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20'
                        : 'border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20'
                    }`}
                  >
                    {/* Top Meta: Batch, Date, Room, Status */}
                    <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-zinc-200/60 dark:border-zinc-800/60">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${batchInfo?.badge || 'bg-slate-100 text-slate-700'}`}>
                          Angkatan {item.batch}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold inline-flex items-center gap-1 ${
                          isGmeet
                            ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                            : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                        }`}>
                          {isGmeet && <Video className="w-2.5 h-2.5" />}
                          <span>{isGmeet ? 'Google Meet' : 'Zoom'}</span>
                        </span>
                        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-zinc-400" />
                          {item.day}, {item.timeSlot} WIB
                        </span>
                      </div>

                      {/* Status Badge */}
                      <div>
                        {isPending && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/60 px-2.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-700">
                            <Clock className="w-2.5 h-2.5 animate-spin-slow text-amber-600" />
                            <span>Menunggu Persetujuan</span>
                          </span>
                        )}
                        {isApproved && (
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
                            isGmeet
                              ? 'text-teal-800 dark:text-teal-200 bg-teal-100 dark:bg-teal-900/60 border-teal-300 dark:border-teal-700'
                              : 'text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-900/60 border-emerald-300 dark:border-emerald-700'
                          }`}>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Disetujui</span>
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-800 dark:text-rose-200 bg-rose-100 dark:bg-rose-950 px-2.5 py-0.5 rounded-full border border-rose-300 dark:border-rose-800">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>Ditolak</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Course & Requester */}
                    <h4 className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 mb-1.5">
                      {item.note || 'Pengajuan Jadwal Perkuliahan'}
                    </h4>

                    <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 mb-3 flex-wrap">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Pemohon: <strong className="text-zinc-700 dark:text-zinc-300">{item.requestedBy || '-'}</strong></span>
                      </span>
                      {item.requesterEmail && (
                        <span className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                          <Mail className="w-3 h-3 text-zinc-400" />
                          <span>{item.requesterEmail}</span>
                        </span>
                      )}
                    </div>

                    {/* STATUS DETAILS BANNER */}
                    {isRejected && (
                      <div className="p-3 rounded-lg bg-rose-100/70 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800/80 text-xs text-rose-900 dark:text-rose-200">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 leading-relaxed">
                            <span className="font-bold block text-rose-800 dark:text-rose-300">
                              Alasan Penolakan dari Admin:
                            </span>
                            <p className="mt-0.5 font-medium">
                              "{item.rejectReason || 'Waktu perkuliahan tidak tersedia atau terdapat agenda lain pada jam tersebut.'}"
                            </p>
                            <p className="text-[11px] text-rose-700/80 dark:text-rose-400/80 mt-1">
                              💡 Silakan ajukan kembali pada jam perkuliahan atau hari lain yang masih kosong.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {isApproved && (
                      <div className="space-y-2.5">
                        {isGmeet ? (
                          <>
                            <div className="p-2.5 rounded-lg bg-teal-100/60 dark:bg-teal-950/40 border border-teal-300/80 dark:border-teal-800 text-xs text-teal-800 dark:text-teal-300 flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
                              <span>Pengajuan menggunakan <strong>Google Meet</strong> karena ruang Zoom pada jam ini telah digunakan.</span>
                            </div>

                            <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-teal-300 dark:border-teal-800/80 shadow-2xs space-y-2.5">
                              <div className="flex items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-1.5">
                                <span className="text-[11px] font-bold text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
                                  <Video className="w-3.5 h-3.5 text-teal-600" />
                                  <span>Akses Google Meet (Khusus Pemohon)</span>
                                </span>
                                <span className="text-[10px] text-zinc-400">
                                  Bagikan ke dosen & grup kelas
                                </span>
                              </div>

                              <div className="p-2.5 rounded-lg bg-teal-50/60 dark:bg-zinc-800/80 border border-teal-200/80 dark:border-zinc-700/80">
                                <div className="text-[10px] text-zinc-400 font-medium mb-1">Tautan Google Meet</div>
                                <div className="font-mono text-xs font-semibold text-teal-700 dark:text-teal-300 break-all">
                                  {gmeetLink}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                                <a
                                  href={gmeetLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-2xs transition-colors cursor-pointer"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span>Buka Google Meet</span>
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(gmeetLink, `link-${item.id}`)}
                                  className="px-3 py-2 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                                  title="Salin Tautan Meet"
                                >
                                  {copiedField === `link-${item.id}` ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-teal-600" />
                                      <span className="text-teal-600 font-semibold">Tersalin</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5 text-zinc-400" />
                                      <span>Salin Link</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openWhatsAppShare(item, zoomConfig)}
                                  className="px-3 py-2 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                                  title="Bagikan ke WhatsApp"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>Bagikan WA</span>
                                </button>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="p-2.5 rounded-lg bg-emerald-100/60 dark:bg-emerald-950/40 border border-emerald-300/80 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                              <span>Pengajuan Anda telah disetujui dan telah resmi masuk ke tabel jadwal perkuliahan utama.</span>
                            </div>

                            {zoomConfig && (
                              <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-800/80 shadow-2xs space-y-2.5">
                                <div className="flex items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-1.5">
                                  <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                                    <span>🔑</span>
                                    <span>Akses Ruang Zoom (Khusus Pemohon)</span>
                                  </span>
                                  <span className="text-[10px] text-zinc-400">
                                    Bagikan ke dosen & grup kelas
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(zoomConfig.meetingId, `id-${item.id}`)}
                                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80 hover:border-emerald-500 transition-colors text-left cursor-pointer group"
                                    title="Klik untuk menyalin Meeting ID"
                                  >
                                    <div>
                                      <div className="text-[10px] text-zinc-400 font-medium">Meeting ID</div>
                                      <div className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">{zoomConfig.meetingId}</div>
                                    </div>
                                    {copiedField === `id-${item.id}` ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600 flex-shrink-0" />
                                    )}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleCopy(zoomConfig.passcode, `pass-${item.id}`)}
                                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80 hover:border-emerald-500 transition-colors text-left cursor-pointer group"
                                    title="Klik untuk menyalin Passcode"
                                  >
                                    <div>
                                      <div className="text-[10px] text-zinc-400 font-medium">Passcode</div>
                                      <div className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">{zoomConfig.passcode}</div>
                                    </div>
                                    {copiedField === `pass-${item.id}` ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600 flex-shrink-0" />
                                    )}
                                  </button>
                                </div>

                                <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                                  <a
                                    href={zoomConfig.joinUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors cursor-pointer"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>Buka Ruang Zoom</span>
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(zoomConfig.joinUrl, `link-${item.id}`)}
                                    className="px-3 py-2 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                                    title="Salin Tautan Zoom"
                                  >
                                    {copiedField === `link-${item.id}` ? (
                                      <>
                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                        <span className="text-emerald-600 font-semibold">Tersalin</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3.5 h-3.5 text-zinc-400" />
                                        <span>Salin Link</span>
                                      </>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openWhatsAppShare(item, zoomConfig)}
                                    className="px-3 py-2 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                                    title="Bagikan ke WhatsApp"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    <span>Bagikan WA</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {isPending && (
                      <div className="p-2.5 rounded-lg bg-amber-100/60 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span>Permintaan Anda sedang dalam antrean pemeriksaan oleh pengelola Zoom prodi.</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/60 flex items-center justify-between flex-shrink-0">
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Status diperbarui secara langsung (realtime)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
