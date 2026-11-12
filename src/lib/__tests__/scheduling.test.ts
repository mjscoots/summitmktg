import { expect, mock, test } from 'bun:test';

// The booking path must survive a broken lookup, so the RPC is stubbed here
// before the scheduling module is loaded.
const rpc = mock(async (): Promise<never> => {
  throw new Error('network down');
});

mock.module('@/integrations/supabase/client', () => ({
  supabase: { rpc },
}));

const { SCHEDULING_FALLBACK, loadSchedulingUrl } = await import('../scheduling');

test('the known booking URL is the scheduling fallback', () => {
  expect(SCHEDULING_FALLBACK).toBe('https://calendly.com/mathewjoyce/sales-opportunity');
});

test('a thrown scheduling lookup still yields the booking URL', async () => {
  expect(await loadSchedulingUrl()).toBe(SCHEDULING_FALLBACK);
});

test('a rejected scheduling lookup still yields the booking URL', async () => {
  rpc.mockImplementation(async () => ({ data: null, error: { message: 'no permission' } }));
  expect(await loadSchedulingUrl()).toBe(SCHEDULING_FALLBACK);
});

test('a bare profile URL is not offered as a booking page', async () => {
  rpc.mockImplementation(async () => ({ data: 'https://calendly.com/mathewjoyce/', error: null }));
  expect(await loadSchedulingUrl()).toBe(SCHEDULING_FALLBACK);
});

test('a real booking page from the setting wins', async () => {
  rpc.mockImplementation(async () => ({
    data: 'https://calendly.com/mathewjoyce/other-slot',
    error: null,
  }));
  expect(await loadSchedulingUrl()).toBe('https://calendly.com/mathewjoyce/other-slot');
});
