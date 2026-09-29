import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Calendar,
  Clock,
  Layers,
  BookOpen,
  User,
  Send,
  Info,
  AlertTriangle,
  ClipboardList,
  Mail,
  Search,
  ChevronDown,
  Check,
  Sparkles,
  Ban,
  CheckCircle2,
  Video,
  CheckCircle,
} from 'lucide-react';
import { TIME_SLOTS, DAYS_OF_WEEK, BATCHES } from '../constants/scheduleConfig';
import { DOSEN_NAMES, MATA_KULIAH_LIST, getCoursesByDosen, getDosenByCourse } from '../constants/academicData';
import { saveMyRequest } from '../utils/requestTracker';

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

export function RequestSlotModal({
  isOpen,
  onClose,
  onRequest,
  allBookings = [],
  initialData,
  onOpenTrackModal,
  onOpenGuideModal,
}) {
  const [formData, setFormData] = useState({
    day: DAYS_OF_WEEK[0],
    timeSlot: TIME_SLOTS[0].label,
    batch: '2024',
    note: '',
    pic: '',
    requestedBy: '',
    requesterEmail: '',
    room: 'zoom',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const courseDropdownRef = useRef(null);

  // Custom Jam Kuliah Dropdown state & refs
  const [isSlotDropdownOpen, setIsSlotDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const slotDropdownRef = useRef(null);
  const slotTriggerRef = useRef(null);
  const listboxRef = useRef(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (courseDropdownRef.current && !courseDropdownRef.current.contains(event.target)) {
        setIsCourseDropdownOpen(false);
      }
      if (slotDropdownRef.current && !slotDropdownRef.current.contains(event.target)) {
        setIsSlotDropdownOpen(false);
      }
    };
    if (isCourseDropdownOpen || isSlotDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCourseDropdownOpen, isSlotDropdownOpen]);

  // Reset dropdowns when modal opens/closes or day changes
  useEffect(() => {
    if (!isOpen) {
      setIsCourseDropdownOpen(false);
      setIsSlotDropdownOpen(false);
      setCourseSearchQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    setIsSlotDropdownOpen(false);
  }, [formData.day]);

  useEffect(() => {
    if (initialData && isOpen) {
      setFormData(prev => ({
        ...prev,
        day: initialData.day || DAYS_OF_WEEK[0],
        timeSlot: initialData.slot?.label || TIME_SLOTS[0].label,
      }));
    }
    if (!isOpen) {
      setSubmitted(false);
      setIsSubmitting(false);
      setErrorMessage('');
    }
  }, [initialData, isOpen]);

  // Get courses taught by selected lecturer
  const suggestedCourses = formData.pic ? getCoursesByDosen(formData.pic) : [];
  // Get lecturers who teach selected course
  const suggestedLecturers = formData.note ? getDosenByCourse(formData.note) : [];

  const handleSelectCourse = (courseName) => {
    const lecturers = getDosenByCourse(courseName);
    setFormData(prev => ({
      ...prev,
      note: courseName,
      pic: (!prev.pic || suggestedLecturers.length > 0) && lecturers.length === 1 ? lecturers[0] : prev.pic,
    }));
    setIsCourseDropdownOpen(false);
    setCourseSearchQuery('');
  };

  // Filtered course lists based on search query
  const filteredCourses = MATA_KULIAH_LIST.filter(c =>
    c.toLowerCase().includes(courseSearchQuery.toLowerCase())
  );
  const filteredSuggestedCourses = suggestedCourses.filter(c =>
    c.toLowerCase().includes(courseSearchQuery.toLowerCase())
  );

  // ── PETA KETERSEDIAAN RUANG (ZOOM & GOOGLE MEET SMART FAILOVER) ──
  const slotAvailability = useMemo(() => {
    if (!formData.day) return {};
    const map = {};
    for (const slot of TIME_SLOTS) {
      // 1. Cek apakah ada jadwal Zoom resmi/disetujui di slot ini
      const zoomBooking = allBookings.find(b => {
        if (b.status === 'rejected' || b.status === 'ditolak') return false;
        if (b.day !== formData.day) return false;
        const s = (b.status || 'approved').toLowerCase();
        const isApproved = s === 'approved' || s === 'disetujui';
        const room = b.room || 'zoom';
        return isApproved && room === 'zoom' && checkTimesOverlap(slot.label, b.timeSlot);
      });

      // 2. Cek apakah ada jadwal Google Meet (disetujui) di slot ini
      const gmeetBooking = allBookings.find(b => {
        if (b.status === 'rejected' || b.status === 'ditolak') return false;
        if (b.day !== formData.day) return false;
        const s = (b.status || 'approved').toLowerCase();
        const isApproved = s === 'approved' || s === 'disetujui';
        const room = b.room || 'zoom';
        return isApproved && room === 'gmeet' && checkTimesOverlap(slot.label, b.timeSlot);
      });

      // 3. Cek apakah ada pengajuan lain yang berstatus menunggu (pending)
      const pendingBooking = allBookings.find(b => {
        if (b.status !== 'pending' && b.status !== 'menunggu') return false;
        if (b.day !== formData.day) return false;
        return checkTimesOverlap(slot.label, b.timeSlot);
      });

      if (zoomBooking && gmeetBooking) {
        // Kedua ruang (Zoom dan Google Meet) sudah terisi
        map[slot.label] = {
          statusType: 'FULL',
          isAvailable: false,
          isApproved: true,
          room: 'full',
          zoomBooking,
          gmeetBooking,
          statusText: 'Penuh · Zoom dan Google Meet terpakai',
          hasPending: Boolean(pendingBooking),
          pendingBooking,
        };
      } else if (zoomBooking) {
        // Zoom terisi, dialihkan ke Google Meet
        map[slot.label] = {
          statusType: 'GMEET',
          isAvailable: true,
          isApproved: false,
          room: 'gmeet',
          zoomBooking,
          statusText: 'Google Meet',
          hasPending: Boolean(pendingBooking),
          pendingBooking,
        };
      } else {
        // Zoom tersedia
        map[slot.label] = {
          statusType: 'ZOOM',
          isAvailable: true,
          isApproved: false,
          room: 'zoom',
          statusText: 'Zoom',
          hasPending: Boolean(pendingBooking),
          pendingBooking,
        };
      }
    }
    return map;
  }, [allBookings, formData.day]);

  // Otomatis sinkronkan formData.room berdasarkan ketersediaan slot yang sedang dipilih
  useEffect(() => {
    if (formData.timeSlot && slotAvailability[formData.timeSlot]) {
      const targetRoom = slotAvailability[formData.timeSlot].room === 'gmeet' ? 'gmeet' : 'zoom';
      if (formData.room !== targetRoom) {
        setFormData(prev => ({ ...prev, room: targetRoom }));
      }
    }
  }, [formData.timeSlot, slotAvailability, formData.room]);

  // Keyboard navigation for Jam Kuliah listbox
  const handleKeyDownTrigger = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isSlotDropdownOpen) {
        setIsSlotDropdownOpen(true);
        const currentIndex = TIME_SLOTS.findIndex(s => s.label === formData.timeSlot);
        setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
      } else {
        const delta = e.key === 'ArrowDown' ? 1 : -1;
        setHighlightedIndex(prev => {
          const next = prev + delta;
          if (next < 0) return TIME_SLOTS.length - 1;
          if (next >= TIME_SLOTS.length) return 0;
          return next;
        });
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!isSlotDropdownOpen) {
        setIsSlotDropdownOpen(true);
        const currentIndex = TIME_SLOTS.findIndex(s => s.label === formData.timeSlot);
        setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
      } else {
        if (highlightedIndex >= 0 && highlightedIndex < TIME_SLOTS.length) {
          const slot = TIME_SLOTS[highlightedIndex];
          const info = slotAvailability[slot.label];
          if (info?.isAvailable) {
            setFormData(prev => ({
              ...prev,
              timeSlot: slot.label,
              room: info.room === 'gmeet' ? 'gmeet' : 'zoom',
            }));
            setIsSlotDropdownOpen(false);
            slotTriggerRef.current?.focus();
          }
        }
      }
    } else if (e.key === 'Escape') {
      if (isSlotDropdownOpen) {
        e.preventDefault();
        setIsSlotDropdownOpen(false);
        slotTriggerRef.current?.focus();
      }
    } else if (e.key === 'Tab') {
      if (isSlotDropdownOpen) {
        setIsSlotDropdownOpen(false);
      }
    }
  };

  useEffect(() => {
    if (isSlotDropdownOpen && highlightedIndex >= 0) {
      const el = document.getElementById(`time-slot-option-${highlightedIndex}`);
      if (el && listboxRef.current) {
        el.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isSlotDropdownOpen]);

  // ── REAL-TIME ANTI-DUPLICATE & ROOM AVAILABILITY VALIDATION ──
  const duplicateWarning = useMemo(() => {
    if (!formData.day || !formData.timeSlot) return null;

    const targetCourse = (formData.note || '').trim().toLowerCase();

    // 1. Cek jika mata kuliah yang sama sudah diajukan / disetujui di hari & jam tersebut
    if (targetCourse) {
      const matchCourse = allBookings.find(b => {
        if (b.status === 'rejected' || b.status === 'ditolak') return false;
        if (b.day !== formData.day) return false;
        if (!checkTimesOverlap(formData.timeSlot, b.timeSlot)) return false;
        return (b.note || '').trim().toLowerCase() === targetCourse;
      });

      if (matchCourse) {
        const isApproved = matchCourse.status === 'approved' || matchCourse.status === 'disetujui' || !matchCourse.status;
        return {
          type: 'course',
          isApproved,
          title: isApproved ? 'Mata Kuliah Sudah Terdaftar Resmi' : 'Mata Kuliah Sedang Menunggu Verifikasi',
          message: isApproved
            ? `Mata kuliah "${formData.note}" sudah disetujui pada hari ${formData.day} pukul ${matchCourse.timeSlot} WIB (Angkatan ${matchCourse.batch}). Anda tidak perlu mengajukan kembali.`
            : `Mata kuliah "${formData.note}" sudah diajukan sebelumnya di hari ${formData.day} (${matchCourse.timeSlot} WIB) oleh ${matchCourse.requestedBy || 'mahasiswa lain'} dan sedang antre ditinjau Operator Prodi.`,
        };
      }
    }

    // 2. Cek apakah kedua ruang (Zoom & Google Meet) penuh
    const currentSlotInfo = slotAvailability[formData.timeSlot];
    if (currentSlotInfo && !currentSlotInfo.isAvailable) {
      return {
        type: 'slot',
        isApproved: true,
        title: 'Penuh · Zoom dan Google Meet terpakai',
        message: `Kedua ruang (Zoom dan Google Meet) pada hari ${formData.day} (${formData.timeSlot} WIB) sudah terpakai oleh perkuliahan lain. Silakan pilih jam perkuliahan yang bertanda Tersedia.`,
      };
    }

    return null;
  }, [allBookings, formData.day, formData.timeSlot, formData.note, slotAvailability]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // Anti-spam click lock
    if (duplicateWarning) {
      setErrorMessage(duplicateWarning.message);
      return;
    }
    if (!formData.note.trim() || !formData.requestedBy.trim()) return;

    // Pastikan room selalu ditentukan dari status ketersediaan slot yang sedang dipilih
    const slotInfo = slotAvailability[formData.timeSlot];
    const finalRoom = (slotInfo && slotInfo.room === 'gmeet') ? 'gmeet' : 'zoom';
    const payload = {
      ...formData,
      room: finalRoom,
    };

    setIsSubmitting(true);
    setErrorMessage('');
    const res = await onRequest(payload);
    setIsSubmitting(false);
    if (res?.success) {
      if (res.booking) {
        saveMyRequest(res.booking);
      }
      setFormData(prev => ({ ...prev, room: res.booking?.room || finalRoom, _autoApproved: res.autoApproved }));
      setSubmitted(true);
    } else {
      setErrorMessage(res?.message || 'Gagal mengirim permintaan jadwal.');
    }
  };

  if (!isOpen) return null;

  if (submitted) {
    const isAutoApproved = formData._autoApproved;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
        <div className="w-full max-w-sm bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-8 text-center animate-modal-pop">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${
            isAutoApproved
              ? 'bg-emerald-100 dark:bg-emerald-900/40'
              : 'bg-amber-100 dark:bg-amber-900/40'
          }`}>
            {isAutoApproved
              ? <CheckCircle className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
              : <Send className="w-7 h-7 text-amber-600 dark:text-amber-400" />
            }
          </div>

          {isAutoApproved ? (
            <>
              <h3 className="font-bold text-base text-slate-900 dark:text-zinc-100 mb-2">
                🎉 Jadwal Langsung Disetujui!
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed mb-3">
                Jadwal <strong>{formData.note}</strong> ({formData.day}, {formData.timeSlot}) telah <strong className="text-emerald-600">disetujui otomatis</strong> karena ruang virtual tersedia. Email konfirmasi dikirimkan ke email Anda.
              </p>
            </>
          ) : (
            <>
              <h3 className="font-bold text-base text-slate-900 dark:text-zinc-100 mb-2">Permintaan Berhasil Dikirim!</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed mb-3">
                Pengajuan untuk <strong>{formData.note}</strong> ({formData.day}, {formData.timeSlot}) telah terkirim ke sistem. Operator prodi akan meninjau jadwal Anda secara manual karena ada potensi konflik ruang.
              </p>
            </>
          )}

          <div className="mb-5 p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs flex items-center justify-center gap-2">
            <Video className={`w-3.5 h-3.5 ${formData.room === 'gmeet' ? 'text-sky-600 dark:text-sky-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
            <span className="text-slate-700 dark:text-zinc-300 font-medium">
              Ruang: <strong className={formData.room === 'gmeet' ? 'text-sky-700 dark:text-sky-300' : 'text-emerald-700 dark:text-emerald-300'}>{formData.room === 'gmeet' ? 'Google Meet' : 'Zoom'}</strong>
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {onOpenTrackModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenTrackModal();
                }}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>Lihat Status Pengajuan Saya</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 text-slate-700 transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-lg max-h-[92vh] flex flex-col bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden animate-modal-pop">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between bg-amber-50/60 dark:bg-amber-950/20 flex-shrink-0">
          <div>
            <h3 className="font-semibold text-sm text-amber-900 dark:text-amber-200">
              Ajukan Jadwal Perkuliahan Zoom
            </h3>
            <p className="text-xs text-amber-700/70 dark:text-amber-400/70 mt-0.5">
              Admin akan meninjau dan menyetujui permintaan ini
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Error Banner */}
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 dark:bg-rose-950/30 dark:border-rose-800/50 text-xs text-rose-800 dark:text-rose-200">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <span className="font-semibold block mb-0.5">Gagal Mengirimkan Pengajuan:</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Info banner */}
          <div className="flex items-start justify-between gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300">
            <div className="flex items-start gap-2 flex-1">
              <Info className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
              <span>Permintaan berstatus <strong>Menunggu</strong> sampai admin menyetujuinya. Jadwal hanya tampil setelah disetujui.</span>
            </div>
            {onOpenGuideModal && (
              <button
                type="button"
                onClick={onOpenGuideModal}
                className="text-[11px] font-semibold text-amber-800 dark:text-amber-200 underline hover:text-amber-950 dark:hover:text-white cursor-pointer whitespace-nowrap ml-1 flex-shrink-0"
              >
                Lihat Panduan
              </button>
            )}
          </div>

          {/* Day & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" /> Hari
              </label>
              <select
                value={formData.day}
                onChange={e => setFormData({ ...formData, day: e.target.value })}
                className="w-full text-xs font-medium px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 text-zinc-900 dark:text-zinc-100 focus:ring-1 focus:ring-zinc-400 focus:outline-none min-h-[44px]"
              >
                {DAYS_OF_WEEK.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* Custom Jam Kuliah Combobox / Listbox */}
            <div className="relative" ref={slotDropdownRef}>
              <label
                id="time-slot-label"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center justify-between"
              >
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" /> Jam Kuliah
                </span>
                {formData.timeSlot && slotAvailability[formData.timeSlot] && (
                  slotAvailability[formData.timeSlot].statusType === 'GMEET' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
                      <Video className="w-2.5 h-2.5 text-sky-600 dark:text-sky-400" />
                      <span>Google Meet</span>
                    </span>
                  ) : slotAvailability[formData.timeSlot].isAvailable ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      <Video className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Zoom</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                      <Ban className="w-2.5 h-2.5 text-rose-600 dark:text-rose-400" />
                      <span>Penuh</span>
                    </span>
                  )
                )}
              </label>

              {/* Trigger Button (Satu baris ringkas saat tertutup) */}
              <button
                ref={slotTriggerRef}
                id="time-slot-trigger"
                type="button"
                role="combobox"
                aria-haspopup="listbox"
                aria-expanded={isSlotDropdownOpen}
                aria-controls="time-slot-listbox"
                aria-labelledby="time-slot-label"
                aria-activedescendant={
                  isSlotDropdownOpen && highlightedIndex >= 0
                    ? `time-slot-option-${highlightedIndex}`
                    : undefined
                }
                onClick={() => {
                  setIsSlotDropdownOpen(prev => !prev);
                  if (!isSlotDropdownOpen) {
                    const idx = TIME_SLOTS.findIndex(s => s.label === formData.timeSlot);
                    setHighlightedIndex(idx >= 0 ? idx : 0);
                  }
                }}
                onKeyDown={handleKeyDownTrigger}
                className={`w-full min-h-[44px] px-3 py-2 rounded-xl border text-xs flex items-center justify-between transition-all cursor-pointer select-none ${
                  isSlotDropdownOpen
                    ? 'border-emerald-600 dark:border-emerald-500 ring-2 ring-emerald-600/20 dark:ring-emerald-500/20 bg-white dark:bg-zinc-900'
                    : slotAvailability[formData.timeSlot]?.statusType === 'GMEET'
                    ? 'border-sky-300 dark:border-sky-700 bg-sky-50/50 dark:bg-sky-950/30 text-sky-950 dark:text-sky-100 hover:bg-sky-100/40 dark:hover:bg-sky-900/40'
                    : slotAvailability[formData.timeSlot] && !slotAvailability[formData.timeSlot].isAvailable
                    ? 'border-rose-300 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20 text-rose-950 dark:text-rose-100'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 hover:bg-zinc-100/60 dark:bg-zinc-900/60 dark:hover:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
                  <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    {formData.timeSlot ? (
                      slotAvailability[formData.timeSlot]?.statusType === 'GMEET'
                        ? `${formData.timeSlot} WIB · Google Meet`
                        : slotAvailability[formData.timeSlot]?.isAvailable
                        ? `${formData.timeSlot} WIB · Zoom`
                        : `${formData.timeSlot} WIB · Penuh`
                    ) : (
                      <span className="text-zinc-400 font-normal">Pilih Jam Kuliah...</span>
                    )}
                  </span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-zinc-400 shrink-0 ml-1.5 transition-transform duration-200 ${
                    isSlotDropdownOpen ? 'rotate-180 text-zinc-900 dark:text-zinc-100' : ''
                  }`}
                />
              </button>

              {/* Listbox Popover Dropdown */}
              {isSlotDropdownOpen && (
                <div
                  ref={listboxRef}
                  id="time-slot-listbox"
                  role="listbox"
                  aria-labelledby="time-slot-label"
                  tabIndex={-1}
                  className="absolute left-0 right-0 top-full mt-1.5 z-40 max-h-60 sm:max-h-72 overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl p-1.5 space-y-1.5 animate-dropdown-pop"
                >
                  {TIME_SLOTS.map((slot, index) => {
                    const info = slotAvailability[slot.label];
                    const isOccupied = info && !info.isAvailable;
                    const isGmeet = info?.statusType === 'GMEET';
                    const isSelected = formData.timeSlot === slot.label;
                    const isHighlighted = highlightedIndex === index;

                    return (
                      <div
                        key={slot.id}
                        id={`time-slot-option-${index}`}
                        role="option"
                        aria-selected={isSelected}
                        aria-disabled={isOccupied}
                        tabIndex={-1}
                        onClick={() => {
                          if (isOccupied) return;
                          setFormData(prev => ({
                            ...prev,
                            timeSlot: slot.label,
                            room: info?.room === 'gmeet' ? 'gmeet' : 'zoom',
                          }));
                          setIsSlotDropdownOpen(false);
                          slotTriggerRef.current?.focus();
                        }}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        className={`min-h-[56px] p-3 rounded-xl text-xs flex flex-col justify-center transition-all cursor-pointer select-none border ${
                          isOccupied
                            ? 'cursor-not-allowed bg-zinc-100/90 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700/60 text-zinc-700 dark:text-zinc-300'
                            : isSelected
                            ? isGmeet
                              ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-400 dark:border-sky-600 ring-2 ring-sky-500/20 text-sky-950 dark:text-sky-100'
                              : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-600 ring-2 ring-emerald-500/20 text-emerald-950 dark:text-emerald-100'
                            : isHighlighted
                            ? isGmeet
                              ? 'bg-sky-50/50 dark:bg-sky-900/30 border-sky-200 dark:border-sky-800/60 text-zinc-900 dark:text-zinc-100'
                              : 'bg-emerald-50/50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800/60 text-zinc-900 dark:text-zinc-100'
                            : 'bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-900 dark:text-zinc-100'
                        }`}
                      >
                        {/* Baris 1: Jam Mulai-Selesai (WIB) - Selalu Satu Baris */}
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`font-mono text-xs font-bold whitespace-nowrap ${
                              isOccupied
                                ? 'line-through decoration-zinc-400 dark:decoration-zinc-500 text-zinc-500 dark:text-zinc-400'
                                : 'text-zinc-900 dark:text-zinc-100'
                            }`}
                          >
                            {slot.label} WIB
                          </span>

                          {isSelected && (
                            <span className={`text-xs font-bold flex items-center gap-1 ${isGmeet ? 'text-sky-600 dark:text-sky-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              <Check className="w-4 h-4 stroke-[2.5]" />
                              <span className="sr-only">Dipilih</span>
                            </span>
                          )}
                        </div>

                        {/* Baris 2: Chip Platform + Status Tersedia / Penuh */}
                        {isOccupied ? (
                          <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                            <Ban className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                            <span>Penuh · Zoom dan Meet terpakai</span>
                          </div>
                        ) : isGmeet ? (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-300 dark:border-sky-800 shrink-0">
                              <Video className="w-2.5 h-2.5 text-sky-600 dark:text-sky-400" />
                              <span>Google Meet</span>
                            </span>
                            <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-300">
                              Tersedia
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shrink-0">
                              <Video className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                              <span>Zoom</span>
                            </span>
                            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                              Tersedia
                            </span>
                          </div>
                        )}

                        {/* Baris 3 (khusus Google Meet): "Zoom dipakai Angk. XXXX", boleh wrap ke baris berikutnya, tidak boleh terpotong */}
                        {!isOccupied && isGmeet && (
                          <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-normal mt-1 break-words">
                            Zoom dipakai Angk. {info.zoomBooking?.batch || '-'}{info.zoomBooking?.note ? ` · ${info.zoomBooking.note}` : ''}
                          </p>
                        )}

                        {/* Keterangan kecil jika ada pengajuan Menunggu (tanpa menutup slot) */}
                        {!isOccupied && info?.hasPending && (
                          <p className="text-[10.5px] text-amber-700 dark:text-amber-400 leading-normal mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span>Ada pengajuan menunggu verifikasi</span>
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Penjelasan setelah memilih (HANYA tampil saat daftar tertutup) */}
              {!isSlotDropdownOpen && formData.timeSlot && slotAvailability[formData.timeSlot] && (
                <>
                  {slotAvailability[formData.timeSlot].statusType === 'ZOOM' && (
                    <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Kuliah Anda akan memakai Zoom.</span>
                    </div>
                  )}

                  {slotAvailability[formData.timeSlot].statusType === 'GMEET' && (
                    <div className="mt-2 p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 text-xs text-sky-950 dark:text-sky-100 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-sky-900 dark:text-sky-200">
                        <Video className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                        <span>Kuliah Anda akan memakai Google Meet</span>
                      </div>
                      <p className="text-[11.5px] text-sky-800/90 dark:text-sky-300 leading-relaxed">
                        Zoom pada jam ini dipakai Angkatan {slotAvailability[formData.timeSlot].zoomBooking?.batch || '-'}{slotAvailability[formData.timeSlot].zoomBooking?.note ? ` (${slotAvailability[formData.timeSlot].zoomBooking.note})` : ''}. Link Meet Fikes sudah siap dan sama sahnya untuk perkuliahan. Tautan dikirim ke email Anda setelah admin menyetujui.
                      </p>
                    </div>
                  )}

                  {slotAvailability[formData.timeSlot].statusType === 'FULL' && (
                    <div className="flex items-start gap-2 mt-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-800 dark:text-rose-300 font-medium">
                      <Ban className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                      <span>Penuh · Zoom dan Meet terpakai pada jam ini. Silakan pilih jam lain.</span>
                    </div>
                  )}

                  {slotAvailability[formData.timeSlot].isAvailable && slotAvailability[formData.timeSlot].hasPending && (
                    <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium mt-1 leading-snug flex items-start gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <span>Catatan: Ada pengajuan lain yang sedang menunggu verifikasi pada jam ini. Anda tetap dapat mengajukan.</span>
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Batch */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-zinc-400" /> Angkatan
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {BATCHES.map(b => {
                const isSelected = formData.batch === b.id;
                return (
                  <button
                    type="button"
                    key={b.id}
                    onClick={() => setFormData({ ...formData, batch: b.id })}
                    className={`py-1.5 px-2 text-center rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                      isSelected
                        ? `${b.activeTab} shadow-xs ring-1 ring-inset ring-black/5 dark:ring-white/10`
                        : 'bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : b.dot}`} />
                    <span>{b.id}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mata Kuliah / Nama Kegiatan Searchable Combobox */}
          <div className="relative" ref={courseDropdownRef}>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
              Mata Kuliah / Nama Kegiatan <span className="text-rose-500">*</span>
            </label>

            {/* Combobox Trigger Button */}
            <div
              onClick={() => setIsCourseDropdownOpen(prev => !prev)}
              className={`w-full min-h-[40px] px-3.5 py-2 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-all ${
                isCourseDropdownOpen
                  ? 'border-zinc-900 dark:border-zinc-100 ring-2 ring-zinc-900/10 dark:ring-zinc-100/10 bg-white dark:bg-zinc-900'
                  : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 hover:bg-zinc-100/60 dark:bg-zinc-900/60 dark:hover:bg-zinc-800/60'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <BookOpen className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                <span className={`truncate font-medium ${formData.note ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'}`}>
                  {formData.note || 'Pilih Mata Kuliah...'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                {formData.note && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFormData(prev => ({ ...prev, note: '', pic: '' }));
                    }}
                    className="p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 transition-colors"
                    title="Kosongkan Pilihan"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${isCourseDropdownOpen ? 'rotate-180 text-zinc-900 dark:text-zinc-100' : ''}`} />
              </div>
            </div>

            {/* Hidden Input for HTML5 form validation */}
            <input
              type="text"
              required
              tabIndex={-1}
              value={formData.note}
              onChange={() => {}}
              className="sr-only"
            />

            {/* Search & Option Popover Menu */}
            {isCourseDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden animate-dropdown-pop">
                {/* Search Bar Input */}
                <div className="p-2.5 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/40">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Cari nama mata kuliah..."
                      value={courseSearchQuery}
                      onChange={(e) => setCourseSearchQuery(e.target.value)}
                      className="w-full text-xs pl-8 pr-7 py-2 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
                    />
                    {courseSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setCourseSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-zinc-400 hover:text-zinc-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* List of Courses */}
                <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5 scrollbar-thin">
                  {/* Suggested Courses for selected lecturer (if any) */}
                  {!courseSearchQuery && filteredSuggestedCourses.length > 0 && (
                    <div className="mb-2">
                      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-indigo-500" />
                        <span>Diampu oleh {formData.pic}</span>
                      </div>
                      {filteredSuggestedCourses.map((mk) => {
                        const isSelected = formData.note === mk;
                        return (
                          <button
                            key={`sug-${mk}`}
                            type="button"
                            onClick={() => handleSelectCourse(mk)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                              isSelected
                                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold'
                                : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300'
                            }`}
                          >
                            <span className="truncate">{mk}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100 flex-shrink-0 ml-1" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* All Courses */}
                  {!courseSearchQuery && (
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                      Daftar Mata Kuliah ({filteredCourses.length})
                    </div>
                  )}

                  {filteredCourses.length > 0 ? (
                    filteredCourses.map((mk) => {
                      const isSelected = formData.note === mk;
                      return (
                        <button
                          key={mk}
                          type="button"
                          onClick={() => handleSelectCourse(mk)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold'
                              : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          <span className="truncate">{mk}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100 flex-shrink-0 ml-1" />}
                        </button>
                      );
                    })
                  ) : (
                    <div className="py-6 text-center text-xs text-zinc-400">
                      Tidak ada mata kuliah yang cocok dengan "{courseSearchQuery}"
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Dosen */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-zinc-400" /> Dosen Pengajar
              </span>
              {suggestedLecturers.length > 0 && (
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-normal">
                  ({suggestedLecturers.length} Pengampu)
                </span>
              )}
            </label>
            <select
              value={formData.pic}
              disabled={!formData.note}
              onChange={e => setFormData({ ...formData, pic: e.target.value })}
              className={`w-full text-xs font-medium px-3 py-2 rounded-xl border transition-colors focus:outline-none ${
                !formData.note
                  ? 'bg-zinc-100 dark:bg-zinc-900/40 text-zinc-400 border-zinc-200 dark:border-zinc-800 cursor-not-allowed'
                  : 'bg-zinc-50/60 dark:bg-zinc-900/60 text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-800 focus:ring-1 focus:ring-zinc-400'
              }`}
            >
              <option value="">{formData.note ? 'Pilih Dosen...' : 'Pilih Mata Kuliah Terlebih Dahulu'}</option>
              {(suggestedLecturers.length > 0 ? suggestedLecturers : DOSEN_NAMES).map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Nama Pemohon */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-zinc-400" /> Nama Pemohon <span className="text-rose-500">*</span>
            </label>
            <input
              required
              type="text"
              placeholder="Nama PJ Angkatan / Dosen / Pemohon..."
              value={formData.requestedBy}
              onChange={e => setFormData({ ...formData, requestedBy: e.target.value })}
              className="w-full text-xs px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 text-zinc-900 dark:text-zinc-100 focus:ring-1 focus:ring-zinc-400 focus:outline-none placeholder-zinc-400"
            />
          </div>

          {/* Email Pemohon */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-zinc-400" /> Email Mahasiswa / Pemohon <span className="text-rose-500">*</span>
              </span>
              <span className="text-[10.5px] text-zinc-400 font-normal">Wajib untuk notifikasi</span>
            </label>
            <input
              required
              type="email"
              placeholder="contoh: nama.mahasiswa@gmail.com"
              value={formData.requesterEmail}
              onChange={e => setFormData({ ...formData, requesterEmail: e.target.value })}
              className="w-full text-xs px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 text-zinc-900 dark:text-zinc-100 focus:ring-1 focus:ring-zinc-400 focus:outline-none placeholder-zinc-400"
            />
            <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 mt-1">
              Informasi persetujuan / alasan penolakan dan tautan Zoom dapat dikirimkan ke email ini.
            </p>
          </div>

          {/* Duplicate Warning Banner */}
          {duplicateWarning && (
            <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs animate-fade-in ${
              duplicateWarning.isApproved
                ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300'
                : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300'
            }`}>
              <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${
                duplicateWarning.isApproved ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'
              }`} />
              <div className="flex-1">
                <span className="font-semibold block mb-0.5 text-[11.5px]">
                  {duplicateWarning.title}
                </span>
                <p className="leading-relaxed opacity-90 text-[11px]">{duplicateWarning.message}</p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="pt-3 border-t border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || Boolean(duplicateWarning) || !formData.note || !formData.requestedBy.trim()}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-xs transition-colors ${
                duplicateWarning
                  ? 'bg-zinc-400 dark:bg-zinc-700 cursor-not-allowed opacity-80'
                  : 'bg-amber-600 hover:bg-amber-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Mengirim...</>
              ) : duplicateWarning ? (
                <><AlertTriangle className="w-3.5 h-3.5" />Jadwal Sudah Ada / Diajukan</>
              ) : (
                <><Send className="w-3.5 h-3.5" />Kirim Permintaan</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
