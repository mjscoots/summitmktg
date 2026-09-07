export type CelebrationKind = 'sale' | 'install' | 'setup' | 'graduation';

/** Celebration hooks remain callable, but Pass 170 removes ornamental effects. */
export async function celebrate(_kind: CelebrationKind = 'sale') {
  return Promise.resolve();
}
