# Summit design tokens

One system for the public site and the app. Every color, size, radius and
duration below is defined once in `src/index.css` and referenced everywhere
else. Nothing in a component should introduce a new value.

## Register

Dark, technical, institutional. One accent. No gradients, no glow, no neon,
no decorative blobs, no stock photos, no emoji, no exclamation marks, no
motivational copy. Sentence case. Tables and numbers are the hero.

## Color (6 named roles)

| Token | Value (HSL) | Use |
| --- | --- | --- |
| `--background` | `216 30% 5%` | Page surface |
| `--surface` / `--card` | `220 40% 10%` | Cards, tables, panels |
| `--surface-elevated` | `218 46% 14%` | Raised rows, hover, inputs on dark |
| `--border` | `217 44% 20%` | Every divider and outline |
| `--foreground` / `--text-primary` | `223 100% 97%` | Primary text and numbers |
| `--text-muted` | `217 25% 50%` | Secondary labels |
| `--primary` (accent) | `216 89% 53%` | The single accent — links, active state, ladder marker |

Support tokens: `--border-subtle`, `--border-strong`, `--text-secondary`,
`--primary-deep` (accent hover), `--destructive` (mandatory/errors only).
Red appears only for destructive or mandatory states.

## Type scale

12 / 14 / 16 / 20 / 24 / 32 / 48 px.

- Display face: Space Grotesk, used with restraint — page-level `h1` only.
- Body face: Inter, 15–16 px on phones so it reads without zoom.
- Weights: 400 body, 600 headings/labels, 700 page titles.
- Every number (money, counts, percentages, install totals) is tabular:
  `.stat-num`, `.stat-value`, and all `table` cells set
  `font-variant-numeric: tabular-nums`.
- Mobile inputs render at 16 px (no iOS zoom).

## Spacing

8 px grid: 4, 8, 16, 24, 32, 48, 64. Tailwind `1, 2, 4, 6, 8, 12, 16`.

## Radius and shadow

- `--radius: 0.5rem` — the only radius (pills are reserved for progress rails and badges).
- `--shadow: 0 1px 2px hsl(0 0% 0% / 0.4)` — the only shadow.

## Motion

- `--motion-fast: 120ms`, `--motion-base: 180ms`, `--motion-ease: cubic-bezier(0.2, 0, 0, 1)`.
- Only on state changes the person caused: industry toggle, ladder marker,
  picker deck, sweep card advance, sheet open/close.
- No scroll-triggered reveals, no parallax, no ambient loops.
- `prefers-reduced-motion: reduce` disables all of it.

## Touch and focus

44 px minimum control height, visible focus ring on every interactive
element, AA contrast on all text pairs, safe-area padding on fixed bars.
