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
    timer,
    timerProgressBar: true,
    background: dark ? '#0f172a' : '#ffffff',
    color: dark ? '#f8fafc' : '#0f172a',
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
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

export default Swal;
