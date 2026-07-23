/* Ink & Bloom tokens (imported from the design-system export) + Tailwind */
@import './tokens.css';
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=DM+Sans:opsz,wght@9..40,300..700&family=Caveat:wght@500;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background: var(--bg);
  color: var(--text);
  font-family: 'DM Sans', sans-serif;
}
