import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('@/lib/env', () => ({
  getServerEnv: () => ({
    RESEND_API_KEY: 'key',
    RESEND_FROM_EMAIL: 'shop@pizza.test',
    NEXT_PUBLIC_APP_URL: 'https://pizza.test',
  }),
  publicEnv: { NEXT_PUBLIC_APP_URL: 'https://pizza.test' },
}));

const batchSend = vi.fn();
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: vi.fn() },
    batch: { send: batchSend },
  })),
}));

beforeEach(() => {
  batchSend.mockReset();
});

describe('formatCents', () => {
  it('renders cents as a $ amount with two decimals', async () => {
    const { formatCents } = await import('./email');
    expect(formatCents(0)).toBe('$0.00');
    expect(formatCents(1800)).toBe('$18.00');
    expect(formatCents(1799)).toBe('$17.99');
  });
});

describe('applyDiscount', () => {
  it('returns the integer cents after subtracting the discount percent', async () => {
    const { applyDiscount } = await import('./email');
    expect(applyDiscount(1000, 20)).toBe(800);
    expect(applyDiscount(1799, 10)).toBe(1619); // 1619.1 rounded
    expect(applyDiscount(1000, 0)).toBe(1000);
    expect(applyDiscount(1000, 100)).toBe(0);
  });
});
