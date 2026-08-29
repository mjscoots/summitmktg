/**
 * Appearance. The app follows the phone by default: System resolves to the
 * device colour scheme, and the rep can still pin Dark or Light. The choice
 * lives on the profile (so it follows the rep across devices) and is mirrored
 * to localStorage so the first paint is right.
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
  // A brand new visitor follows their phone.
  return 'system';
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

/**
 * Marks the resolved mode on <html> so token overrides and the compatibility
 * rules apply on every page, including the public cover and login.
 */
function applyRoot() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const mode = resolveMode();
  root.dataset.appearance = mode;
  root.classList.toggle('light-appearance', mode === 'light');
  root.classList.toggle('light-workspace', mode === 'light');
  root.classList.toggle('dark', mode === 'dark');
  root.classList.toggle('light', mode === 'light');
}

if (typeof window !== 'undefined' && window.matchMedia) {
  const mq = window.matchMedia('(prefers-color-scheme: light)');
  const onChange = () => {
    if (preference === 'system') {
      applyRoot();
      emit();
    }
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
  applyRoot();
  emit();
}

export function subscribeAppearance(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// First paint follows the resolved mode.
applyRoot();
