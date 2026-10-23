/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        chocolate: {
          50: '#FAF6F2',
          100: '#F3EAE2',
          200: '#E5D3C5',
          300: '#D2B6A1',
          400: '#B68E71',
          500: '#946648',
          600: '#754B33',
          700: '#5C3826',
          800: '#432619',
          900: '#2E1810',
          950: '#1A0C07',
        },
        caramel: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },
        brand: {
          50: '#FAF6F2',
          100: '#F3EAE2',
          200: '#E5D3C5',
          300: '#D2B6A1',
          400: '#B68E71',
          500: '#946648',
          600: '#754B33',
          700: '#5C3826',
          800: '#432619',
          900: '#2E1810',
        }
      }
    },
  },
  plugins: [],
}
