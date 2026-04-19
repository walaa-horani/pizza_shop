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
  Resend: vi.fn().mockImplementation(function (this: unknown) {
    return {
      emails: { send: vi.fn() },
      batch: { send: batchSend },
    };
  }),
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

const sampleProduct = {
  _id: 'prod-1',
  title: 'Margherita',
  slug: 'margherita',
  description: 'Classic tomato, mozzarella, basil.',
  imageUrl: 'https://cdn.test/margherita.jpg',
  basePrice: 1800,
};

describe('sendNewProductEmail', () => {
  it('chunks 250 recipients into three batch.send calls of 100/100/50', async () => {
    batchSend.mockResolvedValue({ data: {}, error: null });
    const recipients = Array.from({ length: 250 }, (_, i) => ({ email: `u${i}@t.test` }));

    const { sendNewProductEmail } = await import('./email');
    await sendNewProductEmail({ product: sampleProduct, recipients });

    expect(batchSend).toHaveBeenCalledTimes(3);
    expect((batchSend.mock.calls[0][0] as unknown[]).length).toBe(100);
    expect((batchSend.mock.calls[1][0] as unknown[]).length).toBe(100);
    expect((batchSend.mock.calls[2][0] as unknown[]).length).toBe(50);
  });

  it('uses RESEND_FROM_EMAIL and per-recipient `to`', async () => {
    batchSend.mockResolvedValue({ data: {}, error: null });
    const recipients = [{ email: 'a@t.test', name: 'A' }, { email: 'b@t.test' }];

    const { sendNewProductEmail } = await import('./email');
    await sendNewProductEmail({ product: sampleProduct, recipients });

    const payload = batchSend.mock.calls[0][0] as Array<{ from: string; to: string; subject: string; html: string; text: string }>;
    expect(payload).toHaveLength(2);
    expect(payload[0].from).toBe('shop@pizza.test');
    expect(payload[0].to).toBe('a@t.test');
    expect(payload[1].to).toBe('b@t.test');
    expect(payload[0].text).toContain('Order now:');
    expect(payload[0].subject).toContain('Margherita');
    expect(payload[0].html).toContain('NEW ON THE MENU');
    expect(payload[0].html).toContain('https://cdn.test/margherita.jpg');
    expect(payload[0].html).toContain('https://pizza.test/product/margherita');
  });

  it('logs and continues when a single batch rejects', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    batchSend
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ data: {}, error: null });

    const recipients = Array.from({ length: 150 }, (_, i) => ({ email: `u${i}@t.test` }));
    const { sendNewProductEmail } = await import('./email');
    await expect(
      sendNewProductEmail({ product: sampleProduct, recipients }),
    ).resolves.toBeUndefined();

    expect(batchSend).toHaveBeenCalledTimes(2);
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });

  it('no-ops on empty recipients', async () => {
    const { sendNewProductEmail } = await import('./email');
    await sendNewProductEmail({ product: sampleProduct, recipients: [] });
    expect(batchSend).not.toHaveBeenCalled();
  });

  it('escapes HTML-sensitive characters in product fields', async () => {
    batchSend.mockResolvedValue({ data: {}, error: null });
    const { sendNewProductEmail } = await import('./email');
    await sendNewProductEmail({
      product: {
        _id: 'prod-x',
        title: 'Evil <img src=x>',
        slug: 'evil',
        description: 'A & B',
        imageUrl: 'javascript:alert(1)',
        basePrice: 1000,
      },
      recipients: [{ email: 'a@t.test' }],
    });
    const payload = batchSend.mock.calls[0][0] as Array<{ html: string }>;
    // Raw <img src=x> must NOT appear (would be injected markup)
    expect(payload[0].html).not.toContain('<img src=x>');
    // Escaped form SHOULD appear
    expect(payload[0].html).toContain('Evil &lt;img src=x&gt;');
    // Ampersand escaped
    expect(payload[0].html).toContain('A &amp; B');
    // javascript: URL stripped from image src
    expect(payload[0].html).not.toContain('javascript:alert(1)');
  });
});

describe('sendDiscountEmail', () => {
  it('chunks recipients into batches of 100', async () => {
    batchSend.mockResolvedValue({ data: {}, error: null });
    const recipients = Array.from({ length: 120 }, (_, i) => ({ email: `u${i}@t.test` }));

    const { sendDiscountEmail } = await import('./email');
    await sendDiscountEmail({ product: sampleProduct, discountPercent: 25, recipients });

    expect(batchSend).toHaveBeenCalledTimes(2);
    expect((batchSend.mock.calls[0][0] as unknown[]).length).toBe(100);
    expect((batchSend.mock.calls[1][0] as unknown[]).length).toBe(20);
  });

  it('renders the original and discounted prices in the HTML', async () => {
    batchSend.mockResolvedValue({ data: {}, error: null });
    const recipients = [{ email: 'a@t.test' }];

    const { sendDiscountEmail } = await import('./email');
    await sendDiscountEmail({ product: sampleProduct, discountPercent: 20, recipients });

    const payload = batchSend.mock.calls[0][0] as Array<{ html: string; subject: string }>;
    expect(payload[0].subject).toContain('20%');
    expect(payload[0].subject).toContain('Margherita');
    // basePrice 1800 cents, 20% off -> 1440 cents
    expect(payload[0].html).toContain('$14.40');
    // original price struck through
    expect(payload[0].html).toContain('$18.00');
    expect(payload[0].html).toContain('20% OFF');
  });

  it('logs and continues when a single batch rejects', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    batchSend
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ data: {}, error: null });

    const recipients = Array.from({ length: 150 }, (_, i) => ({ email: `u${i}@t.test` }));
    const { sendDiscountEmail } = await import('./email');
    await expect(
      sendDiscountEmail({ product: sampleProduct, discountPercent: 20, recipients }),
    ).resolves.toBeUndefined();

    expect(batchSend).toHaveBeenCalledTimes(2);
    err.mockRestore();
  });

  it('no-ops on empty recipients', async () => {
    const { sendDiscountEmail } = await import('./email');
    await sendDiscountEmail({ product: sampleProduct, discountPercent: 20, recipients: [] });
    expect(batchSend).not.toHaveBeenCalled();
  });

  it('escapes product fields in the HTML', async () => {
    batchSend.mockResolvedValue({ data: {}, error: null });
    const { sendDiscountEmail } = await import('./email');
    await sendDiscountEmail({
      product: {
        _id: 'p',
        title: '<bad>',
        slug: 's',
        description: 'a & b',
        imageUrl: 'javascript:alert(1)',
        basePrice: 1000,
      },
      discountPercent: 10,
      recipients: [{ email: 'a@t.test' }],
    });
    const payload = batchSend.mock.calls[0][0] as Array<{ html: string }>;
    expect(payload[0].html).not.toContain('<bad>');
    expect(payload[0].html).toContain('&lt;bad&gt;');
    expect(payload[0].html).toContain('a &amp; b');
    expect(payload[0].html).not.toContain('javascript:alert(1)');
  });
});
