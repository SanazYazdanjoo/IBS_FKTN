/** Ink & Bloom tokens mapped to Tailwind — consume semantic names only. */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary)',
        'primary-600': 'var(--primary-600)',
        secondary: 'var(--secondary)',
        blush: 'var(--blush)',
        'blush-weak': 'var(--blush-weak)',
        highlight: 'var(--highlight)',
        'highlight-weak': 'var(--highlight-weak)',
        danger: 'var(--danger)',
        success: 'var(--success)',
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        muted: 'var(--muted)',
        line: 'var(--line)',
        ink: 'var(--text)',
        'course-bl': '#0e4c84',
        'course-pk': '#45818e',
        'ink-dim': 'var(--text-dim)',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
        hand: ['Caveat', 'cursive'],
      },
    },
  },
  plugins: [],
};
