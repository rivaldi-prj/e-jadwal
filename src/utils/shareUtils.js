import { DEFAULT_ZOOM_CONFIG } from '../constants/scheduleConfig.js';

/**
 * Menghasilkan teks rapi untuk dibagikan ke WhatsApp grup kelas/angkatan.
 */
export function getWhatsAppShareText(booking, zoomConfig = {}) {
  if (!booking) return '';

  const isGmeet2 = (booking.room || 'zoom') === 'gmeet2';
  const isGmeet1 = (booking.room || 'zoom') === 'gmeet';
  const resolvedGmeetUrl = isGmeet2
    ? (zoomConfig.gmeetUrl2 || DEFAULT_ZOOM_CONFIG.gmeetUrl2 || 'https://meet.google.com/ftf-cowm-irj')
    : (zoomConfig.gmeetUrl || DEFAULT_ZOOM_CONFIG.gmeetUrl || 'https://meet.google.com/kqe-reho-vbd');
  const resolvedZoomUrl = zoomConfig.joinUrl || DEFAULT_ZOOM_CONFIG.joinUrl;
  const meetingId = zoomConfig.meetingId || DEFAULT_ZOOM_CONFIG.meetingId;
  const passcode = zoomConfig.passcode || DEFAULT_ZOOM_CONFIG.passcode;

  if (isGmeet1 || isGmeet2) {
    const meetTitle = isGmeet2 ? 'Google Meet Ruang 2' : 'Google Meet Ruang 1';
    return (
      `*INFORMASI PERKULIAHAN FIKES*\n` +
      `----------------------------------------\n` +
      `📚 *Mata Kuliah:* ${booking.note || 'Kegiatan Perkuliahan'}\n` +
      `🎓 *Angkatan:* ${booking.batch || '-'}\n` +
      `🗓️ *Hari/Waktu:* ${booking.day || '-'}, ${booking.timeSlot || '-'} WIB\n` +
      `👩‍🏫 *Dosen Pengajar:* ${booking.pic || '-'}\n` +
      `📍 *Ruang Virtual:* ${meetTitle} (Alternatif Resmi)\n\n` +
      `🔗 *Link ${meetTitle}:*\n${resolvedGmeetUrl}\n\n` +
      `_Catatan: Ruang Zoom utama sedang digunakan sesi lain. Perkuliahan berjalan resmi melalui ${meetTitle}._\n` +
      `----------------------------------------\n` +
      `Semoga perkuliahan berjalan lancar!`
    );
  }

  return (
    `*INFORMASI PERKULIAHAN FIKES*\n` +
    `----------------------------------------\n` +
    `📚 *Mata Kuliah:* ${booking.note || 'Kegiatan Perkuliahan'}\n` +
    `🎓 *Angkatan:* ${booking.batch || '-'}\n` +
    `🗓️ *Hari/Waktu:* ${booking.day || '-'}, ${booking.timeSlot || '-'} WIB\n` +
    `👩‍🏫 *Dosen Pengajar:* ${booking.pic || '-'}\n` +
    `📍 *Ruang Virtual:* ${zoomConfig.name || 'ZOOM KEBIDANAN'}\n\n` +
    `🔗 *Link Zoom Meeting:*\n${resolvedZoomUrl}\n` +
    `🆔 *Meeting ID:* ${meetingId}\n` +
    `🔑 *Passcode:* ${passcode}\n\n` +
    `----------------------------------------\n` +
    `Mohon hadir 5 menit sebelum perkuliahan dimulai. Terima kasih!`
  );
}

/**
 * Menghasilkan tautan wa.me dengan teks terenkripsi URI.
 */
export function getWhatsAppShareUrl(booking, zoomConfig = {}) {
  const text = getWhatsAppShareText(booking, zoomConfig);
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}

/**
 * Membuka jendela WhatsApp web / aplikasi di tab baru.
 */
export function openWhatsAppShare(booking, zoomConfig = {}) {
  const url = getWhatsAppShareUrl(booking, zoomConfig);
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
