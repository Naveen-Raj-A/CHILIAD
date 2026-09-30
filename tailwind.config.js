/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: '#0e0e0e',
        sidebar: '#121212',
        surface: {
          DEFAULT: '#161616',
          raised: '#141414',
          input: '#111111',
          hover: '#1f1f1f',
        },
        edge: {
          DEFAULT: '#222222',
          strong: '#2a2a2a',
        },
        ink: {
          DEFAULT: '#ffffff',
          secondary: '#a1a1aa',  // zinc-400 - brighter for better readability
          muted: '#71717a',       // zinc-500 - much brighter than #555555
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Consolas',
          'monospace',
        ],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      // Heatmap needs a 100-column row at full width.
      gridTemplateColumns: {
        13: 'repeat(13, minmax(0, 1fr))',
        25: 'repeat(25, minmax(0, 1fr))',
        50: 'repeat(50, minmax(0, 1fr))',
        100: 'repeat(100, minmax(0, 1fr))',
      },
    },
  },
  plugins: [],
}

