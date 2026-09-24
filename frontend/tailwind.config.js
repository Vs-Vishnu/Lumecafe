/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          light: '#F0FDF4', // Light green
          DEFAULT: '#10B981', // Emerald green (main brand color)
          dark: '#047857',
        },
        accent: {
          light: '#FEF3C7', // Amber light
          DEFAULT: '#F59E0B', // Orange/Amber
          dark: '#D97706',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
