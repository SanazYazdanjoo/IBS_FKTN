/* ── Ink & Bloom color primitives (§2.1 of the source theme.css) ──
   Never use primitives in components; consume the semantic tokens below. */
:root{
  --color-white:#ffffff;
  --color-black:#000000;
  /* Ink — warm near-black, matches the hand-drawn doodles */
  --color-ink-900:#211d1c;
  --color-ink-600:#6b6560;
  --color-ink-300:#b9b4ad;
  /* Paper */
  --color-paper-100:#ebe9e1;
  --color-paper-200:#e0ddd2;
  /* Coral — the loud one */
  --color-coral-500:#e43d12;
  --color-coral-600:#b93110;
  --color-coral-400:#ff6a45;
  /* Rose — the whisper */
  --color-rose-500:#d6536d;
  --color-rose-600:#b03a53;
  --color-rose-400:#e87a90;
  /* Blush — tint only, never text */
  --color-blush-300:#ffa2b6;
  --color-blush-100:#ffe4ea;
  /* Gold — the highlighter */
  --color-gold-500:#efb11d;
  --color-gold-100:#fbe9bc;
  --color-gold-400:#f4c348;
  --color-print-primary:#a82b0b;
  --color-red-500:#ef4444;
  --color-green-500:#16a34a;
  /* Dark mode primitives — warm charcoal, not blue-black */
  --color-dark-bg:#171412;
  --color-dark-surface:#1e1b18;
  --color-dark-muted-surface:#262220;
  --color-dark-line:#34302c;
  --color-dark-text:#f2efea;
  --color-dark-text-muted:#c4beb6;
}
/* ── Semantic tokens (§2.2) — what components actually use ── */
:root{
  --primary:var(--color-coral-500);
  --primary-600:var(--color-coral-600);
  --accent:var(--primary);
  --secondary:var(--color-rose-500);
  --secondary-600:var(--color-rose-600);
  --blush:var(--color-blush-300);
  --blush-weak:var(--color-blush-100);
  --highlight:var(--color-gold-500);
  --highlight-weak:var(--color-gold-100);
  --print-primary:var(--color-print-primary);
  --peach:var(--color-blush-100);
  --gold:var(--color-gold-500);
  --accent-weak:var(--color-blush-100);
  --danger:var(--color-red-500);
  --success:var(--color-green-500);
  --bg:var(--color-white);
  --surface:var(--color-white);
  --muted:var(--color-paper-100);
  --muted-surface:var(--color-paper-100);
  --border:rgba(33,29,28,0.12);
  --line:var(--color-paper-200);
  --text:var(--color-ink-900);
  --text-display:var(--color-ink-900);
  --text-dim:var(--color-ink-600);
  --text-muted:var(--color-ink-600);
}
/* Opt-in dark theme (source site: darkMode ["class", '[data-theme="dark"]']) */
[data-theme="dark"]{
  --primary:var(--color-coral-400);
  --primary-600:var(--color-coral-400);
  --accent:var(--color-coral-400);
  --secondary:var(--color-rose-400);
  --secondary-600:var(--color-rose-400);
  --blush-weak:rgba(232,122,144,0.14);
  --highlight:var(--color-gold-400);
  --highlight-weak:rgba(244,195,72,0.16);
  --peach:rgba(232,122,144,0.14);
  --bg:var(--color-dark-bg);
  --surface:var(--color-dark-surface);
  --muted:var(--color-dark-muted-surface);
  --muted-surface:var(--color-dark-muted-surface);
  --line:var(--color-dark-line);
  --border:rgba(242,239,234,0.14);
  --text:var(--color-dark-text);
  --text-display:var(--color-white);
  --text-muted:var(--color-dark-text-muted);
  --text-dim:var(--color-dark-text-muted);
}
