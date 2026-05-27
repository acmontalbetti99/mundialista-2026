/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bebas Neue"', 'Impact', 'sans-serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        pitch: {
          50: '#f0f9f4',
          100: '#dcf2e4',
          500: '#16a34a',
          600: '#15803d',
          700: '#14532d',
          900: '#052e16',
        },
        cup: {
          gold: '#f5b800',
          red: '#dc2626',
          blue: '#1e3a8a',
        },
        ink: {
          900: '#0a0a0a',
          800: '#171717',
          700: '#262626',
          600: '#404040',
          400: '#737373',
          200: '#e5e5e5',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(8px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
      },
    },
  },
  plugins: [],
};
