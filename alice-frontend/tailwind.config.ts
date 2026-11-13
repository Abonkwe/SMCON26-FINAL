import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'primary-lavender': '#8979E9',
        'electric-lavender': '#9A73F5',
        'periwinkle-blue': '#AAADF2',
        'royal-indigo': '#585FB7',
        'midnight-navy': '#181B2A',
        'pure-white': '#FDFDFE',
        'cloud-gray': '#F0F1F5',
        'dark-slate': '#343752',
        'vivid-blue': '#2448EF',
        'orchid-pink': '#D168DF',
        'mint-green': '#34C399',
        // Semantic aliases
        'alice-canvas': '#F0F1F5',
        'alice-card': '#FDFDFE',
        'alice-navy': '#181B2A',
        'alice-indigo': '#585FB7',
        'alice-slate': '#343752',
        'alice-mint': '#34C399',
      },
      backgroundImage: {
        'alice-header-gradient': 'linear-gradient(135deg, #8980EA 0%, #AAADF2 50%, #9A73F5 100%)',
      },
      fontFamily: {
        sans: ['Inter', 'Manrope', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      screens: {
        'xs': '360px',
      },
      boxShadow: {
        'card': '0 2px 8px -1px rgba(24, 27, 42, 0.06), 0 1px 3px -1px rgba(24, 27, 42, 0.04)',
        'elevated': '0 10px 25px -5px rgba(24, 27, 42, 0.1), 0 8px 10px -6px rgba(24, 27, 42, 0.05)',
      },
    },
  },
  plugins: [],
};

export default config;

