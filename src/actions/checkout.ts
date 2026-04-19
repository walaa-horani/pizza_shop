'use server';

import { headers } from 'next/headers';
import { auth, currentUser } from '@clerk/nextjs/server';
import { checkoutPayloadSchema, type CheckoutPayload } from '@/lib/validation/checkout';
import { getSanityWriteClient } from '@/sanity/serverClient';
import { getStripe } from '@/lib/stripe/server';
import { summarize } from '@/lib/cart/pricing';
import { publicEnv } from '@/lib/env';
import { rateLimit } from '@/lib/rate-limit';

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
  // Rate-limit before any parse/DB work. Key by Clerk user id when signed in,
  // otherwise by client IP so a single guest / script cannot flood the action.
  const { userId: rlUserId } = await auth();
  let rlKey = rlUserId ? `u:${rlUserId}` : '';
  if (!rlKey) {
    const h = await headers();
    const xff = h.get('x-forwarded-for');
    const ip = xff ? xff.split(',')[0]!.trim() : (h.get('x-real-ip') ?? 'unknown');
    rlKey = `ip:${ip}`;
  }
  const rl = await rateLimit('checkoutAction', rlKey);
  if (!rl.success) {
    return { ok: false, formError: 'Too many checkout attempts. Please wait a moment and try again.' };
  }

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
          _id, title, "slug": slug.current, basePrice, "imageUrl": image.asset->url,
          sizes,
          crustOptions,
          "availableToppings": availableToppings[]-> { "slug": slug.current, title, price }
        }`,
        { id: item.productId },
      );
      if (!product) {
        return null;
      }
      // Reconcile every chosen option against the current product document.
      const serverSize = (product.sizes as Array<{ name: string; priceModifier: number }> | undefined)
        ?.find((s) => s.name === item.size.name);
      if (!serverSize) return null;

      const serverCrust = item.crust.name
        ? (product.crustOptions as Array<{ name: string; priceModifier: number }> | undefined)
            ?.find((c) => c.name === item.crust.name)
        : undefined;
      // Crust is optional on the product but if the item claims one, it must match.
      if (item.crust.name && !serverCrust) return null;

      const serverToppings: Array<{ slug: string; title: string; price: number }> = [];
      for (const chosen of item.toppings) {
        const match = (product.availableToppings as Array<{ slug: string; title: string; price: number }>)
          ?.find((t) => t.slug === chosen.slug);
        if (!match) return null;
        serverToppings.push(match);
      }

      const unit =
        product.basePrice +
        serverSize.priceModifier +
        (serverCrust?.priceModifier ?? 0) +
        serverToppings.reduce((acc, t) => acc + t.price, 0);
      return {
        item,
        product,
        unit,
        lineTotal: unit * item.quantity,
        serverSize,
        serverCrust,
        serverToppings,
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

  const userId = rlUserId;
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
      size: p.serverSize,
      crust: p.serverCrust ?? { name: 'Standard', priceModifier: 0 },
      toppings: p.serverToppings.map((t, ti) => ({ _key: `t-${ti}`, _type: 'toppingSnapshot', ...t })),
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
  // Distribute flat discount across product lines (not taxes/delivery) so the
  // Stripe total matches summary.total exactly. Integer-cents, remainder on last line.
  const productLines = pricedNonNull.map((p) => ({
    name: p.product.title,
    images: p.product.imageUrl ? [p.product.imageUrl] : [],
    unit_amount: p.unit,
    quantity: p.item.quantity,
    lineSubtotal: p.unit * p.item.quantity,
  }));
  const productsSubtotal = productLines.reduce((a, l) => a + l.lineSubtotal, 0);
  let remainingDiscount = summary.discount;
  const adjustedLines = productLines.map((l, idx) => {
    const isLast = idx === productLines.length - 1;
    const share = isLast
      ? remainingDiscount
      : productsSubtotal > 0
        ? Math.floor((summary.discount * l.lineSubtotal) / productsSubtotal)
        : 0;
    remainingDiscount -= share;
    // Reduce unit_amount by the per-unit share; guard floor at 0 (cannot be negative on Stripe).
    const perUnitShare = l.quantity > 0 ? Math.floor(share / l.quantity) : 0;
    const adjustedUnit = Math.max(0, l.unit_amount - perUnitShare);
    return { ...l, unit_amount: adjustedUnit };
  });

  let session: Awaited<ReturnType<typeof stripe.checkout.sessions.create>>;
  try {
    session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        customer_email: buyerEmail,
        line_items: [
          ...adjustedLines.map((l) => ({
            price_data: {
              currency: 'usd',
              product_data: { name: l.name, images: l.images },
              unit_amount: l.unit_amount,
            },
            quantity: l.quantity,
          })),
          ...(summary.taxes > 0
            ? [{ price_data: { currency: 'usd', product_data: { name: 'Taxes & Fees' }, unit_amount: summary.taxes }, quantity: 1 }]
            : []),
          ...(summary.deliveryFee > 0
            ? [{ price_data: { currency: 'usd', product_data: { name: 'Express Delivery' }, unit_amount: summary.deliveryFee }, quantity: 1 }]
            : []),
        ],
        metadata: { sanityOrderId: order._id, discount: String(summary.discount) },
        payment_intent_data: { metadata: { sanityOrderId: order._id } },
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
