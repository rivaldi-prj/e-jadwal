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
import { AdminLoginPage } from './components/AdminLoginPage';
import { PendingRequestsPanel } from './components/PendingRequestsPanel';
import { RequestSlotModal } from './components/RequestSlotModal';
import { TrackRequestsModal } from './components/TrackRequestsModal';
import { UserGuideModal } from './components/UserGuideModal';
import { TodayScheduleModal } from './components/TodayScheduleModal';
import { showToast, showRejectionAlert } from './utils/sweetalert';
import { getMyRequests, checkStatusChanges } from './utils/requestTracker';

export function App() {
  // Real-time clock & live detector
  const {
    currentDay,
    currentTotalMinutes,
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
    pendingBookings,
    zoomConfig,
    isAdmin,
    setIsAdmin,
    addBooking,
    updateBooking,
    deleteBooking,
    requestBooking,
    approveBooking,
    rejectBooking,
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
    isLoading,
    syncError,
    refetch,
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

  // Client-Side Routing: '/admin', '/login', '/kelola' -> Halaman Login Khusus Admin
  const [currentRoute, setCurrentRoute] = useState(() => {
    const p = window.location.pathname.toLowerCase();
    const h = window.location.hash.toLowerCase();
    const s = window.location.search.toLowerCase();
    if (
      p.includes('/admin') ||
      p.includes('/login') ||
      p.includes('/kelola') ||
      h.includes('/admin') ||
      s.includes('admin')
    ) {
      return '/admin';
    }
    return '/';
  });

  useEffect(() => {
    const handlePopState = () => {
      const p = window.location.pathname.toLowerCase();
      const h = window.location.hash.toLowerCase();
      const s = window.location.search.toLowerCase();
      if (
        p.includes('/admin') ||
        p.includes('/login') ||
        p.includes('/kelola') ||
        h.includes('/admin') ||
        s.includes('admin')
      ) {
        setCurrentRoute('/admin');
      } else {
        setCurrentRoute('/');
      }
    };
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  const navigateTo = (path) => {
    try {
      const isSubdir = window.location.pathname.startsWith('/e-jadwal');
      const targetPath = isSubdir && !path.startsWith('/e-jadwal')
        ? (path === '/' ? '/e-jadwal/' : `/e-jadwal${path}`)
        : path;
      window.history.pushState({}, '', targetPath);
    } catch (e) {
      console.warn('Navigation error:', e);
    }
    setCurrentRoute(path);
  };

  // Secret shortcut: Ctrl + Shift + A atau Alt + P -> mengarahkan ke halaman /admin
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) return;

      if (
        (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') ||
        (e.altKey && e.key.toLowerCase() === 'p')
      ) {
        e.preventDefault();
        if (isAdmin) {
          showToast({
            type: 'info',
            title: 'Mode Pengelola Aktif',
            message: 'Anda sudah berada di dalam Mode Pengelola.',
          });
        } else {
          navigateTo('/admin');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdmin]);

  // Filters
  const [selectedBatch, setSelectedBatch] = useState('ALL');
  const [selectedDay, setSelectedDay] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestSlotTarget, setRequestSlotTarget] = useState(null);
  const [trackModalOpen, setTrackModalOpen] = useState(false);
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [todayScheduleModalOpen, setTodayScheduleModalOpen] = useState(false);
  const [myRequestsList, setMyRequestsList] = useState(() => getMyRequests());

  const [activeCellData, setActiveCellData] = useState(null);
  const [activeDetailBooking, setActiveDetailBooking] = useState(null);

  // Auto-display petunjuk alur bagi mahasiswa yang baru pertama kali berkunjung
  useEffect(() => {
    if (isAdmin) return;
    try {
      const hasSeen = localStorage.getItem('hasSeenStudentGuide');
      if (!hasSeen) {
        const timer = setTimeout(() => setGuideModalOpen(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }, [isAdmin]);

  // Auto-detect status changes for schedule requests submitted from this device
  useEffect(() => {
    if (!bookings.length) return;
    checkStatusChanges(bookings, ({ request, newStatus, rejectReason }) => {
      if (newStatus === 'rejected') {
        showRejectionAlert({
          note: request.note,
          day: request.day,
          timeSlot: request.timeSlot,
          rejectReason,
        });
      } else if (newStatus === 'approved') {
        showToast({
          type: 'success',
          title: 'Pengajuan Disetujui!',
          message: `Jadwal ${request.note} (${request.day}) telah disetujui Admin dan tampil di jadwal perkuliahan.`,
        });
      }
      setMyRequestsList(getMyRequests());
    });
  }, [bookings]);

  const handleOpenRequestSlot = (target) => {
    setRequestSlotTarget(target);
    setRequestModalOpen(true);
  };

  const handleRequestBooking = async (formData) => {
    const res = await requestBooking(formData);
    return res;
  };

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

  // Jika user membuka halaman /admin dan belum login, tampilkan AdminLoginPage khusus
  if (currentRoute === '/admin' && !isAdmin) {
    return (
      <AdminLoginPage
        onLoginSuccess={() => {
          setIsAdmin(true);
          navigateTo('/');
          showToast({
            type: 'success',
            title: 'Login Berhasil',
            message: 'Selamat datang di Panel Pengelola E-Jadwal.',
          });
        }}
        onBackToPublic={() => navigateTo('/')}
        verifyAdminPin={verifyAdminPin}
        darkMode={darkMode}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] dark:bg-[#121316] text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors duration-200">
      {/* Top Navigation */}
      <Header
        isAdmin={isAdmin}
        onLogoutAdmin={() => {
          setIsAdmin(false);
          navigateTo('/admin');
          showToast({
            type: 'info',
            title: 'Keluar Pengelola',
            message: 'Anda telah keluar dari Mode Pengelola.',
          });
        }}
        onOpenConfigModal={() => setConfigModalOpen(true)}
        onOpenGuideModal={() => setGuideModalOpen(true)}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        formattedTime={formattedTime}
        formattedDate={formattedDate}
        zoomConfig={zoomConfig}
        cloudStatus={cloudStatus}
        pendingCount={pendingBookings?.length || 0}
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

        {/* Dashboard Title & Quick Metrics (Directly inspired by reference) */}
        <div className="no-print mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
              Jadwal Permintaan Perkuliahan Zoom
            </h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs">
                <span>Semua Sesi</span>
                <span className="w-4 h-4 rounded-full bg-white/25 dark:bg-black/20 text-[10px] flex items-center justify-center font-bold">
                  {bookings.length}
                </span>
              </span>

              {pendingBookings?.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-300 text-amber-950 shadow-xs animate-pulse">
                  <span>Menunggu</span>
                  <span className="w-4 h-4 rounded-full bg-amber-950/20 text-[10px] flex items-center justify-center font-bold">
                    {pendingBookings.length}
                  </span>
                </span>
              )}

              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium ml-1">
                {formattedDate}
              </span>
            </div>
          </div>

          {/* Minimalist Stats Counters (Responsive on both mobile and desktop) */}
          <div className="flex items-center justify-around sm:justify-center gap-2.5 sm:gap-6 md:gap-7 w-full sm:w-auto self-stretch sm:self-end md:self-center bg-white/90 dark:bg-zinc-900/90 px-3 sm:px-5 py-2 sm:py-2.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs mt-1 sm:mt-0">
            <div className="flex flex-col items-center text-center min-w-[64px]">
              <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider leading-none mb-1.5 whitespace-nowrap">
                Total Sesi
              </div>
              <div className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight leading-none">
                {bookings.length}
              </div>
            </div>

            <div className="w-px h-7 bg-zinc-200/80 dark:bg-zinc-800" />

            <div className="flex flex-col items-center text-center min-w-[64px]">
              <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider leading-none mb-1.5 whitespace-nowrap">
                Hari Kuliah
              </div>
              <div className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight leading-none">
                6
              </div>
            </div>

            <div className="w-px h-7 bg-zinc-200/80 dark:bg-zinc-800" />

            <div className="flex flex-col items-center text-center min-w-[64px]">
              <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider leading-none mb-1.5 whitespace-nowrap">
                Angkatan
              </div>
              <div className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight leading-none">
                4
              </div>
            </div>
          </div>
        </div>

        {/* Panel Pengajuan Jadwal Menunggu Persetujuan Admin */}
        {isAdmin && (
          <PendingRequestsPanel
            pendingBookings={pendingBookings}
            allBookings={bookings}
            onApprove={approveBooking}
            onReject={rejectBooking}
            onShowToast={showToast}
          />
        )}

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
          isLoading={isLoading}
          syncError={syncError}
          onRefetch={refetch}
          isAdmin={isAdmin}
          isAuthorized={true}
          onOpenTodaySchedule={() => setTodayScheduleModalOpen(true)}
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
          currentTotalMinutes={currentTotalMinutes}
          isAdmin={isAdmin}
          onSelectCell={handleSelectCell}
          onShowDetail={handleShowDetail}
          onRequestSlot={handleOpenRequestSlot}
          onOpenTrackRequests={() => setTrackModalOpen(true)}
          onOpenGuideModal={() => setGuideModalOpen(true)}
          myRequestsCount={myRequestsList.filter(r => (r.status || r.lastNotifiedStatus) === 'pending').length}
          selectedBatch={selectedBatch}
          selectedDay={selectedDay}
          searchQuery={searchQuery}
          onResetFilters={() => {
            setSelectedBatch('ALL');
            setSelectedDay('ALL');
            setSearchQuery('');
          }}
          isLoading={isLoading}
          syncError={syncError}
          onRefetch={refetch}
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
        onApprove={approveBooking}
        onReject={rejectBooking}
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
        isAdmin={isAdmin}
        isAuthorized={true}
      />

      <RequestSlotModal
        isOpen={requestModalOpen}
        onClose={() => {
          setRequestModalOpen(false);
          setRequestSlotTarget(null);
          setMyRequestsList(getMyRequests());
        }}
        onRequest={handleRequestBooking}
        allBookings={bookings}
        initialData={requestSlotTarget}
        onOpenTrackModal={() => setTrackModalOpen(true)}
        onOpenGuideModal={() => setGuideModalOpen(true)}
      />

      <TrackRequestsModal
        isOpen={trackModalOpen}
        onClose={() => {
          setTrackModalOpen(false);
          setMyRequestsList(getMyRequests());
        }}
        allBookings={bookings}
        zoomConfig={zoomConfig}
        onOpenRequestModal={() => setRequestModalOpen(true)}
      />

      <UserGuideModal
        isOpen={guideModalOpen}
        onClose={() => setGuideModalOpen(false)}
        onOpenRequestModal={() => {
          setGuideModalOpen(false);
          setRequestSlotTarget(null);
          setRequestModalOpen(true);
        }}
      />

      <TodayScheduleModal
        isOpen={todayScheduleModalOpen}
        onClose={() => setTodayScheduleModalOpen(false)}
        bookings={bookings}
        currentDay={currentDay}
        formattedDate={formattedDate}
        formattedTime={formattedTime}
        currentTotalMinutes={currentTotalMinutes}
        activeSlot={activeSlot}
        remainingSecondsInSlot={remainingSecondsInSlot}
        zoomConfig={zoomConfig}
        isAdmin={isAdmin}
        onSelectBooking={handleShowDetail}
        onShowToast={showToast}
      />
    </div>
  );
}

export default App;
