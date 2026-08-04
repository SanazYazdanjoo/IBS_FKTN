/** IBS Reimbursement design-system tokens mapped to Tailwind — consume semantic names only. */
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
        stroke: 'var(--stroke)',
        'course-bl': '#0e4c84',
        'course-pk': '#45818e',
        'ink-dim': 'var(--text-dim)',
        // Role palette — one role, one colour (never reuse a lane tone elsewhere)
        tn: "var(--tn)", 
  dozent: "var(--dozent)", 
  intern: "var(--intern)", 
  admin: "var(--admin)", 
  edoc: "var(--edoc)", 
  kst: "var(--kst)", 
  fin: "var(--fin)", 
  awo: "var(--awo)", 
  ekn: "var(--ekn)",
        // Note states — fill/ink pairs, never colour text alone
        'note-bg': 'var(--note-bg)',
        'note-ink': 'var(--note-ink)',
        'problem-bg': 'var(--problem-bg)',
        'problem-ink': 'var(--problem-ink)',
        'gate-bg': 'var(--gate-bg)',
        'gate-ink': 'var(--gate-ink)',
        'win-bg': 'var(--win-bg)',
        'win-ink': 'var(--win-ink)',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
        hand: ['Caveat', 'cursive'],
      },
      fontSize: {
        display: ['48px', { lineHeight: '0.98', fontWeight: '800' }],
        section: ['30px', { lineHeight: '1.1', fontWeight: '800' }],
        'step-title': ['17px', { lineHeight: '1.3', fontWeight: '700' }],
        annotation: ['21px', { lineHeight: '1.35' }],
      },
      letterSpacing: {
        label: '0.16em',
      },
      borderRadius: {
        note: '6px',
        card: '18px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(var(--shadow-color),0.08), 0 1px 3px rgba(var(--shadow-color),0.06)',
      },
      spacing: {
        section: '56px',
        page: '96px',
      },
    },
  },
  plugins: [],
};
