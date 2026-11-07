/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        grab: {
          50: '#eefbf3',
          100: '#d7f6e3',
          200: '#b2edca',
          300: '#7ddda7',
          400: '#42c37e',
          500: '#00873e', // Refined tactical Grab Green
          600: '#007033',
          700: '#005829',
          800: '#044622',
          900: '#053a1e',
          dark: '#004d23',
        },
        asphalt: {
          800: '#141c2b',
          850: '#0f1722',
          900: '#0b0f17',
          950: '#070a10',
        },
      },
      fontFamily: {
        sans: ['var(--font-body)', 'sans-serif'],
        heading: ['var(--font-heading)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
};
