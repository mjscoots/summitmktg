import { expect, test } from 'bun:test';
import { formDefaults, restoreAnswers, STORAGE_KEYS, PILLARS } from '../../data/portal/oneOnOnes';
import { isManagerOrAbove } from '../roles';

test('week of defaults to Monday of the current local week, including Sunday', () => {
  expect(formDefaults('rep', '', new Date(2026, 10, 22, 23, 59)).weekOf).toBe('2026-11-16');
  expect(formDefaults('rep', '', new Date(2026, 10, 23, 0, 1)).weekOf).toBe('2026-11-23');
});

test('date defaults to today using the local calendar date', () => {
  expect(formDefaults('rep', '', new Date(2026, 10, 21, 0, 1)).date).toBe('2026-11-21');
});

test('manager and run by default to the signed-in full name', () => {
  expect(formDefaults('rep', 'Mathew Joyce').manager).toBe('Mathew Joyce');
  expect(formDefaults('pillar', 'Mathew Joyce').runBy).toBe('Mathew Joyce');
});

test('rep and pillar forms use their specified separate device storage keys', () => {
  expect(STORAGE_KEYS.rep).toBe('trnty.1on1.rep.v1');
  expect(STORAGE_KEYS.pillar).toBe('trnty.1on1.pillar.v1');
});

test('device restore preserves answers and intentionally cleared defaults', () => {
  const answers = restoreAnswers('rep', JSON.stringify({ manager: '', rep: 'Rep A', notes: 'First line\nSecond line' }), { manager: 'Manager A', date: '2026-11-21' });
  expect(answers.manager).toBe('');
  expect(answers.rep).toBe('Rep A');
  expect(answers.notes).toBe('First line\nSecond line');
  expect(answers.date).toBe('2026-11-21');
});

test('invalid device data falls back without losing defaults', () => {
  expect(restoreAnswers('pillar', '{invalid', { runBy: 'Manager A' })).toEqual({ runBy: 'Manager A' });
});

test('manager-only portal items use the required four roles, excluding other reps', () => {
  for (const role of ['manager', 'president', 'admin', 'owner']) expect(isManagerOrAbove(role)).toBe(true);
  for (const role of ['rookie', 'rep', 'recruiter', 'spectator', null, undefined]) expect(isManagerOrAbove(role)).toBe(false);
});

test('pillar selection contains exactly the five requested people', () => {
  expect([...PILLARS]).toEqual(['Gabe Brugellis (Bru)', 'Mathew Rubino (Bino)', 'Liam Gardner', 'Colton Joyce', 'Salvatore Viviano (Sal)']);
});