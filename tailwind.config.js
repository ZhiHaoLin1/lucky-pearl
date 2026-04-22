/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        cinzel: ['var(--font-cinzel)', 'serif'],
        cormorant: ['var(--font-cormorant)', 'serif'],
      },
      colors: {
        pearl: {
          50: '#fefefe',
          100: '#f8f6f0',
          200: '#ede8dc',
          300: '#ddd5c4',
          400: '#c8bca3',
          500: '#b5a285',
          DEFAULT: '#f0ebe0',
        },
        gold: {
          300: '#f5d882',
          400: '#f0c94d',
          500: '#e6b422',
          600: '#c99a14',
          700: '#a07a0a',
          DEFAULT: '#d4af37',
        },
        navy: {
          900: '#04060f',
          800: '#070c1a',
          700: '#0c1528',
          600: '#111f38',
          500: '#162847',
          DEFAULT: '#0a1020',
        },
        jade: '#1a6b4a',
        ruby: '#9b1c2e',
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #d4af37 0%, #f5d882 50%, #c99a14 100%)',
        'pearl-gradient': 'linear-gradient(135deg, #f0ebe0 0%, #fefefe 50%, #ddd5c4 100%)',
        'dark-gradient': 'linear-gradient(180deg, #04060f 0%, #070c1a 100%)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 3s linear infinite',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
        'spin-slow': 'spin 20s linear infinite',
        'twinkle': 'twinkle 4s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(212, 175, 55, 0.3)' },
          '50%': { boxShadow: '0 0 60px rgba(212, 175, 55, 0.7)' },
        },
        twinkle: {
          '0%, 100%': { opacity: '0.3', transform: 'scale(0.8)' },
          '50%': { opacity: '1', transform: 'scale(1.2)' },
        },
      },
    },
  },
  plugins: [],
};
