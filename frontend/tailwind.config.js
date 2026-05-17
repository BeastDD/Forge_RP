/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'mandingo': {
          bg: '#0a0a0a',
          surface: '#111111',
          surface2: '#1a1a1a',
          gold: '#c5a46e',
          'gold-light': '#d4af37',
          crimson: '#8b0000',
          text: '#f5f5f5',
          muted: '#a1a1aa',
        }
      },
      fontFamily: {
        'display': ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
