/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors
        'brand-primary': '#901c15',
        'brand-secondary': '#4C5454',
        'brand-neutral': '#F2F4F3',
        'brand-success': '#57A773',
        'brand-warning': '#F29E4C',
        
        // Extended palette
        primary: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#901c15',
          950: '#7f1d1d',
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#4C5454',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
        neutral: {
          50: '#F2F4F3',
          100: '#f7fafc',
          200: '#edf2f7',
          300: '#e2e8f0',
          400: '#cbd5e1',
          500: '#a0aec0',
          600: '#718096',
          700: '#4a5568',
          800: '#2d3748',
          900: '#1a202c',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#57A773',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#F29E4C',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        game: {
          'strikes': '#dc2626',
          'balls': '#F29E4C',
          'correct': '#57A773',
          'team-a': '#3b82f6',
          'team-b': '#8b5cf6',
        }
      },
      fontFamily: {
        'brand': ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'brand': '0 4px 6px -1px rgba(144, 28, 21, 0.1), 0 2px 4px -1px rgba(144, 28, 21, 0.06)',
        'brand-lg': '0 10px 15px -3px rgba(144, 28, 21, 0.1), 0 4px 6px -2px rgba(144, 28, 21, 0.05)',
      }
    },
  },
  plugins: [],
}
