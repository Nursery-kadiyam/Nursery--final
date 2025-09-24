// Tailwind CSS Configuration Fix for Vercel Deployment
// Add this to your tailwind.config.js to ensure all classes are included

module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        emerald: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        gold: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        }
      },
      fontFamily: {
        'montserrat': ['Montserrat', 'sans-serif'],
        'lora': ['Lora', 'serif'],
      },
      spacing: {
        '1.5': '0.375rem',
        '2.5': '0.625rem',
        '3.5': '0.875rem',
      }
    },
  },
  plugins: [],
  // Ensure all classes are included in production
  safelist: [
    'mx-1',
    'px-3',
    'py-2',
    'hover:bg-emerald-50',
    'bg-gold-50',
    'text-gold-600',
    'text-emerald-700',
    'hover:text-gold-600',
    'rounded-full',
    'px-1.5',
    'py-0.5',
    'ml-1'
  ]
}