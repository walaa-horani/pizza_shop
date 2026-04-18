'use server';

import { auth, currentUser } from '@clerk/nextjs/server';
import { checkoutPayloadSchema, type CheckoutPayload } from '@/lib/validation/checkout';
import { getSanityWriteClient } from '@/sanity/serverClient';
import { getStripe } from '@/lib/stripe/server';
import { summarize } from '@/lib/cart/pricing';
import { publicEnv } from '@/lib/env';

type ActionResult =
  | { ok: true; url: string }
  | { ok: false; fieldErrors?: Record<string, string[]>; formError?: string };

function orderNumber() {
  const d = new Date();
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `HRT-${ymd}-${rand}`;
}

export async function checkout(rawInput: unknown): Promise<ActionResult> {
  const parsed = checkoutPayloadSchema.safeParse(rawInput);
  if (!parsed.success) {
    // Surface errors keyed by form field name (not nested under "form") so the
    // client form can map errors directly to inputs. Top-level issues (e.g.
    // empty `items`) become `formError`.
    const fieldErrors: Record<string, string[]> = {};
    let formError: string | undefined;
    for (const issue of parsed.error.issues) {
      if (issue.path[0] === 'form' && typeof issue.path[1] === 'string') {
        const key = issue.path[1];
        (fieldErrors[key] ??= []).push(issue.message);
      } else if (issue.path[0] === 'items' || issue.path.length === 0) {
        formError ??= issue.message;
      } else {
        formError ??= issue.message;
      }
    }
    return { ok: false, fieldErrors, formError };
  }
  const payload: CheckoutPayload = parsed.data;

  const write = getSanityWriteClient();

  const priced = await Promise.all(
    payload.items.map(async (item) => {
      const product = await write.fetch(
        `*[_type == "product" && _id == $id && isActive == true][0] {
          _id, title, "slug": slug.current, basePrice, "imageUrl": image.asset->url
        }`,
        { id: item.productId },
      );
      if (!product) {
        return null;
      }
      const unit =
        product.basePrice +
        item.size.priceModifier +
        item.crust.priceModifier +
        item.toppings.reduce((acc, t) => acc + t.price, 0);
      return {
        item,
        product,
        unit,
        lineTotal: unit * item.quantity,
      };
    }),
  );

  if (priced.some((p) => p === null)) {
    return { ok: false, formError: 'One or more items are no longer available.' };
  }

  const pricedNonNull = priced as Array<NonNullable<(typeof priced)[number]>>;
  const summary = summarize(
    pricedNonNull.map((p) => ({ ...p.item, basePrice: p.product.basePrice })),
    payload.form.deliverySpeed,
  );

  const { userId } = await auth();
  let userRef: string | null = null;
  let buyerEmail = payload.form.email;
  if (userId) {
    const user = await currentUser();
    buyerEmail = user?.primaryEmailAddress?.emailAddress ?? buyerEmail;
    const existing = await write.fetch(
      `*[_type == "user" && clerkUserId == $id][0]._id`,
      { id: userId },
    );
    if (existing) {
      userRef = existing;
    } else {
      const created = await write.create({
        _type: 'user',
        clerkUserId: userId,
        email: buyerEmail,
        name: payload.form.fullName,
      });
      userRef = created._id;
    }
  }

  const order = await write.create({
    _type: 'order',
    orderNumber: orderNumber(),
    user: userRef ? { _type: 'reference', _ref: userRef } : undefined,
    guestEmail: userRef ? undefined : buyerEmail,
    items: pricedNonNull.map((p, idx) => ({
      _key: `line-${idx}`,
      _type: 'orderLine',
      productRef: { _type: 'reference', _ref: p.product._id },
      productSnapshot: {
        title: p.product.title,
        slug: p.product.slug,
        imageUrl: p.product.imageUrl,
        basePrice: p.product.basePrice,
      },
      size: p.item.size,
      crust: p.item.crust,
      toppings: p.item.toppings.map((t, ti) => ({ _key: `t-${ti}`, _type: 'toppingSnapshot', ...t })),
      specialInstructions: p.item.specialInstructions,
      quantity: p.item.quantity,
      lineTotal: p.lineTotal,
    })),
    shipping: {
      fullName: payload.form.fullName,
      street: payload.form.street,
      city: payload.form.city,
      postalCode: payload.form.postalCode,
    },
    deliverySpeed: payload.form.deliverySpeed,
    subtotal: summary.subtotal,
    taxes: summary.taxes,
    deliveryFee: summary.deliveryFee,
    discount: summary.discount,
    total: summary.total,
    currency: 'usd',
    status: 'pending',
    createdAt: new Date().toISOString(),
  });

  const stripe = getStripe();
  let session: Awaited<ReturnType<typeof stripe.checkout.sessions.create>>;
  try {
    session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        customer_email: buyerEmail,
        line_items: [
          ...pricedNonNull.map((p) => ({
            price_data: {
              currency: 'usd',
              product_data: { name: p.product.title, images: p.product.imageUrl ? [p.product.imageUrl] : [] },
              unit_amount: p.unit,
            },
            quantity: p.item.quantity,
          })),
          ...(summary.taxes > 0
            ? [{ price_data: { currency: 'usd', product_data: { name: 'Taxes & Fees' }, unit_amount: summary.taxes }, quantity: 1 }]
            : []),
          ...(summary.deliveryFee > 0
            ? [{ price_data: { currency: 'usd', product_data: { name: 'Express Delivery' }, unit_amount: summary.deliveryFee }, quantity: 1 }]
            : []),
        ],
        metadata: { sanityOrderId: order._id, discount: String(summary.discount) },
        success_url: `${publicEnv.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${publicEnv.NEXT_PUBLIC_APP_URL}/checkout`,
      },
      { idempotencyKey: `order-${order._id}` },
    );
  } catch (err) {
    await write
      .patch(order._id)
      .set({ status: 'failed' })
      .commit()
      .catch(() => {
        // Suppress secondary failure: primary error is more useful to surface.
      });
    return { ok: false, formError: 'Payment session could not be created. Please try again.' };
  }

  await write.patch(order._id).set({ stripeSessionId: session.id }).commit();
  if (!session.url) return { ok: false, formError: 'Stripe session missing URL' };
  return { ok: true, url: session.url };
}
