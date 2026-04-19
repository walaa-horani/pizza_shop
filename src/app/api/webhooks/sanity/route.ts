import { NextResponse } from 'next/server';
import { isValidSignature, SIGNATURE_HEADER_NAME } from '@sanity/webhook';
import { getSanityWriteClient } from '@/sanity/serverClient';
import { getServerEnv } from '@/lib/env';
import { getAllUserEmails } from '@/sanity/queries';
import { sendNewProductEmail, sendDiscountEmail } from '@/lib/email';
import { readBodyWithLimit, BodyTooLargeError } from '@/lib/http/readBody';
import { rateLimit, clientKey, tooManyRequestsResponse } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ProductWebhookPayload = {
  _id: string;
  _type: string;
  title: string;
  slug: string;
  description: string;
  imageUrl: string;
  basePrice: number;
  discountPercent?: number | null;
  isActive?: boolean | null;
  announcedAt?: string | null;
  lastAnnouncedDiscountPercent?: number | null;
};

export async function POST(req: Request): Promise<Response> {
  const rl = await rateLimit('sanityWebhook', clientKey(req));
  if (!rl.success) return tooManyRequestsResponse(rl);

  const signature = req.headers.get(SIGNATURE_HEADER_NAME);
  if (!signature) {
    return NextResponse.json({ error: 'missing signature' }, { status: 401 });
  }

  let rawBody: string;
  try {
    rawBody = await readBodyWithLimit(req);
  } catch (err) {
    if (err instanceof BodyTooLargeError) {
      return NextResponse.json({ error: 'payload too large' }, { status: 413 });
    }
    throw err;
  }
  const { SANITY_WEBHOOK_SECRET } = getServerEnv();

  const ok = await isValidSignature(rawBody, signature, SANITY_WEBHOOK_SECRET);
  if (!ok) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  let payload: ProductWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  if (payload._type !== 'product' || payload.isActive === false) {
    return NextResponse.json({ received: true, action: 'noop' });
  }

  // Reject payloads that are missing fields the templates depend on.
  // Sanity's schema usually enforces these at publish time, but guarding
  // here prevents broken-on-arrival blasts if a draft is published early.
  if (!payload.title || !payload.slug || !payload.description || !payload.imageUrl || typeof payload.basePrice !== 'number') {
    return NextResponse.json({ received: true, action: 'noop' });
  }

  const product = {
    _id: payload._id,
    title: payload.title,
    slug: payload.slug,
    description: payload.description,
    imageUrl: payload.imageUrl,
    basePrice: payload.basePrice,
  };

  const discountPercent = payload.discountPercent ?? 0;
  const announcedAt = payload.announcedAt ?? null;
  const lastAnnounced = payload.lastAnnouncedDiscountPercent ?? null;

  try {
    if (!announcedAt) {
      // Claim the send by stamping announcedAt FIRST. If the stamp fails,
      // we 500 and Sanity retries — safe because no email has gone out yet.
      // If emails fail after stamping, we log and swallow per-chunk inside
      // the sender; a retry will hit the `announcedAt` branch as no-op.
      await getSanityWriteClient()
        .patch(payload._id)
        .set({ announcedAt: new Date().toISOString() })
        .commit();
      const recipients = await getAllUserEmails();
      await sendNewProductEmail({ product, recipients });
      return NextResponse.json({ received: true, action: 'new' });
    }

    if (discountPercent > 0 && discountPercent !== lastAnnounced) {
      await getSanityWriteClient()
        .patch(payload._id)
        .set({ lastAnnouncedDiscountPercent: discountPercent })
        .commit();
      const recipients = await getAllUserEmails();
      await sendDiscountEmail({ product, discountPercent, recipients });
      return NextResponse.json({ received: true, action: 'discount' });
    }

    return NextResponse.json({ received: true, action: 'noop' });
  } catch (err) {
    console.error('sanity webhook handler error', err);
    return NextResponse.json({ error: 'handler error' }, { status: 500 });
  }
}
