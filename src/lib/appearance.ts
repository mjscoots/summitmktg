/**
 * Pass 83 — Appearance. Reps knock doors in daylight, so the app has a Light
 * mode again. The preference lives on the profile (so it follows the rep across
 * devices) and is mirrored to localStorage so the first paint is right.
 */
export type AppearancePref = 'dark' | 'light' | 'system';
export type AppearanceMode = 'dark' | 'light';

const KEY = 'summit-appearance';

function read(): AppearancePref {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'dark' || v === 'light' || v === 'system') return v;
  } catch {
    /* private mode */
  }
  return 'dark';
}

let preference: AppearancePref = read();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

function systemMode(): AppearanceMode {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

if (typeof window !== 'undefined' && window.matchMedia) {
  const mq = window.matchMedia('(prefers-color-scheme: light)');
  const onChange = () => {
    if (preference === 'system') emit();
  };
  if (mq.addEventListener) mq.addEventListener('change', onChange);
  else mq.addListener(onChange);
}

export function getPreference(): AppearancePref {
  return preference;
}

export function resolveMode(pref: AppearancePref = preference): AppearanceMode {
  return pref === 'system' ? systemMode() : pref;
}

/** Sets the preference locally; callers persist it to the profile separately. */
export function setPreferenceLocal(next: AppearancePref) {
  if (next === preference) return;
  preference = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* private mode */
  }
  emit();
}

export function subscribeAppearance(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
