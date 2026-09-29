/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        zinc: {
          750: '#2b2b33',
          850: '#1c1c21',
        },
        batch: {
          2023: {
            light: '#e0f2fe',
            border: '#0ea5e9',
            text: '#0369a1',
            badge: '#0284c7',
            glow: 'rgba(14, 165, 233, 0.25)',
          },
          2024: {
            light: '#f3e8ff',
            border: '#a855f7',
            text: '#7e22ce',
            badge: '#9333ea',
            glow: 'rgba(168, 85, 247, 0.25)',
          },
          2025: {
            light: '#dcfce7',
            border: '#10b981',
            text: '#047857',
            badge: '#059669',
            glow: 'rgba(16, 185, 129, 0.25)',
          },
          2026: {
            light: '#ffe4e6',
            border: '#f43f5e',
            text: '#be123c',
            badge: '#e11d48',
            glow: 'rgba(244, 63, 94, 0.25)',
          },
        }
      },
      keyframes: {
        modalBackdropIn: {
          '0%': { opacity: '0', backdropFilter: 'blur(0px)' },
          '100%': { opacity: '1', backdropFilter: 'blur(6px)' },
        },
        modalPopIn: {
          '0%': { opacity: '0', transform: 'scale(0.94) translateY(14px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        dropdownPopIn: {
          '0%': { opacity: '0', transform: 'scaleY(0.92) translateY(-6px)' },
          '100%': { opacity: '1', transform: 'scaleY(1) translateY(0)' },
        },
        toastSlideIn: {
          '0%': { opacity: '0', transform: 'translateX(30px) scale(0.95)' },
          '70%': { transform: 'translateX(-4px) scale(1.01)' },
          '100%': { opacity: '1', transform: 'translateX(0) scale(1)' },
        },
      },
      animation: {
        'pulse-subtle': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'backdrop-in': 'modalBackdropIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'modal-pop': 'modalPopIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'dropdown-pop': 'dropdownPopIn 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'toast-pop': 'toastSlideIn 0.32s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }
    },
  },
  plugins: [],
}
