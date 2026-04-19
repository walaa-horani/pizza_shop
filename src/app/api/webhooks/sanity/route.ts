import { NextResponse } from 'next/server';
import { isValidSignature, SIGNATURE_HEADER_NAME } from '@sanity/webhook';
import { getSanityWriteClient } from '@/sanity/serverClient';
import { getServerEnv } from '@/lib/env';
import { getAllUserEmails } from '@/sanity/queries';
import { sendNewProductEmail, sendDiscountEmail } from '@/lib/email';

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
  const signature = req.headers.get(SIGNATURE_HEADER_NAME);
  if (!signature) {
    return NextResponse.json({ error: 'missing signature' }, { status: 401 });
  }

  const rawBody = await req.text();
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
      const recipients = await getAllUserEmails();
      await sendNewProductEmail({ product, recipients });
      await getSanityWriteClient()
        .patch(payload._id)
        .set({ announcedAt: new Date().toISOString() })
        .commit();
      return NextResponse.json({ received: true, action: 'new' });
    }

    if (discountPercent > 0 && discountPercent !== lastAnnounced) {
      const recipients = await getAllUserEmails();
      await sendDiscountEmail({ product, discountPercent, recipients });
      await getSanityWriteClient()
        .patch(payload._id)
        .set({ lastAnnouncedDiscountPercent: discountPercent })
        .commit();
      return NextResponse.json({ received: true, action: 'discount' });
    }

    return NextResponse.json({ received: true, action: 'noop' });
  } catch (err) {
    console.error('sanity webhook handler error', err);
    return NextResponse.json({ error: 'handler error' }, { status: 500 });
  }
}
