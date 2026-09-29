import Swal from 'sweetalert2';

// Helper to check dark mode state
const isDark = () => document.documentElement.classList.contains('dark');

/**
 * Modern SweetAlert2 Toast Notification
 * @param {Object} options
 * @param {'success'|'error'|'warning'|'info'} [options.icon]
 * @param {'success'|'error'|'warning'|'info'} [options.type]
 * @param {string} options.title
 * @param {string} [options.message]
 * @param {number} [options.timer]
 */
export const showToast = ({ icon, type, title, message, timer = 2800 }) => {
  const dark = isDark();
  const chosenIcon = icon || type || 'success';

  return Swal.fire({
    toast: true,
    position: 'top-end',
    icon: chosenIcon,
    title: title || '',
    text: message || '',
    showConfirmButton: false,
    showCloseButton: true,
    timer,
    timerProgressBar: true,
    background: dark ? '#0f172a' : '#ffffff',
    color: dark ? '#f8fafc' : '#0f172a',
    customClass: {
      popup: 'swal2-custom-toast',
    },
  });
};

/**
 * SweetAlert2 Confirmation Modal
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.text
 * @param {'warning'|'question'|'info'|'error'} [options.icon]
 * @param {string} [options.confirmButtonText]
 * @param {string} [options.cancelButtonText]
 * @param {boolean} [options.isDanger]
 * @returns {Promise<boolean>}
 */
export const showConfirmDialog = async ({
  title,
  text,
  icon = 'warning',
  confirmButtonText = 'Ya, Lanjutkan',
  cancelButtonText = 'Batal',
  isDanger = false,
}) => {
  const dark = isDark();

  const result = await Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true,
    background: dark ? '#0f172a' : '#ffffff',
    color: dark ? '#f8fafc' : '#0f172a',
    confirmButtonColor: isDanger ? '#e11d48' : '#2563eb',
    cancelButtonColor: dark ? '#334155' : '#94a3b8',
    customClass: {
      popup: 'swal2-modal-card',
      confirmButton: 'swal2-btn-confirm',
      cancelButton: 'swal2-btn-cancel',
    },
  });

  return result.isConfirmed;
};

/**
 * SweetAlert2 Informational Alert
 */
export const showAlert = ({ title, text, icon = 'info', confirmButtonText = 'Mengerti' }) => {
  const dark = isDark();

  return Swal.fire({
    title,
    text,
    icon,
    confirmButtonText,
    background: dark ? '#0f172a' : '#ffffff',
    color: dark ? '#f8fafc' : '#0f172a',
    confirmButtonColor: '#2563eb',
    customClass: {
      popup: 'swal2-modal-card',
    },
  });
};

/**
 * SweetAlert2 Notification for Rejected Booking Request
 */
export const showRejectionAlert = ({ note, day, timeSlot, rejectReason }) => {
  const dark = isDark();

  return Swal.fire({
    title: 'Pengajuan Jadwal Ditolak',
    html: `
      <div style="text-align: left; font-size: 13px; line-height: 1.6;">
        <p style="margin-bottom: 8px;">
          Pengajuan jadwal untuk <strong>${note || 'Perkuliahan'}</strong> (${day}, ${timeSlot} WIB) telah ditolak oleh Admin.
        </p>
        <div style="background: ${dark ? '#271216' : '#fff1f2'}; border: 1px solid ${dark ? '#4c1d24' : '#fecdd3'}; border-radius: 8px; padding: 12px; margin-top: 10px;">
          <strong style="color: ${dark ? '#fda4af' : '#be123c'}; display: block; margin-bottom: 4px;">Alasan dari Admin:</strong>
          <span style="color: ${dark ? '#fecdd3' : '#881337'};">"${rejectReason || 'Waktu perkuliahan tidak tersedia atau terdapat agenda lain pada jam tersebut.'}"</span>
        </div>
        <p style="margin-top: 10px; font-size: 12px; color: ${dark ? '#94a3b8' : '#64748b'};">
          💡 Anda dapat mengajukan kembali pada jam atau hari lain yang masih kosong.
        </p>
      </div>
    `,
    icon: 'error',
    confirmButtonText: 'Saya Mengerti',
    confirmButtonColor: '#e11d48',
    background: dark ? '#0f172a' : '#ffffff',
    color: dark ? '#f8fafc' : '#0f172a',
    customClass: {
      popup: 'swal2-modal-card',
    },
  });
};

export default Swal;
