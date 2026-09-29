import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  AlertTriangle,
  Trash2,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  BookOpen,
  Layers,
  Sparkles,
  UserCheck,
  ShieldAlert,
  Search,
  ChevronDown,
  Check,
  Info,
  Video,
} from 'lucide-react';
import { TIME_SLOTS, DAYS_OF_WEEK, BATCHES, BOOKING_STATUS } from '../constants/scheduleConfig';

// Helper: returns slot labels that overlap (partially or fully) with the given slot label
function getOverlappingSlotLabels(selectedLabel) {
  const sel = TIME_SLOTS.find(s => s.label === selectedLabel);
  if (!sel) return [];
  const selStart = sel.startH * 60 + sel.startM;
  const selEnd   = sel.endH   * 60 + sel.endM;
  return TIME_SLOTS
    .filter(s => {
      if (s.label === selectedLabel) return false;
      const sStart = s.startH * 60 + s.startM;
      const sEnd   = s.endH   * 60 + s.endM;
      return selStart < sEnd && selEnd > sStart;
    })
    .map(s => s.label);
}
import { DOSEN_NAMES, MATA_KULIAH_LIST, getCoursesByDosen, getDosenByCourse } from '../constants/academicData';
import { showConfirmDialog } from '../utils/sweetalert';

export function BookingModal({
  isOpen,
  onClose,
  initialData, // { day, slot, booking }
  onSave,
  onDelete,
  onApprove,
  onReject,
  checkCollision,
  getLecturerAvailability,
  bookings = [],
}) {
  const isEditing = Boolean(initialData?.booking);
  const isPendingBooking = (initialData?.booking?.status || BOOKING_STATUS.APPROVED) === BOOKING_STATUS.PENDING;

  const [formData, setFormData] = useState({
    day: DAYS_OF_WEEK[0],
    timeSlot: TIME_SLOTS[0].label,
    batch: '2024',
    note: '',
    pic: '',
    room: 'zoom',
  });

  const [collisionResult, setCollisionResult] = useState(null);

  const handleApprove = async () => {
    if (onApprove && initialData?.booking?.id) {
      await onApprove(initialData.booking.id, formData.room);
      onClose();
    }
  };

  const handleReject = async () => {
    if (onReject && initialData?.booking?.id) {
      const confirmed = await showConfirmDialog({
        title: 'Tolak Permintaan?',
        text: 'Apakah Anda yakin ingin menolak pengajuan jadwal perkuliahan ini?',
        confirmButtonText: 'Ya, Tolak',
      });
      if (confirmed) {
        await onReject(initialData.booking.id, 'Ditolak oleh admin');
        onClose();
      }
    }
  };
  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const courseDropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (courseDropdownRef.current && !courseDropdownRef.current.contains(event.target)) {
        setIsCourseDropdownOpen(false);
      }
    };
    if (isCourseDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCourseDropdownOpen]);

  // Reset dropdown when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setIsCourseDropdownOpen(false);
      setCourseSearchQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialData) {
      if (initialData.booking) {
        let initialRoom = initialData.booking.room || 'zoom';
        if (initialRoom === 'zoom' && checkCollision) {
          const testZoom = checkCollision({ ...initialData.booking, room: 'zoom' });
          if (testZoom.hasCollision && testZoom.type === 'ROOM_CONFLICT') {
            const testMeet = checkCollision({ ...initialData.booking, room: 'gmeet' });
            if (!testMeet.hasCollision) {
              initialRoom = 'gmeet';
            }
          }
        }
        setFormData({
          day: initialData.booking.day,
          timeSlot: initialData.booking.timeSlot,
          batch: initialData.booking.batch,
          note: initialData.booking.note || '',
          pic: initialData.booking.pic || '',
          room: initialRoom,
        });
      } else {
        const targetDay = initialData.day || DAYS_OF_WEEK[0];
        const targetSlot = initialData.slot?.label || TIME_SLOTS[0].label;
        let initialRoom = 'zoom';
        if (checkCollision) {
          const testZoom = checkCollision({ day: targetDay, timeSlot: targetSlot, room: 'zoom', batch: '2024' });
          if (testZoom.hasCollision && testZoom.type === 'ROOM_CONFLICT') {
            const testMeet = checkCollision({ day: targetDay, timeSlot: targetSlot, room: 'gmeet', batch: '2024' });
            if (!testMeet.hasCollision) {
              initialRoom = 'gmeet';
            }
          }
        }
        setFormData({
          day: targetDay,
          timeSlot: targetSlot,
          batch: '2024',
          note: '',
          pic: '',
          room: initialRoom,
        });
      }
    }
  }, [initialData, checkCollision]);

  // Check collision reactively whenever any relevant field changes
  useEffect(() => {
    if (!isOpen) return;
    const testBooking = {
      ...formData,
      id: initialData?.booking?.id,
    };
    const result = checkCollision(testBooking);
    if (result.hasCollision) {
      setCollisionResult(result);
    } else {
      setCollisionResult(null);
    }
  }, [formData.day, formData.timeSlot, formData.batch, formData.pic, formData.note, formData.room, isOpen, initialData, checkCollision]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (collisionResult) return;
    if (!formData.note.trim()) return;

    onSave({
      ...formData,
      id: initialData?.booking?.id,
    });
    onClose();
  };

  const handleDelete = async () => {
    const confirmed = await showConfirmDialog({
      title: 'Hapus Reservasi Slot?',
      text: `Jadwal "${formData.note}" untuk Angkatan ${formData.batch} (${formData.day}, ${formData.timeSlot}) akan dihapus dari sistem.`,
      icon: 'warning',
      confirmButtonText: 'Ya, Hapus Slot',
      cancelButtonText: 'Batal',
      isDanger: true,
    });
    if (confirmed) {
      onDelete(initialData.booking.id);
      onClose();
    }
  };

  // Get courses taught by selected lecturer
  const suggestedCourses = formData.pic ? getCoursesByDosen(formData.pic) : [];
  // Get lecturers who teach selected course
  const suggestedLecturers = formData.note ? getDosenByCourse(formData.note) : [];

  // Availability map for currently selected day & slot
  const busyLecturersMap = getLecturerAvailability
    ? getLecturerAvailability(formData.day, formData.timeSlot, initialData?.booking?.id)
    : {};

  // Check if current selected lecturer is busy
  const selectedDosenKey = (formData.pic || '').trim().toLowerCase();
  const isSelectedDosenBusy = Boolean(selectedDosenKey && busyLecturersMap[selectedDosenKey]);
  const busyDosenDetail = isSelectedDosenBusy ? busyLecturersMap[selectedDosenKey] : null;

  // Available substitutes who teach this course and are free
  const availableSubstitutes = suggestedLecturers.filter((dsn) => {
    const key = dsn.trim().toLowerCase();
    return key !== selectedDosenKey && !busyLecturersMap[key];
  });

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

  const handleSelectDosen = (dosenName) => {
    const courses = getCoursesByDosen(dosenName);
    setFormData(prev => ({
      ...prev,
      pic: dosenName,
      note: (!prev.note || suggestedCourses.length > 0) && courses.length === 1 ? courses[0] : prev.note,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-lg max-h-[92vh] flex flex-col bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden transform transition-all animate-modal-pop">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/40 flex-shrink-0">
          <div>
            <h3 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 tracking-tight">
              {isEditing ? 'Edit Reservasi Jadwal' : 'Tambah Reservasi Jadwal'}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Validasi otomatis ketersediaan Dosen, Angkatan, dan Ruang Zoom.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Pending Request Alert Banner */}
          {isPendingBooking && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs">
              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-amber-800 dark:text-amber-300">
                      Pengajuan Menunggu Persetujuan
                    </span>
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">
                      Pending
                    </span>
                  </div>
                  <p className="text-[11.5px] mt-1 text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Diajukan oleh: <strong className="text-zinc-900 dark:text-zinc-200">{initialData?.booking?.requestedBy || 'Pengunjung Publik'}</strong>
                    {initialData?.booking?.requesterEmail && (
                      <span> (<a href={`mailto:${initialData.booking.requesterEmail}`} className="underline text-amber-800 dark:text-amber-300 font-medium" title="Kirim email ke mahasiswa">{initialData.booking.requesterEmail}</a>)</span>
                    )}
                    {initialData?.booking?.requestedAt && (
                      <span> pada {new Date(initialData.booking.requestedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })} WIB</span>
                    )}.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Top Collision Alert Banner (Room / Batch / Room Overlap Conflict) */}
          {collisionResult && collisionResult.type !== 'DOSEN_CONFLICT' && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 text-rose-700 dark:text-rose-300">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed space-y-1">
                <strong className="block font-semibold">
                  {collisionResult.type === 'BATCH_CONFLICT'
                    ? 'Peringatan: Bentrok Jadwal Angkatan'
                    : 'Peringatan: Ruang Zoom Sudah Terpakai'}
                </strong>
                <p>{collisionResult.message}</p>
                {collisionResult.type === 'ROOM_CONFLICT' && (() => {
                  const overlapLabels = getOverlappingSlotLabels(formData.timeSlot);
                  const conflictSlot = collisionResult.existing?.timeSlot;
                  const isOverlapCase = conflictSlot && overlapLabels.includes(conflictSlot);
                  return isOverlapCase ? (
                    <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 border-t border-rose-300/30 pt-1 mt-1">
                      ⚠️ Waktu perkuliahan <strong>{formData.timeSlot}</strong> dan <strong>{conflictSlot}</strong> memiliki jeda waktu yang 
                      tumpang tindih — keduanya tidak bisa digunakan bersamaan pada akun Zoom yang sama.
                    </p>
                  ) : null;
                })()}
                {collisionResult.type === 'ROOM_CONFLICT' && formData.room === 'zoom' && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, room: 'gmeet' }))}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      <Video className="w-3.5 h-3.5" />
                      Alihkan ke Google Meet (Tersedia)
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Day & Time Slot Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                Hari
              </label>
              <select
                value={formData.day}
                onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 text-zinc-900 dark:text-zinc-100 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 focus:outline-none transition-colors"
              >
                {DAYS_OF_WEEK.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                Jam Kuliah
              </label>
              <select
                value={formData.timeSlot}
                onChange={(e) => setFormData({ ...formData, timeSlot: e.target.value })}
                className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 text-zinc-900 dark:text-zinc-100 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 focus:outline-none transition-colors"
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot.id} value={slot.label}>
                    {slot.label} WIB
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Virtual Room Selector (Zoom vs Google Meet) */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-zinc-400" />
              Ruang Perkuliahan Virtual
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, room: 'zoom' })}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  formData.room !== 'gmeet'
                    ? 'border-sky-500 bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 ring-2 ring-sky-500/30 shadow-xs'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <span>Zoom</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, room: 'gmeet' })}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  formData.room === 'gmeet'
                    ? 'border-teal-500 bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 ring-2 ring-teal-500/30 shadow-xs'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <Video className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Google Meet</span>
              </button>
            </div>
          </div>

          {/* Batch Selector */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-zinc-400" />
              Angkatan Mahasiswa
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {BATCHES.map((b) => {
                const isSelected = formData.batch === b.id;
                return (
                  <button
                    type="button"
                    key={b.id}
                    onClick={() => setFormData({ ...formData, batch: b.id })}
                    className={`py-1.5 px-2 text-center rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? `${b.activeTab} shadow-xs font-semibold ring-1 ring-inset ring-black/5 dark:ring-white/10`
                        : 'bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : b.dot}`}></span>
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

          {/* Dosen / PIC Dropdown */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-zinc-400" />
              Dosen Pengajar / PIC Sesi
              {suggestedLecturers.length > 0 && (
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-normal">
                  ({suggestedLecturers.length} Pengampu)
                </span>
              )}
            </label>

            <select
              value={formData.pic}
              disabled={!formData.note}
              onChange={(e) => setFormData(prev => ({ ...prev, pic: e.target.value }))}
              className={`w-full text-xs font-medium px-3 py-2 rounded-xl border transition-colors focus:ring-1 focus:outline-none ${
                !formData.note
                  ? 'bg-zinc-100/60 dark:bg-zinc-900/40 text-zinc-400 dark:text-zinc-600 border-zinc-200 dark:border-zinc-800 cursor-not-allowed'
                  : 'bg-zinc-50/60 dark:bg-zinc-900/60 text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-800 focus:ring-zinc-400 dark:focus:ring-zinc-600'
              }`}
            >
              {!formData.note ? (
                <option value="">Pilih Mata Kuliah Terlebih Dahulu</option>
              ) : (
                <>
                  <option value="">Pilih Dosen Pengampu ({suggestedLecturers.length} Dosen)</option>
                  {formData.pic && !DOSEN_NAMES.includes(formData.pic) && (
                    <option value={formData.pic}>{formData.pic}</option>
                  )}
                  {suggestedLecturers.length > 0 ? (
                    suggestedLecturers.map((dsn) => {
                      const key = dsn.trim().toLowerCase();
                      const isBusy = Boolean(busyLecturersMap[key]);
                      const conflict = isBusy ? busyLecturersMap[key].conflictingBooking : null;

                      return (
                        <option
                          key={`dsn-${dsn}`}
                          value={dsn}
                          className={isBusy ? 'text-rose-600 font-semibold' : 'text-zinc-800'}
                        >
                          {isBusy
                            ? `${dsn} — [Jadwal Bentrok: Angkatan ${conflict?.batch}]`
                            : `${dsn} (Tersedia)`}
                        </option>
                      );
                    })
                  ) : (
                    DOSEN_NAMES.map((dsn) => (
                      <option key={`dsn-${dsn}`} value={dsn}>{dsn}</option>
                    ))
                  )}
                </>
              )}
            </select>

            {/* Real-Time Lecturer Availability Status Card */}
            {formData.pic && (
              <div className="mt-2.5">
                {isSelectedDosenBusy ? (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-200 text-xs">
                    <div className="flex items-start gap-2.5">
                      <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <span className="font-semibold text-rose-700 dark:text-rose-300 block">
                          Bentrok Jadwal Dosen Terdeteksi
                        </span>
                        <p className="text-[11.5px] mt-0.5 leading-relaxed text-zinc-600 dark:text-zinc-400">
                          <strong className="text-zinc-900 dark:text-zinc-200">{formData.pic}</strong> telah dijadwalkan di{' '}
                          <strong className="text-rose-600 dark:text-rose-400">Angkatan {busyDosenDetail?.conflictingBooking?.batch}</strong>{' '}
                          ({busyDosenDetail?.conflictingBooking?.note || 'Perkuliahan'}) pada hari{' '}
                          <strong>{formData.day}</strong>, pukul{' '}
                          <strong>{busyDosenDetail?.conflictingBooking?.timeSlot || formData.timeSlot} WIB</strong>.
                        </p>

                        {/* Smart Substitute Recommendation */}
                        {availableSubstitutes.length > 0 ? (
                          <div className="mt-2.5 pt-2.5 border-t border-rose-200/60 dark:border-rose-900/40">
                            <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 mb-1.5">
                              <Sparkles className="w-3 h-3 text-amber-500" />
                              Dosen Pengampu Lain yang Tersedia:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {availableSubstitutes.map((subName) => (
                                <button
                                  key={subName}
                                  type="button"
                                  onClick={() => setFormData((prev) => ({ ...prev, pic: subName }))}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 transition-colors shadow-2xs"
                                  title={`Pilih ${subName} sebagai dosen pengganti`}
                                >
                                  <UserCheck className="w-3 h-3" />
                                  <span>Ganti ke: {subName}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 italic mt-1.5">
                            Tidak ada dosen pengampu lain yang terdaftar untuk mata kuliah ini.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <span>Dosen berstatus <strong>Tersedia</strong> pada {formData.day}, pukul {formData.timeSlot} WIB</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between gap-3">
            {isEditing ? (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Slot</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Batal
              </button>

              {isPendingBooking && onReject && (
                <button
                  type="button"
                  onClick={handleReject}
                  className="px-3 py-2 rounded-xl text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
                >
                  Tolak
                </button>
              )}

              {isPendingBooking && onApprove && (
                <button
                  type="button"
                  onClick={handleApprove}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-700 transition-colors shadow-2xs cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Setujui</span>
                </button>
              )}

              <button
                type="submit"
                disabled={Boolean(collisionResult)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-white shadow-2xs transition-colors ${
                  collisionResult
                    ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                    : 'bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Simpan Jadwal</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
