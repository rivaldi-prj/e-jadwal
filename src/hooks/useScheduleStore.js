import { useState, useEffect, useCallback } from 'react';
import {
  TIME_SLOTS,
  INITIAL_BOOKINGS,
  DEFAULT_ZOOM_CONFIG,
  DEFAULT_ADMIN_PIN,
} from '../constants/scheduleConfig';
import {
  getSupabaseClient,
  isSupabaseConfigured,
} from '../utils/supabaseClient';

const STORAGE_KEYS = {
  BOOKINGS: 'zoom_scheduler_bookings_v2', // v2: Matriks bersih, hanya sesi perkuliahan yang aktif menggunakan Zoom
  ZOOM_CONFIG: 'zoom_scheduler_config_v1',
  ADMIN_PIN: 'zoom_scheduler_pin_v1',
};

const CHANNEL_NAME = 'zoom_schedule_channel';

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
      return saved || DEFAULT_ADMIN_PIN;
    } catch {
      return DEFAULT_ADMIN_PIN;
    }
  });

  const [isAdmin, setIsAdmin] = useState(false);
  const [cloudStatus, setCloudStatus] = useState(() => (isSupabaseConfigured() ? 'connecting' : 'disconnected'));
  const [lastSyncTime, setLastSyncTime] = useState(null);

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
      return;
    }

    setCloudStatus('connecting');
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
          const mapped = remoteBookings.map((b) => ({
            id: b.id,
            day: b.day,
            timeSlot: b.time_slot,
            batch: b.batch,
            note: b.note,
            pic: b.pic || '',
            updatedAt: b.updated_at,
          }));
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
                const newB = {
                  id: payload.new.id,
                  day: payload.new.day,
                  timeSlot: payload.new.time_slot,
                  batch: payload.new.batch,
                  note: payload.new.note,
                  pic: payload.new.pic || '',
                  updatedAt: payload.new.updated_at,
                };
                setBookings((prev) => {
                  if (prev.some((b) => b.id === newB.id)) return prev;
                  const next = [...prev, newB];
                  localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(next));
                  return next;
                });
              } else if (payload.eventType === 'UPDATE') {
                const updatedB = {
                  id: payload.new.id,
                  day: payload.new.day,
                  timeSlot: payload.new.time_slot,
                  batch: payload.new.batch,
                  note: payload.new.note,
                  pic: payload.new.pic || '',
                  updatedAt: payload.new.updated_at,
                };
                setBookings((prev) => {
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
        if (isMounted) setCloudStatus('error');
      }
    }

    initCloudSync();

    return () => {
      isMounted = false;
      if (subscriptionChannel && client) {
        client.removeChannel(subscriptionChannel);
      }
    };
  }, []);

  // Helper to check if two time slot labels overlap
  const checkSlotsOverlap = useCallback((slotLabelA, slotLabelB) => {
    if (slotLabelA === slotLabelB) return true;
    const minutesA = getSlotMinutes(slotLabelA);
    const minutesB = getSlotMinutes(slotLabelB);
    if (!minutesA || !minutesB) return false;
    return minutesA.start < minutesB.end && minutesA.end > minutesB.start;
  }, []);

  // Multi-Level Anti-Collision Engine (Dosen, Angkatan, & Ruang Zoom)
  const checkCollision = useCallback((booking) => {
    const targetMinutes = getSlotMinutes(booking.timeSlot);
    if (!targetMinutes) {
      return { hasCollision: true, type: 'INVALID_SLOT', message: 'Format slot waktu tidak valid.' };
    }

    const trimmedPic = (booking.pic || '').trim().toLowerCase();

    for (const existing of bookings) {
      // Ignore itself when updating
      if (booking.id && existing.id === booking.id) {
        continue;
      }

      // Only compare bookings on the same day
      if (existing.day !== booking.day) {
        continue;
      }

      // Check if time slots overlap
      const isTimeOverlap = checkSlotsOverlap(booking.timeSlot, existing.timeSlot);
      if (!isTimeOverlap) {
        continue;
      }

      // 1. Check Lecturer Conflict (Bentrok Dosen Pengajar)
      const existingPic = (existing.pic || '').trim().toLowerCase();
      if (trimmedPic && existingPic && trimmedPic === existingPic) {
        return {
          hasCollision: true,
          type: 'DOSEN_CONFLICT',
          existing,
          message: `Dosen "${existing.pic}" sudah memiliki jadwal mengajar di Angkatan ${existing.batch} (${existing.note || 'Perkuliahan'}) pada hari ${booking.day} pukul ${existing.timeSlot} WIB.`,
        };
      }

      // 2. Check Batch Conflict (Bentrok Angkatan Mahasiswa)
      if (booking.batch && existing.batch === booking.batch) {
        return {
          hasCollision: true,
          type: 'BATCH_CONFLICT',
          existing,
          message: `Angkatan ${booking.batch} sudah memiliki jadwal kuliah "${existing.note || 'Perkuliahan'}" pada hari ${booking.day} (${existing.timeSlot} WIB). Mahasiswa tidak dapat menghadiri dua sesi perkuliahan sekaligus.`,
        };
      }

      // 3. Check Room Conflict (Bentrok Ruang Zoom)
      return {
        hasCollision: true,
        type: 'ROOM_CONFLICT',
        existing,
        message: `Ruang Zoom pada hari ${booking.day} (${booking.timeSlot}) sudah digunakan oleh Angkatan ${existing.batch} (${existing.note || 'Kegiatan Perkuliahan'}). Satu akun Zoom bersama tidak dapat menjalankan dua meeting bersamaan.`,
      };
    }

    return { hasCollision: false };
  }, [bookings, checkSlotsOverlap]);

  // Real-time Lecturer Availability for a given day and slot
  const getLecturerAvailability = useCallback((day, timeSlot, excludeBookingId = null) => {
    const busyLecturers = {};

    for (const b of bookings) {
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

  // Actions
  const addBooking = useCallback(async (bookingData) => {
    const collision = checkCollision(bookingData);
    if (collision.hasCollision) {
      return { success: false, message: collision.message };
    }

    const newBooking = {
      ...bookingData,
      id: `b-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      updatedAt: new Date().toISOString(),
    };

    const updated = [...bookings, newBooking];
    setBookings(updated);
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(updated));
    broadcastChange('BOOKINGS_UPDATED', updated);

    // Sync to Supabase Cloud if connected
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('bookings').insert({
          id: newBooking.id,
          day: newBooking.day,
          time_slot: newBooking.timeSlot,
          batch: newBooking.batch,
          note: newBooking.note,
          pic: newBooking.pic || '',
          updated_at: newBooking.updatedAt,
        });
      } catch (e) {
        console.warn('Cloud sync error on addBooking:', e);
      }
    }

    return { success: true, booking: newBooking };
  }, [bookings, checkCollision, broadcastChange]);

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

    // Sync to Supabase Cloud if connected
    const client = getSupabaseClient();
    if (client) {
      try {
        await client
          .from('bookings')
          .update({
            day: updatedBooking.day,
            time_slot: updatedBooking.timeSlot,
            batch: updatedBooking.batch,
            note: updatedBooking.note,
            pic: updatedBooking.pic || '',
            updated_at: updatedBooking.updatedAt,
          })
          .eq('id', id);
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
    setZoomConfig(newConfig);
    localStorage.setItem(STORAGE_KEYS.ZOOM_CONFIG, JSON.stringify(newConfig));
    broadcastChange('CONFIG_UPDATED', newConfig);

    // Sync to Supabase Cloud if connected
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('zoom_config').upsert({
          id: 1,
          name: newConfig.name,
          join_url: newConfig.joinUrl,
          meeting_id: newConfig.meetingId,
          passcode: newConfig.passcode,
          updated_at: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Cloud sync error on updateZoomConfig:', e);
      }
    }
  }, [broadcastChange]);

  const updateAdminPinState = useCallback((newPin) => {
    setAdminPin(newPin);
    localStorage.setItem(STORAGE_KEYS.ADMIN_PIN, newPin);
  }, []);

  const verifyAdminPin = useCallback((enteredPin) => {
    return enteredPin === adminPin;
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
      await client.from('zoom_config').upsert({
        id: 1,
        name: zoomConfig.name,
        join_url: zoomConfig.joinUrl,
        meeting_id: zoomConfig.meetingId,
        passcode: zoomConfig.passcode,
        updated_at: new Date().toISOString(),
      });

      // 2. Upsert bookings
      if (bookings.length > 0) {
        const payload = bookings.map((b) => ({
          id: b.id,
          day: b.day,
          time_slot: b.timeSlot,
          batch: b.batch,
          note: b.note,
          pic: b.pic || '',
          updated_at: b.updatedAt || new Date().toISOString(),
        }));
        const { error: bErr } = await client.from('bookings').upsert(payload);
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

  return {
    bookings,
    zoomConfig,
    isAdmin,
    setIsAdmin,
    addBooking,
    updateBooking,
    deleteBooking,
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
  };
}
