import { describe, expect, it } from 'vitest';
import { stackText } from '@/pages/app/StacksPage';
import { stackLine } from '@/components/money/YourStacksCard';

/**
 * The board and the rep card only ever receive a stack value when the database
 * marked that rank, vertical and carrier confirmed. These assertions lock in
 * that an absent value renders the rank name with no number attached.
 */
describe('stack text hides unconfirmed values', () => {
  it('shows the rank name alone when no confirmed value came back', () => {
    expect(stackText({ rank_name: 'Rookie', stack_value: null })).toBe('Rookie');
    expect(
      stackLine({
        carrier_id: 'c',
        carrier_name: 'Sonic',
        vertical: 'Fiber',
        rank_name: 'Rookie',
        stack_value: null,
        stack_unit: null,
      })
    ).toBe('Rookie');
  });

  it('shows the value when one is confirmed', () => {
    expect(stackText({ rank_name: 'Rookie', stack_value: 120 })).toContain('120');
  });
});
