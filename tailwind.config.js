/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        beacon: {
          red: '#DC2626',
          amber: '#F59E0B',
          green: '#16A34A',
          navy: '#0F172A',
          dark: '#020617',
        },
      },
    },
  },
  plugins: [],
}