/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FF5500',
          dark: '#D94400',
          light: '#FF7733',
        },
        navy: {
          DEFAULT: '#0B3C5D',
          dark: '#07263B',
          light: '#1D5A85',
        },
        charcoal: {
          DEFAULT: '#0F172A',
          light: '#1E293B',
          dark: '#020617',
        },
        surface: '#FFFFFF',
        canvas: '#F8FAFC',
        muted: '#64748B',
        borderline: '#E2E8F0',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
