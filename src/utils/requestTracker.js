// Helper untuk melacak pengajuan jadwal yang dikirim dari browser mahasiswa ini
const STORAGE_KEY = 'e_jadwal_my_requests';

export function getMyRequests() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading my requests from localStorage:', e);
    return [];
  }
}

export function saveMyRequest(booking) {
  try {
    const current = getMyRequests();
    // Filter jika ID sudah ada
    const filtered = current.filter(r => r.id !== booking.id);
    const newEntry = {
      id: booking.id,
      note: booking.note,
      day: booking.day,
      timeSlot: booking.timeSlot,
      batch: booking.batch,
      requestedBy: booking.requestedBy,
      requesterEmail: booking.requesterEmail || '',
      requestedAt: booking.requestedAt || new Date().toISOString(),
      lastNotifiedStatus: 'pending',
    };
    const updated = [newEntry, ...filtered].slice(0, 30); // Simpan 30 riwayat terakhir
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn('Error saving my request to localStorage:', e);
    return [];
  }
}

export function removeMyRequest(id) {
  try {
    const current = getMyRequests();
    const updated = current.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    return [];
  }
}

// Mengecek apakah ada pengajuan saya yang statusnya berubah (misal: disetujui atau ditolak)
export function checkStatusChanges(allBookings = [], onNotify) {
  try {
    const myRequests = getMyRequests();
    if (!myRequests.length || !allBookings.length) return;

    let hasChanges = false;
    const updatedRequests = myRequests.map(req => {
      const match = allBookings.find(b => b.id === req.id);
      if (!match) return req;

      const currentStatus = match.status || 'pending';
      const prevNotified = req.lastNotifiedStatus || 'pending';

      // Jika status berubah dari pending ke rejected atau approved
      if (prevNotified === 'pending' && currentStatus !== 'pending') {
        hasChanges = true;
        if (typeof onNotify === 'function') {
          onNotify({
            request: req,
            newStatus: currentStatus,
            rejectReason: match.rejectReason || '',
            approvedAt: match.approvedAt || null,
          });
        }
        return {
          ...req,
          lastNotifiedStatus: currentStatus,
        };
      }

      return req;
    });

    if (hasChanges) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRequests));
    }
  } catch (e) {
    console.warn('Error checking request status updates:', e);
  }
}
