import { expect, test } from 'bun:test';
import { canReadCapturedApplicants, capturedApplicationSubmitted } from '../capturedApplicants';

test('only the owner can read captured contacts', () => {
  expect(canReadCapturedApplicants('owner')).toBe(true);
  for (const role of ['admin', 'manager', 'president', 'recruiter', 'rookie', null]) {
    expect(canReadCapturedApplicants(role)).toBe(false);
  }
});

test('submitting marks a captured application submitted', () => {
  expect(capturedApplicationSubmitted({ apply_stage: 'submitting' })).toBe(true);
  expect(capturedApplicationSubmitted({ apply_stage: 'interests' })).toBe(false);
});

test('a linked final application marks the capture submitted', () => {
  expect(capturedApplicationSubmitted({ apply_stage: 'contact', application_id: 'final-application' })).toBe(true);
  expect(capturedApplicationSubmitted({ apply_stage: 'contact', application_id: null })).toBe(false);
});