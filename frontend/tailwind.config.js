/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // MEDO SHIELD AI Medical Color Palette
        primary:    '#0a2342',   // Deep Navy
        secondary:  '#0d9488',   // Medical Teal
        accent:     '#10b981',   // Emerald Green
        gold:       '#f59e0b',   // Warm Gold
        coral:      '#ef4444',   // Alert Red
        lavender:   '#8b5cf6',   // Purple
        sky:        '#0ea5e9',   // Sky Blue
        light:      '#f0f9ff',   // Very Light Blue
        warm:       '#f8fafc',   // Off White
        dark:       '#0f172a',   // Near Black
        // Standard shorthands
        success:    '#10b981',
        warning:    '#f59e0b',
        error:      '#ef4444',
        info:       '#0ea5e9',
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'Segoe UI', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'card':      '0 2px 20px rgba(10,35,66,0.08)',
        'card-hover':'0 8px 40px rgba(10,35,66,0.16)',
        'glow-teal': '0 0 20px rgba(13,148,136,0.35)',
        'glow-blue': '0 0 20px rgba(10,35,66,0.35)',
        'inner-light':'inset 0 1px 0 rgba(255,255,255,0.15)',
      },
      backgroundImage: {
        'hero-gradient':     'linear-gradient(135deg, #0a2342 0%, #0d9488 100%)',
        'card-gradient':     'linear-gradient(145deg, #ffffff 0%, #f0f9ff 100%)',
        'teal-gradient':     'linear-gradient(135deg, #0d9488 0%, #10b981 100%)',
        'danger-gradient':   'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        'warning-gradient':  'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        'navy-gradient':     'linear-gradient(180deg, #0a2342 0%, #1e3a5f 100%)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      animation: {
        'fade-in':    'fadeIn 0.5s ease-in-out',
        'slide-up':   'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.4s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'float':      'float 3s ease-in-out infinite',
        'shimmer':    'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        slideDown: {
          '0%':   { transform: 'translateY(-16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',      opacity: '1' },
        },
        pulseGlow: {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(13,148,136,0.4)' },
          '50%':     { boxShadow: '0 0 20px 8px rgba(13,148,136,0)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%':     { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
