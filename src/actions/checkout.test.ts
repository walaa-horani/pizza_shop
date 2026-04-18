import { describe, it, expect, vi, beforeEach } from 'vitest';

const sanityCreate = vi.fn().mockResolvedValue({ _id: 'order-123' });
const sanityFetch = vi.fn();
const sanityPatch = vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ commit: vi.fn().mockResolvedValue({}) }) });

vi.mock('@/sanity/serverClient', () => ({
  getSanityWriteClient: () => ({ create: sanityCreate, fetch: sanityFetch, patch: sanityPatch }),
}));

const stripeCreate = vi.fn().mockResolvedValue({ id: 'sess_1', url: 'https://stripe.test/s' });
vi.mock('@/lib/stripe/server', () => ({
  getStripe: () => ({ checkout: { sessions: { create: stripeCreate } } }),
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => ({ userId: null }),
  currentUser: async () => null,
}));

vi.mock('@/lib/env', () => ({
  publicEnv: { NEXT_PUBLIC_APP_URL: 'http://localhost:3000' },
  getServerEnv: () => ({ NEXT_PUBLIC_APP_URL: 'http://localhost:3000' }),
}));

// revalidatePath is imported from next/cache but we don't need it to do anything in tests
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const sampleItem = {
  lineId: 'l1',
  productId: 'p1',
  productSlug: 'margherita',
  productTitle: 'Margherita',
  imageUrl: 'https://x',
  basePrice: 1800,
  size: { name: 'Medium', priceModifier: 0 },
  crust: { name: 'Neapolitan', priceModifier: 0 },
  toppings: [],
  quantity: 1,
};

const validForm = {
  fullName: 'X',
  email: 'a@b.c',
  street: 's',
  city: 'c',
  postalCode: '1',
  deliverySpeed: 'standard' as const,
};

beforeEach(() => {
  sanityCreate.mockClear();
  sanityFetch.mockReset();
  sanityPatch.mockClear();
  stripeCreate.mockClear();
  sanityFetch.mockResolvedValue({
    _id: 'p1',
    title: 'Margherita',
    slug: 'margherita',
    basePrice: 1800,
    imageUrl: 'https://x',
    isActive: true,
  });
});

describe('checkout server action', () => {
  it('returns fieldErrors on invalid form', async () => {
    const { checkout } = await import('./checkout');
    const r = await checkout({ form: { ...validForm, email: 'bad' }, items: [sampleItem] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors?.email?.[0]).toBeTruthy();
  });

  it('rejects empty cart', async () => {
    const { checkout } = await import('./checkout');
    const r = await checkout({ form: validForm, items: [] });
    expect(r.ok).toBe(false);
  });

  it('creates Sanity order with pending status BEFORE Stripe call', async () => {
    const callOrder: string[] = [];
    sanityCreate.mockImplementationOnce(async (doc: any) => {
      callOrder.push('sanity.create');
      expect(doc.status).toBe('pending');
      return { _id: 'order-123' };
    });
    stripeCreate.mockImplementationOnce(async () => {
      callOrder.push('stripe.sessions.create');
      return { id: 'sess_1', url: 'https://stripe.test/s' };
    });
    const { checkout } = await import('./checkout');
    const r = await checkout({ form: validForm, items: [sampleItem] });
    expect(r.ok).toBe(true);
    expect(callOrder).toEqual(['sanity.create', 'stripe.sessions.create']);
  });

  it('returns Stripe URL on success', async () => {
    const { checkout } = await import('./checkout');
    const r = await checkout({ form: validForm, items: [sampleItem] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.url).toBe('https://stripe.test/s');
  });
});
