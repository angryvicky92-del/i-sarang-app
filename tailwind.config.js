/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#75BA57',
          light: '#A5D68E',
          dark: '#2D4C3B',
        },
        secondary: '#E3F2DF',
        accent: '#FCA311',
        background: '#F8FCF7',
        surface: '#FFFFFF',
        'text-main': '#2C352D',
        'text-muted': '#7A857B',
        border: '#E8ECE6',
      },
      boxShadow: {
        'premium': '0 4px 20px rgba(0, 0, 0, 0.05)',
        'premium-hover': '0 8px 30px rgba(117, 186, 87, 0.15)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
