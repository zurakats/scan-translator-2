/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-dark': '#1E1E1E',
        'brand-blue': '#267BFA',
        'brand-blue-hover': '#0043a8',
      },
      fontFamily: {
        winky: ['WinkyRough', 'sans-serif'],
        trade: ['TradeWinds', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
