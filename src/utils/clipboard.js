/**
 * Robust cross-browser clipboard utility with automatic fallback
 * Works on localhost, custom domains (e-jadwal.test), HTTP, HTTPS, and mobile browsers
 */
export async function copyToClipboard(text) {
  if (!text) return false;

  const textToCopy = String(text).trim();

  // Method 1: Modern navigator.clipboard API (supported on HTTPS and localhost)
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(textToCopy);
      return true;
    } catch (err) {
      console.warn('navigator.clipboard.writeText failed, attempting execCommand fallback:', err);
    }
  }

  // Method 2: Document execCommand fallback (works on HTTP, e-jadwal.test, and older browsers)
  try {
    const textArea = document.createElement('textarea');
    textArea.value = textToCopy;
    
    // Prevent zooming and scrolling
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.style.opacity = '0.01';
    textArea.setAttribute('readonly', '');
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, textToCopy.length);

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    if (successful) {
      return true;
    }
  } catch (fallbackErr) {
    console.error('execCommand copy fallback failed:', fallbackErr);
  }

  return false;
}
