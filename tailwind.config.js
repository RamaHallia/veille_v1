/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        coral: {
          400: '#ff8a73',
          500: '#ff6b52',
          600: '#ff5a42',
        },
        peach: {
          50: '#fff5f0',
          100: '#ffe5d9',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
