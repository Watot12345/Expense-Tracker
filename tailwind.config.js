/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./hooks/**/*.{js,jsx,ts,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        obsidian: {
          bg: '#090D16',
          card: '#111827',
          surface: '#1E293B',
          border: 'rgba(255, 255, 255, 0.08)',
          text: '#F8FAFC',
          muted: '#94A3B8',
        },
        studio: {
          bg: '#F8FAFC',
          card: '#FFFFFF',
          surface: '#F1F5F9',
          border: 'rgba(226, 232, 240, 0.8)',
          text: '#0F172A',
          muted: '#64748B',
        },
        brand: {
          primary: '#6366F1',
          accent: '#8B5CF6',
          emerald: '#10B981',
          rose: '#F43F5E',
          amber: '#F59E0B',
          cyan: '#06B6D4',
        }
      },
      fontFamily: {
        sans: ['PlusJakartaSans-Regular', 'Inter-Regular', 'sans-serif'],
        bold: ['PlusJakartaSans-Bold', 'Inter-Bold', 'sans-serif'],
        semi: ['PlusJakartaSans-SemiBold', 'Inter-SemiBold', 'sans-serif'],
        medium: ['PlusJakartaSans-Medium', 'Inter-Medium', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
