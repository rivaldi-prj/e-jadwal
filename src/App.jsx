import React, { useState, useEffect } from 'react';
import fikesLogo from './assets/logo-fikes-unbrah.png';
import { useCurrentTime } from './hooks/useCurrentTime';
import { useScheduleStore } from './hooks/useScheduleStore';
import { Header } from './components/Header';
import { LiveTracker } from './components/LiveTracker';
import { FilterBar } from './components/FilterBar';
import { ScheduleMatrix } from './components/ScheduleMatrix';
import { BookingModal } from './components/BookingModal';
import { AdminPinModal } from './components/AdminPinModal';
import { ZoomConfigModal } from './components/ZoomConfigModal';
import { DetailModal } from './components/DetailModal';
import { showToast } from './utils/sweetalert';

export function App() {
  // Real-time clock & live detector
  const {
    currentDay,
    formattedTime,
    formattedDate,
    activeSlot,
    remainingSecondsInSlot,
    nextSlot,
    minutesUntilNextSlot,
  } = useCurrentTime();

  // State store with anti-collision engine & cross-tab sync
  const {
    bookings,
    zoomConfig,
    isAdmin,
    setIsAdmin,
    addBooking,
    updateBooking,
    deleteBooking,
    updateZoomConfig,
    updateAdminPin,
    verifyAdminPin,
    resetToDefault,
    exportData,
    importData,
    checkCollision,
    getLecturerAvailability,
    cloudStatus,
    lastSyncTime,
    pushLocalToCloud,
  } = useScheduleStore();

  // Theme (Dark/Light mode)
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  // Filters
  const [selectedBatch, setSelectedBatch] = useState('ALL');
  const [selectedDay, setSelectedDay] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const [activeCellData, setActiveCellData] = useState(null);
  const [activeDetailBooking, setActiveDetailBooking] = useState(null);

  // Cell clicks
  const handleSelectCell = (cellData) => {
    setActiveCellData(cellData);
    setBookingModalOpen(true);
  };

  const handleShowDetail = (booking) => {
    setActiveDetailBooking(booking);
    setDetailModalOpen(true);
  };

  // Booking Save (Add / Update)
  const handleSaveBooking = (bookingData) => {
    if (bookingData.id) {
      const res = updateBooking(bookingData.id, bookingData);
      if (res.success) {
        showToast({
          type: 'success',
          title: 'Jadwal Diperbarui',
          message: `Jadwal Angkatan ${bookingData.batch} berhasil disimpan.`,
        });
      } else {
        showToast({
          type: 'error',
          title: 'Gagal Menyimpan',
          message: res.message,
        });
      }
    } else {
      const res = addBooking(bookingData);
      if (res.success) {
        showToast({
          type: 'success',
          title: 'Jadwal Ditambahkan',
          message: `Slot ${bookingData.timeSlot} (${bookingData.day}) untuk Angkatan ${bookingData.batch} berhasil dijadwalkan.`,
        });
      } else {
        showToast({
          type: 'error',
          title: 'Gagal Menjadwalkan',
          message: res.message,
        });
      }
    }
  };

  const handleDeleteBooking = (id) => {
    deleteBooking(id);
    showToast({
      type: 'info',
      title: 'Slot Dikosongkan',
      message: 'Reservasi jadwal berhasil dihapus.',
    });
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors duration-200">
      {/* Top Navigation */}
      <Header
        isAdmin={isAdmin}
        onOpenPinModal={() => setPinModalOpen(true)}
        onLockAdmin={() => {
          setIsAdmin(false);
          showToast({
            type: 'info',
            title: 'Mode Mahasiswa Aktif',
            message: 'Mode Pengelola telah dikunci kembali.',
          });
        }}
        onOpenConfigModal={() => setConfigModalOpen(true)}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        formattedTime={formattedTime}
        formattedDate={formattedDate}
        zoomConfig={zoomConfig}
        cloudStatus={cloudStatus}
      />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-[1580px] mx-auto px-2 sm:px-4 lg:px-6 py-2.5 sm:py-3.5">
        {/* Official University Letterhead for Print/Export */}
        <div className="print-only hidden p-4 mb-4 border-b-2 border-zinc-900 pb-3">
          <div className="flex items-center justify-center gap-4">
            <img src={fikesLogo} alt="Logo FIKES UNBRAH" className="w-16 h-16 object-contain flex-shrink-0" />
            <div className="text-center">
              <h2 className="text-base font-bold uppercase tracking-wider text-zinc-900">Universitas Baiturrahmah</h2>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-800">Fakultas Ilmu Kesehatan &bull; Program Studi S1 Kebidanan</h3>
              <p className="text-xs text-zinc-600 mt-0.5 font-mono">Jadwal Penggunaan Ruang Virtual Zoom (Meeting ID: {zoomConfig.meetingId} &bull; Passcode: {zoomConfig.passcode})</p>
            </div>
          </div>
        </div>

        {/* Real-Time Live Tracker Banner */}
        <LiveTracker
          currentDay={currentDay}
          formattedTime={formattedTime}
          activeSlot={activeSlot}
          remainingSecondsInSlot={remainingSecondsInSlot}
          bookings={bookings}
          zoomConfig={zoomConfig}
          nextSlot={nextSlot}
          minutesUntilNextSlot={minutesUntilNextSlot}
          onShowToast={showToast}
        />

        {/* Filter and Search Bar */}
        <FilterBar
          selectedBatch={selectedBatch}
          onSelectBatch={setSelectedBatch}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          bookingsCount={bookings.length}
        />

        {/* 7 Days x 6 Slots Spreadsheet Matrix */}
        <ScheduleMatrix
          bookings={bookings}
          currentDay={currentDay}
          activeSlot={activeSlot}
          isAdmin={isAdmin}
          onSelectCell={handleSelectCell}
          onShowDetail={handleShowDetail}
          selectedBatch={selectedBatch}
          selectedDay={selectedDay}
          searchQuery={searchQuery}
        />
      </main>

      {/* Footer */}
      <footer className="no-print border-t border-zinc-200/80 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-900/60 py-3.5 text-center text-xs text-zinc-500 dark:text-zinc-400">
        <div className="max-w-[1580px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} Program Studi S1 Kebidanan &bull; Fakultas Ilmu Kesehatan Universitas Baiturrahmah</span>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Sistem Koordinasi Zoom Terpadu
            </span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AdminPinModal
        isOpen={pinModalOpen}
        onClose={() => setPinModalOpen(false)}
        onVerifyPin={verifyAdminPin}
        onSuccess={() => {
          setIsAdmin(true);
          showToast({
            type: 'success',
            title: 'Mode Pengelola Aktif',
            message: 'Akses edit, tambah, dan hapus jadwal terbuka.',
          });
        }}
      />

      <BookingModal
        isOpen={bookingModalOpen}
        onClose={() => {
          setBookingModalOpen(false);
          setActiveCellData(null);
        }}
        initialData={activeCellData}
        onSave={handleSaveBooking}
        onDelete={handleDeleteBooking}
        checkCollision={checkCollision}
        getLecturerAvailability={getLecturerAvailability}
        bookings={bookings}
      />

      <ZoomConfigModal
        isOpen={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        zoomConfig={zoomConfig}
        onUpdateZoomConfig={updateZoomConfig}
        isAdmin={isAdmin}
        onUpdatePin={updateAdminPin}
        onResetDefault={resetToDefault}
        exportData={exportData}
        importData={importData}
        onShowToast={showToast}
        cloudStatus={cloudStatus}
        lastSyncTime={lastSyncTime}
        onPushLocalToCloud={pushLocalToCloud}
      />

      <DetailModal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setActiveDetailBooking(null);
        }}
        booking={activeDetailBooking}
        zoomConfig={zoomConfig}
        isLiveNow={
          activeDetailBooking?.day === currentDay &&
          activeDetailBooking?.timeSlot === activeSlot?.label
        }
        onShowToast={showToast}
      />
    </div>
  );
}

export default App;
