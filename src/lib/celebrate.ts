/**
 * One short burst of confetti for a real win: a logged sale, a logged install,
 * a completed setup step, a rookie graduating. Loaded on demand so the library
 * never lands in the first paint, and skipped when the device asks for
 * reduced motion.
 */
export type CelebrationKind = 'sale' | 'install' | 'setup' | 'graduation';

function accent(): string[] {
  const styles = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => {
    const raw = styles.getPropertyValue(name).trim();
    return raw ? `hsl(${raw})` : fallback;
  };
  return [
    read('--workspace-accent', '#5AD1FF'),
    read('--primary', '#5AD1FF'),
    '#FFFFFF',
  ];
}

export async function celebrate(kind: CelebrationKind = 'sale') {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  try {
    const { default: confetti } = await import('canvas-confetti');
    const particles = kind === 'graduation' ? 90 : 55;
    confetti({
      particleCount: particles,
      spread: kind === 'graduation' ? 80 : 62,
      startVelocity: 34,
      gravity: 1.1,
      ticks: 140,
      scalar: 0.9,
      origin: { x: 0.5, y: 0.72 },
      colors: accent(),
      disableForReducedMotion: true,
    });
  } catch {
    // Celebration is decoration: never block the action that earned it.
  }
}
