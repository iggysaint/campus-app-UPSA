/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#0088CC',
        'primary-dark': '#006699',
        'primary-light': '#33A3D6',
      },
    },
  },
  plugins: [],
};
