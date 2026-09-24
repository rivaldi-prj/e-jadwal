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
        batch: {
          2022: {
            light: '#fef3c7',
            border: '#f59e0b',
            text: '#b45309',
            badge: '#d97706',
            glow: 'rgba(245, 158, 11, 0.25)',
          },
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
      animation: {
        'pulse-subtle': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      }
    },
  },
  plugins: [],
}
