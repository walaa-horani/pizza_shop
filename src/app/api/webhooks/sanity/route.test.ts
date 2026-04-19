import { describe, it, expect, vi, beforeEach } from 'vitest';

const patchCommit = vi.fn().mockResolvedValue({});
const patchSet = vi.fn().mockReturnValue({ commit: patchCommit });
const patch = vi.fn().mockReturnValue({ set: patchSet });

vi.mock('@/sanity/serverClient', () => ({
  getSanityWriteClient: () => ({ patch }),
}));

const sendNewProductEmail = vi.fn().mockResolvedValue(undefined);
const sendDiscountEmail = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/email', () => ({
  sendNewProductEmail,
  sendDiscountEmail,
}));

const getAllUserEmails = vi.fn();
vi.mock('@/sanity/queries', () => ({
  getAllUserEmails,
}));

const isValidSignature = vi.fn();
vi.mock('@sanity/webhook', () => ({
  isValidSignature,
  SIGNATURE_HEADER_NAME: 'sanity-webhook-signature',
}));

vi.mock('@/lib/env', () => ({
  getServerEnv: () => ({ SANITY_WEBHOOK_SECRET: 'whsec' }),
}));

beforeEach(() => {
  patchCommit.mockClear();
  patchSet.mockClear();
  patch.mockClear();
  sendNewProductEmail.mockClear();
  sendDiscountEmail.mockClear();
  getAllUserEmails.mockReset();
  isValidSignature.mockReset();
  getAllUserEmails.mockResolvedValue([{ email: 'a@t.test' }]);
});

function req(body: unknown, sig: string | null = 'good-sig') {
  return new Request('http://x/api/webhooks/sanity', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: sig ? { 'sanity-webhook-signature': sig } : {},
  });
}

const baseProduct = {
  _id: 'prod-1',
  _type: 'product',
  title: 'Margherita',
  slug: 'margherita',
  imageUrl: 'https://cdn.test/m.jpg',
  description: 'Classic.',
  basePrice: 1800,
  discountPercent: 0,
  isActive: true,
  announcedAt: null,
  lastAnnouncedDiscountPercent: null,
};

describe('POST /api/webhooks/sanity', () => {
  it('401 on missing signature', async () => {
    const { POST } = await import('./route');
    const res = await POST(req(baseProduct, null));
    expect(res.status).toBe(401);
    expect(sendNewProductEmail).not.toHaveBeenCalled();
  });

  it('401 on invalid signature', async () => {
    isValidSignature.mockResolvedValue(false);
    const { POST } = await import('./route');
    const res = await POST(req(baseProduct));
    expect(res.status).toBe(401);
  });

  it('new product (announcedAt null) sends new-product email and stamps announcedAt', async () => {
    isValidSignature.mockResolvedValue(true);
    const { POST } = await import('./route');
    const res = await POST(req(baseProduct));
    expect(res.status).toBe(200);
    expect(sendNewProductEmail).toHaveBeenCalledTimes(1);
    expect(sendDiscountEmail).not.toHaveBeenCalled();
    expect(patch).toHaveBeenCalledWith('prod-1');
    const setArg = patchSet.mock.calls[0][0] as { announcedAt: string };
    expect(typeof setArg.announcedAt).toBe('string');
    expect(new Date(setArg.announcedAt).toString()).not.toBe('Invalid Date');
  });

  it('discount change from 10 to 20 sends discount email and updates tracking', async () => {
    isValidSignature.mockResolvedValue(true);
    const { POST } = await import('./route');
    const res = await POST(
      req({
        ...baseProduct,
        announcedAt: '2026-01-01T00:00:00Z',
        discountPercent: 20,
        lastAnnouncedDiscountPercent: 10,
      }),
    );
    expect(res.status).toBe(200);
    expect(sendDiscountEmail).toHaveBeenCalledTimes(1);
    expect(sendDiscountEmail.mock.calls[0][0]).toMatchObject({ discountPercent: 20 });
    expect(sendNewProductEmail).not.toHaveBeenCalled();
    expect(patchSet).toHaveBeenCalledWith({ lastAnnouncedDiscountPercent: 20 });
  });

  it('same discount as last announced is a no-op', async () => {
    isValidSignature.mockResolvedValue(true);
    const { POST } = await import('./route');
    const res = await POST(
      req({
        ...baseProduct,
        announcedAt: '2026-01-01T00:00:00Z',
        discountPercent: 20,
        lastAnnouncedDiscountPercent: 20,
      }),
    );
    expect(res.status).toBe(200);
    expect(sendDiscountEmail).not.toHaveBeenCalled();
    expect(sendNewProductEmail).not.toHaveBeenCalled();
    expect(patch).not.toHaveBeenCalled();
  });

  it('discount of 0 with announcedAt set is a no-op (even if lastAnnounced was non-zero)', async () => {
    isValidSignature.mockResolvedValue(true);
    const { POST } = await import('./route');
    const res = await POST(
      req({
        ...baseProduct,
        announcedAt: '2026-01-01T00:00:00Z',
        discountPercent: 0,
        lastAnnouncedDiscountPercent: 20,
      }),
    );
    expect(res.status).toBe(200);
    expect(sendDiscountEmail).not.toHaveBeenCalled();
    expect(sendNewProductEmail).not.toHaveBeenCalled();
    expect(patch).not.toHaveBeenCalled();
  });

  it('inactive product is a no-op', async () => {
    isValidSignature.mockResolvedValue(true);
    const { POST } = await import('./route');
    const res = await POST(req({ ...baseProduct, isActive: false }));
    expect(res.status).toBe(200);
    expect(sendNewProductEmail).not.toHaveBeenCalled();
    expect(sendDiscountEmail).not.toHaveBeenCalled();
    expect(patch).not.toHaveBeenCalled();
  });

  it('returns 500 and does NOT send email when the Sanity patch fails', async () => {
    isValidSignature.mockResolvedValue(true);
    patchCommit.mockRejectedValueOnce(new Error('sanity down'));
    const { POST } = await import('./route');
    const res = await POST(req(baseProduct));
    expect(res.status).toBe(500);
    expect(sendNewProductEmail).not.toHaveBeenCalled();
    expect(sendDiscountEmail).not.toHaveBeenCalled();
  });

  it('400 on invalid JSON body', async () => {
    isValidSignature.mockResolvedValue(true);
    const r = new Request('http://x/api/webhooks/sanity', {
      method: 'POST',
      body: '{not-json',
      headers: { 'sanity-webhook-signature': 'sig' },
    });
    const { POST } = await import('./route');
    const res = await POST(r);
    expect(res.status).toBe(400);
  });

  it('noop when a required product field is missing', async () => {
    isValidSignature.mockResolvedValue(true);
    const { POST } = await import('./route');
    const res = await POST(
      req({ ...baseProduct, imageUrl: undefined }),
    );
    expect(res.status).toBe(200);
    expect(sendNewProductEmail).not.toHaveBeenCalled();
    expect(patch).not.toHaveBeenCalled();
  });
});
