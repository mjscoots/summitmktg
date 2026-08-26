import { useSyncExternalStore } from 'react';

/**
 * Tracks whether a chat composer input is focused and how far the on-screen
 * keyboard has pushed the visual viewport up. The bottom nav hides while the
 * composer is focused so the input is never covered, and the composer rides
 * above the keyboard using the measured offset.
 */
export interface ComposerKeyboardState {
  focused: boolean;
  offset: number;
}

let state: ComposerKeyboardState = { focused: false, offset: 0 };
const subscribers = new Set<() => void>();

function emit() {
  subscribers.forEach((fn) => fn());
}

export function setComposerKeyboard(next: Partial<ComposerKeyboardState>) {
  const merged = { ...state, ...next };
  if (merged.focused === state.focused && merged.offset === state.offset) return;
  state = merged;
  emit();
}

function subscribe(fn: () => void) {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

const getSnapshot = () => state;

export function useComposerKeyboard(): ComposerKeyboardState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Distance the keyboard covers at the bottom of the layout viewport. */
export function measureKeyboardOffset(): number {
  const vv = typeof window !== 'undefined' ? window.visualViewport : null;
  if (!vv) return 0;
  const covered = window.innerHeight - (vv.height + vv.offsetTop);
  return covered > 40 ? Math.round(covered) : 0;
}
