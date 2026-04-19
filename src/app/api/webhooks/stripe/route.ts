import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/server';
import { getSanityWriteClient } from '@/sanity/serverClient';
import { getServerEnv } from '@/lib/env';
import { readBodyWithLimit, BodyTooLargeError } from '@/lib/http/readBody';
import { rateLimit, clientKey, tooManyRequestsResponse } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  const rl = await rateLimit('stripeWebhook', clientKey(req));
  if (!rl.success) return tooManyRequestsResponse(rl);

  const signature = req.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'missing signature' }, { status: 400 });

  let rawBody: string;
  try {
    rawBody = await readBodyWithLimit(req);
  } catch (err) {
    if (err instanceof BodyTooLargeError) {
      return NextResponse.json({ error: 'payload too large' }, { status: 413 });
    }
    throw err;
  }
  const { STRIPE_WEBHOOK_SECRET } = getServerEnv();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('stripe webhook signature failed', err);
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  const write = getSanityWriteClient();

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const order = await write.fetch(
        `*[_type == "order" && stripeSessionId == $id][0] { _id, status }`,
        { id: session.id },
      );
      if (order && order.status === 'pending') {
        await write.patch(order._id)
          .set({
            status: 'paid',
            stripePaymentIntentId:
              typeof session.payment_intent === 'string'
                ? session.payment_intent
                : session.payment_intent?.id,
          })
          .commit();
      }
    } else if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object as Stripe.PaymentIntent;
      const orderId = pi.metadata?.sanityOrderId;
      if (orderId) {
        const order = await write.fetch(
          `*[_type == "order" && _id == $id][0] { _id, status }`,
          { id: orderId },
        );
        if (order && order.status === 'pending') {
          await write.patch(order._id).set({ status: 'failed' }).commit();
        }
      }
    } else {
      console.log('unhandled stripe event:', event.type);
    }
  } catch (err) {
    console.error('stripe webhook handler error', err);
    return NextResponse.json({ error: 'handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
