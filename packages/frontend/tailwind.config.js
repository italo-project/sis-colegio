/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        gray: {
          50: '#f9fafb', // Fondo general
          100: '#f3f4f6',
          200: '#e5e7eb',
          500: '#6b7280',
          900: '#111827',
        }
      },
      boxShadow: {
        'apple': '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 0 3px rgba(0,0,0,0.02)',
        'apple-hover': '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
      },
    },
  },
  plugins: [],
};