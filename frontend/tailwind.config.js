/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#F5C400',
          dark: '#D4A800',
          light: '#FFF4B8',
        },
        charcoal: {
          DEFAULT: '#1C1C1C',
          light: '#2D2D2D',
          dark: '#111111',
        },
        surface: '#FFFFFF',
        canvas: '#F7F7F5',
        muted: '#777777',
        borderline: '#E8E8E4',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
