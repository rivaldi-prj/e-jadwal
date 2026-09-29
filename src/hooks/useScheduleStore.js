import { useState, useEffect, useCallback } from 'react';
import {
  TIME_SLOTS,
  INITIAL_BOOKINGS,
  DEFAULT_ZOOM_CONFIG,
  DEFAULT_ADMIN_PIN,
  BOOKING_STATUS,
} from '../constants/scheduleConfig';
import {
  getSupabaseClient,
  isSupabaseConfigured,
} from '../utils/supabaseClient';
import {
  sendApprovalEmail,
  sendRejectionEmail,
  sendSubmissionEmail,
  sendOperatorNotificationEmail,
} from '../utils/emailService';

const STORAGE_KEYS = {
  BOOKINGS: 'zoom_scheduler_bookings_v2',
  ZOOM_CONFIG: 'zoom_scheduler_config_v1',
  ADMIN_PIN: 'zoom_scheduler_pin_v2', // v2: stores SHA-256 hash, not plaintext
};

const CHANNEL_NAME = 'zoom_schedule_channel';

// --- PIN hashing with HTTP fallback ---
// SubtleCrypto (SHA-256) only works in secure contexts (HTTPS/localhost).
// On plain HTTP (e.g. e-jadwal.test), we fall back to btoa-based obfuscation.
async function hashPin(pin) {
  const salt = 'fikes_unbrah_zoom_v2';
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(pin + salt);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hex = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      return 'sha256:' + hex;
    } catch {
      // Falls through to btoa fallback below
    }
  }
  // HTTP fallback: simple btoa obfuscation with salt (not cryptographically secure,
  // but prevents casual plaintext reading in DevTools)
  return 'b64:' + btoa(pin + salt);
}

// Returns true if the value looks like a hashed PIN (either format)
function isHashed(value) {
  return typeof value === 'string' &&
    (value.startsWith('sha256:') || value.startsWith('b64:'));
}

// Helper to calculate slot minute boundaries
function getSlotMinutes(timeSlotLabel) {
  const slot = TIME_SLOTS.find(s => s.label === timeSlotLabel);
  if (!slot) return null;
  return {
    start: slot.startH * 60 + slot.startM,
    end: slot.endH * 60 + slot.endM,
  };
}

export function useScheduleStore() {
  const [bookings, setBookings] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
      return saved ? JSON.parse(saved) : INITIAL_BOOKINGS;
    } catch {
      return INITIAL_BOOKINGS;
    }
  });

  const [zoomConfig, setZoomConfig] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ZOOM_CONFIG);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.meetingId === '842 9103 4567') {
          localStorage.setItem(STORAGE_KEYS.ZOOM_CONFIG, JSON.stringify(DEFAULT_ZOOM_CONFIG));
          return DEFAULT_ZOOM_CONFIG;
        }
        return parsed;
      }
      return DEFAULT_ZOOM_CONFIG;
    } catch {
      return DEFAULT_ZOOM_CONFIG;
    }
  });

  const [adminPin, setAdminPin] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ADMIN_PIN);
      // If saved value is already a hash, use it; otherwise treat as plaintext (migration)
      if (saved && isHashed(saved)) return saved;
      // Legacy or first-run: hash the default PIN and save it asynchronously
      // Return placeholder; useEffect below will finalize
      return null;
    } catch {
      return null;
    }
  });

  // On mount: ensure the stored PIN is always a hash (migration from v1 plaintext)
  useEffect(() => {
    async function ensureHashedPin() {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.ADMIN_PIN);
        if (saved && isHashed(saved)) {
          // Already hashed — just set state
          setAdminPin(saved);
        } else {
          // Plaintext PIN exists (legacy) or nothing saved: hash DEFAULT_ADMIN_PIN
          const plaintext = (saved && !isHashed(saved)) ? saved : DEFAULT_ADMIN_PIN;
          const hashed = await hashPin(plaintext);
          localStorage.setItem(STORAGE_KEYS.ADMIN_PIN, hashed);
          setAdminPin(hashed);
        }
      } catch (e) {
        console.warn('PIN migration error:', e);
        // Fallback: hash default pin
        try {
          const hashed = await hashPin(DEFAULT_ADMIN_PIN);
          setAdminPin(hashed);
        } catch {}
      }
    }
    ensureHashedPin();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [isAdmin, setIsAdminState] = useState(() => {
    try {
      return sessionStorage.getItem('admin_session_auth') === 'true';
    } catch {
      return false;
    }
  });

  const setIsAdmin = useCallback((val) => {
    setIsAdminState(val);
    try {
      if (val) {
        sessionStorage.setItem('admin_session_auth', 'true');
      } else {
        sessionStorage.removeItem('admin_session_auth');
      }
    } catch (e) {
      console.warn('SessionStorage error:', e);
    }
  }, []);
  const [cloudStatus, setCloudStatus] = useState(() => (isSupabaseConfigured() ? 'connecting' : 'disconnected'));
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [isLoading, setIsLoading] = useState(() => isSupabaseConfigured());
  const [syncError, setSyncError] = useState(null);
  const [syncTrigger, setSyncTrigger] = useState(0);

  const refetch = useCallback(() => {
    setSyncTrigger(prev => prev + 1);
  }, []);

  // Broadcast helper for multi-tab local sync
  const broadcastChange = useCallback((type, payload) => {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const channel = new BroadcastChannel(CHANNEL_NAME);
        channel.postMessage({ type, payload, timestamp: Date.now() });
        channel.close();
      }
    } catch (err) {
      console.warn('BroadcastChannel error:', err);
    }
  }, []);

  // Multi-tab listener
  useEffect(() => {
    let channel;
    try {
      if ('BroadcastChannel' in window) {
        channel = new BroadcastChannel(CHANNEL_NAME);
        channel.onmessage = (event) => {
          const { type, payload } = event.data || {};
          if (type === 'BOOKINGS_UPDATED') {
            setBookings(payload);
          } else if (type === 'CONFIG_UPDATED') {
            setZoomConfig(payload);
          }
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel init error:', e);
    }

    const handleStorage = (e) => {
      if (e.key === STORAGE_KEYS.BOOKINGS && e.newValue) {
        setBookings(JSON.parse(e.newValue));
      }
      if (e.key === STORAGE_KEYS.ZOOM_CONFIG && e.newValue) {
        setZoomConfig(JSON.parse(e.newValue));
      }
      if (e.key === STORAGE_KEYS.ADMIN_PIN && e.newValue) {
        setAdminPin(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Supabase Cloud Synchronizer & Realtime Subscription
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      setCloudStatus('disconnected');
      setIsLoading(false);
      return;
    }

    setCloudStatus('connecting');
    setIsLoading(true);
    setSyncError(null);
    let isMounted = true;
    let subscriptionChannel = null;

    async function initCloudSync() {
      try {
        // 1. Fetch remote bookings
        const { data: remoteBookings, error: bErr } = await client
          .from('bookings')
          .select('*')
          .order('day');

        if (bErr) throw bErr;

        if (isMounted && remoteBookings) {
          let localRoomMap = new Map();
          try {
            const cached = JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKINGS) || '[]');
            if (Array.isArray(cached)) {
              cached.forEach(c => { if (c.id && c.room) localRoomMap.set(c.id, c.room); });
            }
          } catch {
            // ignore
          }

          const mapped = remoteBookings.map((b) => {
            const hasGmeetTag = b.reject_reason && b.reject_reason.includes('[ROOM:gmeet]');
            const room = b.room || (hasGmeetTag ? 'gmeet' : null) || localRoomMap.get(b.id) || 'zoom';
            return {
              id: b.id,
              day: b.day,
              timeSlot: b.time_slot,
              batch: b.batch,
              note: b.note,
              pic: b.pic || '',
              updatedAt: b.updated_at,
              status: b.status || BOOKING_STATUS.APPROVED,
              requestedBy: b.requested_by || '',
              requesterEmail: b.requester_email || '',
              requestedAt: b.requested_at || null,
              approvedAt: b.approved_at || null,
              rejectReason: (b.reject_reason || '').replace('[ROOM:gmeet]', '').trim(),
              room,
            };
          });
          setBookings(mapped);
          localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(mapped));
        }

        // 2. Fetch remote zoom config
        const { data: remoteConfig, error: cErr } = await client
          .from('zoom_config')
          .select('*')
          .eq('id', 1)
          .maybeSingle();

        if (!cErr && remoteConfig && isMounted) {
          const mappedCfg = {
            name: remoteConfig.name || DEFAULT_ZOOM_CONFIG.name,
            joinUrl: remoteConfig.join_url,
            meetingId: remoteConfig.meeting_id,
            passcode: remoteConfig.passcode,
            gmeetUrl: remoteConfig.gmeet_url || remoteConfig.gmeetUrl || DEFAULT_ZOOM_CONFIG.gmeetUrl,
          };
          setZoomConfig(mappedCfg);
          localStorage.setItem(STORAGE_KEYS.ZOOM_CONFIG, JSON.stringify(mappedCfg));
        }

        if (isMounted) {
          setCloudStatus('connected');
          setLastSyncTime(new Date());
        }

        // 3. Realtime Listener across all connected devices
        subscriptionChannel = client
          .channel('public_bookings_realtime')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'bookings' },
            (payload) => {
              if (!isMounted) return;
              if (payload.eventType === 'INSERT') {
                const hasGmeetTag = payload.new.reject_reason && payload.new.reject_reason.includes('[ROOM:gmeet]');
                const newB = {
                  id: payload.new.id,
                  day: payload.new.day,
                  timeSlot: payload.new.time_slot,
                  batch: payload.new.batch,
                  note: payload.new.note,
                  pic: payload.new.pic || '',
                  updatedAt: payload.new.updated_at,
                  status: payload.new.status || BOOKING_STATUS.APPROVED,
                  requestedBy: payload.new.requested_by || '',
                  requesterEmail: payload.new.requester_email || '',
                  requestedAt: payload.new.requested_at || null,
                  approvedAt: payload.new.approved_at || null,
                  rejectReason: (payload.new.reject_reason || '').replace('[ROOM:gmeet]', '').trim(),
                  room: payload.new.room || (hasGmeetTag ? 'gmeet' : null) || 'zoom',
                };
                setBookings((prev) => {
                  const existingLocal = prev.find((b) => b.id === newB.id);
                  if (existingLocal) {
                    if (!payload.new.room && !hasGmeetTag && existingLocal.room) {
                      newB.room = existingLocal.room;
                    }
                    return prev;
                  }
                  const next = [...prev, newB];
                  localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(next));
                  return next;
                });
              } else if (payload.eventType === 'UPDATE') {
                const hasGmeetTag = payload.new.reject_reason && payload.new.reject_reason.includes('[ROOM:gmeet]');
                const updatedB = {
                  id: payload.new.id,
                  day: payload.new.day,
                  timeSlot: payload.new.time_slot,
                  batch: payload.new.batch,
                  note: payload.new.note,
                  pic: payload.new.pic || '',
                  updatedAt: payload.new.updated_at,
                  status: payload.new.status || BOOKING_STATUS.APPROVED,
                  requestedBy: payload.new.requested_by || '',
                  requesterEmail: payload.new.requester_email || '',
                  requestedAt: payload.new.requested_at || null,
                  approvedAt: payload.new.approved_at || null,
                  rejectReason: (payload.new.reject_reason || '').replace('[ROOM:gmeet]', '').trim(),
                  room: payload.new.room || (hasGmeetTag ? 'gmeet' : null) || 'zoom',
                };
                setBookings((prev) => {
                  const existingLocal = prev.find((b) => b.id === updatedB.id);
                  if (!payload.new.room && !hasGmeetTag && existingLocal?.room) {
                    updatedB.room = existingLocal.room;
                  }
                  const next = prev.map((b) => (b.id === updatedB.id ? updatedB : b));
                  localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(next));
                  return next;
                });
              } else if (payload.eventType === 'DELETE') {
                const deletedId = payload.old?.id;
                if (deletedId) {
                  setBookings((prev) => {
                    const next = prev.filter((b) => b.id !== deletedId);
                    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(next));
                    return next;
                  });
                }
              }
              setLastSyncTime(new Date());
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'zoom_config' },
            (payload) => {
              if (!isMounted) return;
              if (payload.new) {
                const mappedCfg = {
                  name: payload.new.name || DEFAULT_ZOOM_CONFIG.name,
                  joinUrl: payload.new.join_url,
                  meetingId: payload.new.meeting_id,
                  passcode: payload.new.passcode,
                  gmeetUrl: payload.new.gmeet_url || payload.new.gmeetUrl || DEFAULT_ZOOM_CONFIG.gmeetUrl,
                };
                setZoomConfig(mappedCfg);
                localStorage.setItem(STORAGE_KEYS.ZOOM_CONFIG, JSON.stringify(mappedCfg));
                setLastSyncTime(new Date());
              }
            }
          )
          .subscribe();
      } catch (err) {
        console.warn('Supabase cloud fetch warning:', err);
        if (isMounted) {
          setCloudStatus('error');
          setSyncError(err.message || 'Gagal memuat data dari cloud.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initCloudSync();

    return () => {
      isMounted = false;
      if (subscriptionChannel && client) {
        client.removeChannel(subscriptionChannel);
      }
    };
  }, [syncTrigger]);

  // Helper to check if two time slot labels overlap
  const checkSlotsOverlap = useCallback((slotLabelA, slotLabelB) => {
    if (slotLabelA === slotLabelB) return true;
    const minutesA = getSlotMinutes(slotLabelA);
    const minutesB = getSlotMinutes(slotLabelB);
    if (!minutesA || !minutesB) return false;
    return minutesA.start < minutesB.end && minutesA.end > minutesB.start;
  }, []);

  // Multi-Level Anti-Collision Engine — hanya cek terhadap booking APPROVED
  const checkCollision = useCallback((booking) => {
    const targetMinutes = getSlotMinutes(booking.timeSlot);
    if (!targetMinutes) {
      return { hasCollision: true, type: 'INVALID_SLOT', message: 'Format slot waktu tidak valid.' };
    }

    const trimmedPic = (booking.pic || '').trim().toLowerCase();

    // Hanya cek collision dengan booking yang sudah APPROVED
    const approvedBookings = bookings.filter(b => {
      const s = (b.status || BOOKING_STATUS.APPROVED).toLowerCase();
      return s === 'approved' || s === 'disetujui';
    });

    for (const existing of approvedBookings) {
      if (booking.id && existing.id === booking.id) continue;
      if (existing.day !== booking.day) continue;
      const isTimeOverlap = checkSlotsOverlap(booking.timeSlot, existing.timeSlot);
      if (!isTimeOverlap) continue;

      const existingPic = (existing.pic || '').trim().toLowerCase();
      if (trimmedPic && existingPic && trimmedPic === existingPic) {
        return {
          hasCollision: true,
          type: 'DOSEN_CONFLICT',
          existing,
          message: `Dosen "${existing.pic}" sudah memiliki jadwal mengajar di Angkatan ${existing.batch} (${existing.note || 'Perkuliahan'}) pada hari ${booking.day} pukul ${existing.timeSlot} WIB.`,
        };
      }

      if (booking.batch && existing.batch === booking.batch) {
        return {
          hasCollision: true,
          type: 'BATCH_CONFLICT',
          existing,
          message: `Angkatan ${booking.batch} sudah memiliki jadwal kuliah "${existing.note || 'Perkuliahan'}" pada hari ${booking.day} (${existing.timeSlot} WIB). Mahasiswa tidak dapat menghadiri dua sesi perkuliahan sekaligus.`,
        };
      }

      // Cek bentrok ruang: hanya bentrok jika room sama
      const bookingRoom = booking.room || 'zoom';
      const existingRoom = existing.room || 'zoom';
      if (bookingRoom === existingRoom) {
        return {
          hasCollision: true,
          type: 'ROOM_CONFLICT',
          existing,
          message: `Ruang ${bookingRoom === 'gmeet' ? 'Google Meet' : 'Zoom'} pada hari ${booking.day} (${booking.timeSlot}) sudah digunakan oleh Angkatan ${existing.batch} (${existing.note || 'Kegiatan Perkuliahan'}).`,
        };
      }
    }

    return { hasCollision: false };
  }, [bookings, checkSlotsOverlap]);

  // Lecturer availability — hanya cek terhadap booking APPROVED
  const getLecturerAvailability = useCallback((day, timeSlot, excludeBookingId = null) => {
    const busyLecturers = {};
    const approvedBookings = bookings.filter(b => (b.status || BOOKING_STATUS.APPROVED) === BOOKING_STATUS.APPROVED);

    for (const b of approvedBookings) {
      if (excludeBookingId && b.id === excludeBookingId) continue;
      if (b.day !== day) continue;
      if (!checkSlotsOverlap(timeSlot, b.timeSlot)) continue;
      if (b.pic && b.pic.trim()) {
        busyLecturers[b.pic.trim().toLowerCase()] = {
          isBusy: true,
          conflictingBooking: b,
        };
      }
    }

    return busyLecturers;
  }, [bookings, checkSlotsOverlap]);

  // ── ACTIONS ─────────────────────────────────────────────────────────────────

  // Admin: tambah jadwal langsung APPROVED
  const addBooking = useCallback(async (bookingData) => {
    const collision = checkCollision(bookingData);
    if (collision.hasCollision) {
      return { success: false, message: collision.message };
    }

    const now = new Date().toISOString();
    const newBooking = {
      ...bookingData,
      id: `b-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      status: BOOKING_STATUS.APPROVED,
      approvedAt: now,
      requestedBy: '',
      requestedAt: null,
      rejectReason: '',
      updatedAt: now,
    };

    const updated = [...bookings, newBooking];
    setBookings(updated);
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(updated));
    broadcastChange('BOOKINGS_UPDATED', updated);

    const client = getSupabaseClient();
    if (client) {
      try {
        const payload = {
          id: newBooking.id,
          day: newBooking.day,
          time_slot: newBooking.timeSlot,
          batch: newBooking.batch,
          note: newBooking.note,
          pic: newBooking.pic || '',
          updated_at: newBooking.updatedAt,
          status: newBooking.status,
          requested_by: '',
          approved_at: newBooking.approvedAt,
          room: newBooking.room || 'zoom',
        };
        let { error } = await client.from('bookings').insert(payload);
        if (error && (error.message?.includes('room') || error.code === 'PGRST204')) {
          delete payload.room;
          if (newBooking.room === 'gmeet') {
            payload.reject_reason = '[ROOM:gmeet]';
          }
          await client.from('bookings').insert(payload);
        }
      } catch (e) {
        console.warn('Cloud sync error on addBooking:', e);
      }
    }

    return { success: true, booking: newBooking };
  }, [bookings, checkCollision, broadcastChange]);

  // Publik: ajukan permintaan slot → status PENDING (dengan validasi anti-duplikasi)
  const requestBooking = useCallback(async (bookingData) => {
    // ── 1. VALIDASI ANTI-DUPLIKASI (PENCEGAHAN DOUBLE ENTRY MAHASISWA) ──
    const targetCourse = (bookingData.note || '').trim().toLowerCase();

    // A. Cek apakah mata kuliah yang sama sudah ada di hari & jam tersebut (APPROVED atau PENDING)
    if (targetCourse) {
      const duplicateCourse = bookings.find(b => {
        if (b.status === BOOKING_STATUS.REJECTED) return false;
        if (b.day !== bookingData.day) return false;
        if (!checkSlotsOverlap(bookingData.timeSlot, b.timeSlot)) return false;
        return (b.note || '').trim().toLowerCase() === targetCourse;
      });

      if (duplicateCourse) {
        if (duplicateCourse.status === BOOKING_STATUS.APPROVED) {
          return {
            success: false,
            message: `Mata kuliah "${bookingData.note}" sudah resmi terdaftar dan disetujui untuk hari ${bookingData.day} pukul ${duplicateCourse.timeSlot} WIB. Tidak perlu diajukan ulang.`,
          };
        } else {
          return {
            success: false,
            message: `Mata kuliah "${bookingData.note}" sudah diajukan sebelumnya pada hari ${bookingData.day} (${duplicateCourse.timeSlot} WIB) oleh ${duplicateCourse.requestedBy || 'mahasiswa lain'} dan sedang menunggu persetujuan Pengelola.`,
          };
        }
      }
    }

    // B. Cek ketersediaan ruang Zoom vs Google Meet di hari & jam tersebut
    const isApprovedBooking = (b) => {
      const s = (b.status || BOOKING_STATUS.APPROVED).toLowerCase();
      return s === 'approved' || s === 'disetujui';
    };

    const zoomApproved = bookings.find(b => {
      if (b.status === BOOKING_STATUS.REJECTED || b.status === 'ditolak') return false;
      if (b.day !== bookingData.day) return false;
      const room = b.room || 'zoom';
      return isApprovedBooking(b) && room === 'zoom' && checkSlotsOverlap(bookingData.timeSlot, b.timeSlot);
    });

    const gmeetOccupied = bookings.find(b => {
      if (b.status === BOOKING_STATUS.REJECTED || b.status === 'ditolak') return false;
      if (b.day !== bookingData.day) return false;
      const room = b.room || 'zoom';
      return isApprovedBooking(b) && room === 'gmeet' && checkSlotsOverlap(bookingData.timeSlot, b.timeSlot);
    });

    let assignedRoom = bookingData.room;
    if (!assignedRoom || (assignedRoom === 'zoom' && zoomApproved)) {
      if (!zoomApproved) {
        assignedRoom = 'zoom';
      } else if (!gmeetOccupied) {
        assignedRoom = 'gmeet';
      } else {
        return {
          success: false,
          message: `Kedua ruang virtual (Zoom dan Google Meet) pada hari ${bookingData.day} (${bookingData.timeSlot} WIB) sudah terisi penuh. Silakan pilih jam atau hari lain.`,
        };
      }
    } else if (assignedRoom === 'gmeet' && gmeetOccupied) {
      return {
        success: false,
        message: `Ruang Google Meet pada hari ${bookingData.day} (${bookingData.timeSlot} WIB) sudah terisi perkuliahan lain. Silakan pilih jam atau hari lain.`,
      };
    }

    const now = new Date().toISOString();
    const newBooking = {
      ...bookingData,
      id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      room: assignedRoom || 'zoom',
      status: BOOKING_STATUS.PENDING,
      requestedBy: bookingData.requestedBy || 'Publik',
      requesterEmail: bookingData.requesterEmail || '',
      requestedAt: now,
      approvedAt: null,
      rejectReason: '',
      updatedAt: now,
    };

    const client = getSupabaseClient();
    if (client) {
      try {
        const insertPayload = {
          id: newBooking.id,
          day: newBooking.day,
          time_slot: newBooking.timeSlot,
          batch: newBooking.batch,
          note: newBooking.note,
          pic: newBooking.pic || '',
          updated_at: newBooking.updatedAt,
          status: BOOKING_STATUS.PENDING,
          requested_by: newBooking.requestedBy,
          requester_email: newBooking.requesterEmail,
          requested_at: newBooking.requestedAt,
          room: newBooking.room,
        };
        let { error: insErr } = await client.from('bookings').insert(insertPayload);
        if (insErr && (insErr.message?.includes('room') || insErr.code === 'PGRST204')) {
          delete insertPayload.room;
          if (newBooking.room === 'gmeet') {
            insertPayload.reject_reason = '[ROOM:gmeet]';
          }
          const retry = await client.from('bookings').insert(insertPayload);
          insErr = retry.error;
        }

        if (insErr) {
          console.error('Cloud insert error on requestBooking:', insErr);
          if (insErr.code === '23505' || insErr.message?.includes('duplicate key') || insErr.message?.includes('unique') || insErr.message?.includes('unique_active_booking_slot_room')) {
            return {
              success: false,
              message: 'Slot ini baru saja terisi oleh perkuliahan lain. Silakan pilih jam atau hari lain.',
            };
          }
          if (insErr.code === 'PGRST204' || insErr.message?.includes('schema cache') || insErr.message?.includes('requested_by') || insErr.message?.includes('status')) {
            return {
              success: false,
              message: 'Tabel database Supabase belum memiliki kolom status/pemohon. Silakan jalankan script SQL migrasi di Supabase SQL Editor.',
            };
          }
          return {
            success: false,
            message: `Gagal menyimpan ke database Supabase: ${insErr.message}`,
          };
        }
      } catch (e) {
        console.warn('Cloud sync error on requestBooking:', e);
      }
    }

    const updated = [...bookings, newBooking];
    setBookings(updated);
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(updated));
    broadcastChange('BOOKINGS_UPDATED', updated);

    // 1. Kirim email konfirmasi ke mahasiswa bahwa pengajuannya telah diterima
    if (newBooking.requesterEmail) {
      sendSubmissionEmail(newBooking).then((emailRes) => {
        if (emailRes.success) {
          console.log(`Email konfirmasi pengajuan terkirim ke ${newBooking.requesterEmail}`);
        } else if (!emailRes.skipped) {
          console.warn('Gagal kirim email konfirmasi:', emailRes.message);
        }
      });
    }

    // 2. Kirim email notifikasi instan ke Operator Prodi agar langsung tahu lewat HP
    sendOperatorNotificationEmail(newBooking).then((opRes) => {
      if (opRes?.success) {
        console.log(`Email notifikasi pengajuan baru berhasil terkirim ke Operator Prodi (${opRes.operatorEmail})`);
      } else if (!opRes?.skipped) {
        console.warn('Gagal kirim notifikasi ke operator:', opRes?.message);
      }
    });

    return { success: true, booking: newBooking };
  }, [bookings, broadcastChange]);

  // Admin: setujui booking PENDING (dengan auto-failover ke Google Meet jika Zoom terisi)
  const approveBooking = useCallback(async (id, overrideRoom = null) => {
    const now = new Date().toISOString();
    const target = bookings.find(b => b.id === id);
    if (!target) return { success: false, message: 'Booking tidak ditemukan.' };

    let effectiveRoom = overrideRoom || target.room || 'zoom';

    // Cek collision saat approve
    let collision = checkCollision({ ...target, room: effectiveRoom, id });
    if (collision.hasCollision) {
      // Jika bentrok ruang Zoom, cek apakah Google Meet kosong
      if (collision.type === 'ROOM_CONFLICT' && effectiveRoom === 'zoom') {
        const meetCollision = checkCollision({ ...target, room: 'gmeet', id });
        if (!meetCollision.hasCollision) {
          effectiveRoom = 'gmeet';
          collision = { hasCollision: false };
        }
      }
    }

    if (collision.hasCollision) {
      return { success: false, message: `Tidak bisa disetujui: ${collision.message}` };
    }

    const client = getSupabaseClient();
    if (client) {
      try {
        const updatePayload = {
          status: BOOKING_STATUS.APPROVED,
          approved_at: now,
          reject_reason: '',
          updated_at: now,
          room: effectiveRoom,
        };
        let { error: upErr } = await client.from('bookings').update(updatePayload).eq('id', id);
        if (upErr && (upErr.message?.includes('room') || upErr.code === 'PGRST204')) {
          delete updatePayload.room;
          if (effectiveRoom === 'gmeet') {
            updatePayload.reject_reason = '[ROOM:gmeet]';
          } else {
            updatePayload.reject_reason = '';
          }
          const retry = await client.from('bookings').update(updatePayload).eq('id', id);
          upErr = retry.error;
        }

        if (upErr) {
          console.error('Cloud sync error on approveBooking:', upErr);
          return { success: false, message: `Gagal memperbarui database cloud: ${upErr.message}` };
        }
      } catch (e) {
        console.warn('Cloud sync error on approveBooking:', e);
      }
    }

    const updatedTarget = {
      ...target,
      status: BOOKING_STATUS.APPROVED,
      room: effectiveRoom,
      approvedAt: now,
      rejectReason: '',
      updatedAt: now,
    };

    const updated = bookings.map(b =>
      b.id === id ? updatedTarget : b
    );
    setBookings(updated);
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(updated));
    broadcastChange('BOOKINGS_UPDATED', updated);

    // Kirim notifikasi email otomatis jika mahasiswa mencantumkan email
    if (updatedTarget.requesterEmail) {
      sendApprovalEmail(updatedTarget, zoomConfig).then((emailRes) => {
        if (emailRes.success) {
          console.log(`Email persetujuan berhasil terkirim ke ${updatedTarget.requesterEmail}`);
        } else if (!emailRes.skipped) {
          console.warn('Status pengiriman email:', emailRes.message);
        }
      });
    }

    return {
      success: true,
      target: updatedTarget,
      hasEmail: Boolean(updatedTarget.requesterEmail),
      switchedToMeet: target.room !== 'gmeet' && effectiveRoom === 'gmeet',
    };
  }, [bookings, zoomConfig, checkCollision, broadcastChange]);

  // Admin: tolak booking PENDING
  const rejectBooking = useCallback(async (id, reason = '') => {
    const now = new Date().toISOString();
    const client = getSupabaseClient();
    if (client) {
      try {
        const { error: upErr } = await client.from('bookings').update({
          status: BOOKING_STATUS.REJECTED,
          reject_reason: reason,
          updated_at: now,
        }).eq('id', id);

        if (upErr) {
          console.error('Cloud sync error on rejectBooking:', upErr);
          return { success: false, message: `Gagal memperbarui database cloud: ${upErr.message}` };
        }
      } catch (e) {
        console.warn('Cloud sync error on rejectBooking:', e);
      }
    }

    const target = bookings.find(b => b.id === id);
    const updated = bookings.map(b =>
      b.id === id
        ? { ...b, status: BOOKING_STATUS.REJECTED, rejectReason: reason, updatedAt: now }
        : b
    );
    setBookings(updated);
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(updated));
    broadcastChange('BOOKINGS_UPDATED', updated);

    // Kirim notifikasi email otomatis penolakan jika mahasiswa mencantumkan email
    if (target?.requesterEmail) {
      sendRejectionEmail(target, reason).then((emailRes) => {
        if (emailRes.success) {
          console.log(`Email penolakan berhasil terkirim ke ${target.requesterEmail}`);
        } else if (!emailRes.skipped) {
          console.warn('Status pengiriman email:', emailRes.message);
        }
      });
    }

    return { success: true, target, hasEmail: Boolean(target?.requesterEmail) };
  }, [bookings, broadcastChange]);

  const updateBooking = useCallback(async (id, bookingData) => {
    const collision = checkCollision({ ...bookingData, id });
    if (collision.hasCollision) {
      return { success: false, message: collision.message };
    }

    const updatedBooking = {
      ...bookingData,
      id,
      updatedAt: new Date().toISOString(),
    };

    const updated = bookings.map((b) => (b.id === id ? updatedBooking : b));
    setBookings(updated);
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(updated));
    broadcastChange('BOOKINGS_UPDATED', updated);

    const client = getSupabaseClient();
    if (client) {
      try {
        const updatePayload = {
          day: updatedBooking.day,
          time_slot: updatedBooking.timeSlot,
          batch: updatedBooking.batch,
          note: updatedBooking.note,
          pic: updatedBooking.pic || '',
          updated_at: updatedBooking.updatedAt,
          status: updatedBooking.status || BOOKING_STATUS.APPROVED,
          room: updatedBooking.room || 'zoom',
        };
        let { error: uErr } = await client.from('bookings').update(updatePayload).eq('id', id);
        if (uErr && (uErr.message?.includes('room') || uErr.code === 'PGRST204')) {
          delete updatePayload.room;
          if (updatedBooking.room === 'gmeet') {
            updatePayload.reject_reason = '[ROOM:gmeet]';
          } else {
            updatePayload.reject_reason = '';
          }
          await client.from('bookings').update(updatePayload).eq('id', id);
        }
      } catch (e) {
        console.warn('Cloud sync error on updateBooking:', e);
      }
    }

    return { success: true };
  }, [bookings, checkCollision, broadcastChange]);

  const deleteBooking = useCallback(async (id) => {
    const updated = bookings.filter((b) => b.id !== id);
    setBookings(updated);
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(updated));
    broadcastChange('BOOKINGS_UPDATED', updated);

    // Sync to Supabase Cloud if connected
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('bookings').delete().eq('id', id);
      } catch (e) {
        console.warn('Cloud sync error on deleteBooking:', e);
      }
    }

    return { success: true };
  }, [bookings, broadcastChange]);

  const updateZoomConfigState = useCallback(async (newConfig) => {
    const updated = {
      ...zoomConfig,
      ...newConfig,
      gmeetUrl: (newConfig.gmeetUrl || zoomConfig.gmeetUrl || DEFAULT_ZOOM_CONFIG.gmeetUrl).trim(),
    };
    setZoomConfig(updated);
    localStorage.setItem(STORAGE_KEYS.ZOOM_CONFIG, JSON.stringify(updated));
    broadcastChange('CONFIG_UPDATED', updated);

    // Sync to Supabase Cloud if connected
    const client = getSupabaseClient();
    if (client) {
      try {
        const payload = {
          id: 1,
          name: updated.name,
          join_url: updated.joinUrl,
          meeting_id: updated.meetingId,
          passcode: updated.passcode,
          gmeet_url: updated.gmeetUrl,
          updated_at: new Date().toISOString(),
        };
        const { error } = await client.from('zoom_config').upsert(payload);
        if (error && error.message?.includes('gmeet_url')) {
          delete payload.gmeet_url;
          await client.from('zoom_config').upsert(payload);
        }
      } catch (e) {
        console.warn('Cloud sync error on updateZoomConfig:', e);
      }
    }
  }, [zoomConfig, broadcastChange]);

  const updateAdminPinState = useCallback(async (newPin) => {
    try {
      const hashed = await hashPin(newPin);
      setAdminPin(hashed);
      localStorage.setItem(STORAGE_KEYS.ADMIN_PIN, hashed);
    } catch (e) {
      console.warn('PIN hash error on update:', e);
    }
  }, []);

  const verifyAdminPin = useCallback(async (enteredPin) => {
    try {
      const hashed = await hashPin(enteredPin);
      return hashed === adminPin;
    } catch {
      return false;
    }
  }, [adminPin]);

  const resetToDefault = useCallback(() => {
    setBookings(INITIAL_BOOKINGS);
    setZoomConfig(DEFAULT_ZOOM_CONFIG);
    setAdminPin(DEFAULT_ADMIN_PIN);
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(INITIAL_BOOKINGS));
    localStorage.setItem(STORAGE_KEYS.ZOOM_CONFIG, JSON.stringify(DEFAULT_ZOOM_CONFIG));
    localStorage.setItem(STORAGE_KEYS.ADMIN_PIN, DEFAULT_ADMIN_PIN);
    broadcastChange('BOOKINGS_UPDATED', INITIAL_BOOKINGS);
    broadcastChange('CONFIG_UPDATED', DEFAULT_ZOOM_CONFIG);
  }, [broadcastChange]);

  const exportData = useCallback(() => {
    return JSON.stringify({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      bookings,
      zoomConfig,
    }, null, 2);
  }, [bookings, zoomConfig]);

  const importData = useCallback((jsonString) => {
    try {
      const data = JSON.parse(jsonString);
      if (data.bookings && Array.isArray(data.bookings)) {
        setBookings(data.bookings);
        localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(data.bookings));
        broadcastChange('BOOKINGS_UPDATED', data.bookings);
      }
      if (data.zoomConfig) {
        setZoomConfig(data.zoomConfig);
        localStorage.setItem(STORAGE_KEYS.ZOOM_CONFIG, JSON.stringify(data.zoomConfig));
        broadcastChange('CONFIG_UPDATED', data.zoomConfig);
      }
      return { success: true };
    } catch {
      return { success: false, message: 'Format file JSON tidak valid!' };
    }
  }, [broadcastChange]);

  // One-click function to upload current local data to Supabase Cloud
  const pushLocalToCloud = useCallback(async () => {
    const client = getSupabaseClient();
    if (!client) return { success: false, message: 'Supabase Cloud belum terhubung.' };

    try {
      setCloudStatus('connecting');

      // 1. Upsert zoom config
      const zoomPayload = {
        id: 1,
        name: zoomConfig.name,
        join_url: zoomConfig.joinUrl,
        meeting_id: zoomConfig.meetingId,
        passcode: zoomConfig.passcode,
        gmeet_url: zoomConfig.gmeetUrl || DEFAULT_ZOOM_CONFIG.gmeetUrl,
        updated_at: new Date().toISOString(),
      };
      let { error: zErr } = await client.from('zoom_config').upsert(zoomPayload);
      if (zErr && zErr.message?.includes('gmeet_url')) {
        delete zoomPayload.gmeet_url;
        await client.from('zoom_config').upsert(zoomPayload);
      }

      // 2. Upsert bookings
      if (bookings.length > 0) {
        let payload = bookings.map((b) => ({
          id: b.id,
          day: b.day,
          time_slot: b.timeSlot,
          batch: b.batch,
          note: b.note,
          pic: b.pic || '',
          updated_at: b.updatedAt || new Date().toISOString(),
          status: b.status || BOOKING_STATUS.APPROVED,
          requested_by: b.requestedBy || '',
          requester_email: b.requesterEmail || '',
          requested_at: b.requestedAt || null,
          approved_at: b.approvedAt || null,
          reject_reason: b.rejectReason || '',
          room: b.room || 'zoom',
        }));
        let { error: bErr } = await client.from('bookings').upsert(payload);
        if (bErr && (bErr.message?.includes('room') || bErr.code === 'PGRST204')) {
          payload = payload.map(item => {
            const copy = { ...item };
            delete copy.room;
            return copy;
          });
          const retry = await client.from('bookings').upsert(payload);
          bErr = retry.error;
        }
        if (bErr) throw bErr;
      }

      setCloudStatus('connected');
      setLastSyncTime(new Date());
      return { success: true, message: `Sukses menyinkronkan ${bookings.length} jadwal ke Supabase Cloud!` };
    } catch (err) {
      setCloudStatus('error');
      return { success: false, message: `Gagal sinkronisasi: ${err.message}` };
    }
  }, [bookings, zoomConfig]);

  const pendingBookings = bookings.filter(b => (b.status || BOOKING_STATUS.APPROVED) === BOOKING_STATUS.PENDING);

  return {
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
    updateZoomConfig: updateZoomConfigState,
    updateAdminPin: updateAdminPinState,
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
  };
}
