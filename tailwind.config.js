/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hkjc: {
          blue: '#002B66',
          navy: '#051937',
          gold: '#C5A059',
          yellow: '#FFCC00',
          dark: '#0a101d',
          card: '#0f172a',
          border: '#1e293b',
          turf: '#10562e',
          turfLight: '#1e824c',
          dirt: '#8B5A2B',
          dirtLight: '#A0522D',
        }
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Noto Sans TC"', '"PingFang HK"', '"Microsoft JhengHei"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
