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
          50: '#fffef0',
          100: '#fffce6',
          200: '#fff8cc',
          300: '#fff2b3',
          400: '#ffec99',
          500: '#FFD300', // Electric Yellow
          600: '#e6bd00',
          700: '#cca700',
          800: '#b39100',
          900: '#997b00',
        },
        secondary: {
          50: '#f5f5f5',
          100: '#e5e5e5',
          200: '#cccccc',
          300: '#b3b3b3',
          400: '#999999',
          500: '#808080',
          600: '#666666',
          700: '#4d4d4d',
          800: '#333333',
          900: '#1A1A1A', // Cool Grey
        },
        accent: {
          blue: {
            50: '#f0f9ff',
            100: '#e0f2fe',
            500: '#0ea5e9', // Neon Blue
            600: '#0284c7',
            700: '#0369a1',
          },
          green: {
            50: '#f0fdf4',
            100: '#dcfce7',
            500: '#22c55e', // Neon Green
            600: '#16a34a',
            700: '#15803d',
          },
        },
        success: '#22c55e',
        warning: '#FFD300',
        error: '#ef4444',
        info: '#0ea5e9',
      },
      fontFamily: {
        'heading': ['Inter', 'Poppins', 'system-ui', 'sans-serif'],
        'body': ['Roboto', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '1': '0.25rem',
        '2': '0.5rem',
        '3': '0.75rem',
        '4': '1rem',
        '5': '1.25rem',
        '6': '1.5rem',
        '8': '2rem',
        '10': '2.5rem',
        '12': '3rem',
        '16': '4rem',
        '20': '5rem',
        '24': '6rem',
        '32': '8rem',
      },
    },
  },
  plugins: [],
}
