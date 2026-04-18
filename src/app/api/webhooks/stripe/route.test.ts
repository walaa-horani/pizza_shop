import { describe, it, expect, vi, beforeEach } from 'vitest';

const patchCommit = vi.fn().mockResolvedValue({});
const patchSet = vi.fn().mockReturnValue({ commit: patchCommit });
const patch = vi.fn().mockReturnValue({ set: patchSet });
const fetchDoc = vi.fn();

vi.mock('@/sanity/serverClient', () => ({
  getSanityWriteClient: () => ({ patch, fetch: fetchDoc }),
}));

const constructEvent = vi.fn();
vi.mock('@/lib/stripe/server', () => ({
  getStripe: () => ({ webhooks: { constructEvent } }),
}));

vi.mock('@/lib/env', () => ({
  getServerEnv: () => ({ STRIPE_WEBHOOK_SECRET: 'whsec' }),
  publicEnv: {},
}));

beforeEach(() => {
  patchCommit.mockClear();
  patchSet.mockClear();
  patch.mockClear();
  fetchDoc.mockReset();
  constructEvent.mockReset();
});

function makeReq(body: string, sig: string | null) {
  return new Request('http://x', {
    method: 'POST',
    body,
    headers: sig ? { 'stripe-signature': sig } : {},
  });
}

describe('POST /api/webhooks/stripe', () => {
  it('400 on missing signature', async () => {
    const { POST } = await import('./route');
    const res = await POST(makeReq('{}', null));
    expect(res.status).toBe(400);
  });

  it('400 on signature verification failure', async () => {
    constructEvent.mockImplementation(() => { throw new Error('bad sig'); });
    const { POST } = await import('./route');
    const res = await POST(makeReq('{}', 'sig'));
    expect(res.status).toBe(400);
  });

  it('marks order paid on checkout.session.completed', async () => {
    constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: { id: 'sess_1', payment_intent: 'pi_1' } },
    });
    fetchDoc.mockResolvedValue({ _id: 'order-1', status: 'pending' });
    const { POST } = await import('./route');
    const res = await POST(makeReq('{}', 'sig'));
    expect(res.status).toBe(200);
    expect(patch).toHaveBeenCalledWith('order-1');
    expect(patchSet).toHaveBeenCalledWith({ status: 'paid', stripePaymentIntentId: 'pi_1' });
  });

  it('is idempotent when already paid', async () => {
    constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: { id: 'sess_1', payment_intent: 'pi_1' } },
    });
    fetchDoc.mockResolvedValue({ _id: 'order-1', status: 'paid' });
    const { POST } = await import('./route');
    const res = await POST(makeReq('{}', 'sig'));
    expect(res.status).toBe(200);
    expect(patch).not.toHaveBeenCalled();
  });

  it('marks order failed on payment_intent.payment_failed', async () => {
    constructEvent.mockReturnValue({
      type: 'payment_intent.payment_failed',
      data: { object: { metadata: { sanityOrderId: 'order-2' } } },
    });
    fetchDoc.mockResolvedValue({ _id: 'order-2', status: 'pending' });
    const { POST } = await import('./route');
    const res = await POST(makeReq('{}', 'sig'));
    expect(res.status).toBe(200);
    expect(patchSet).toHaveBeenCalledWith({ status: 'failed' });
  });
});
