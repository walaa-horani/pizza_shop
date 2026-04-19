# Product Announcement Emails — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-send Resend emails to every signed-up user when a product is newly published, or when a product's discount percentage is added or changed — triggered by a Sanity webhook.

**Architecture:** One signed webhook at `/api/webhooks/sanity` receives product create/update events. It decides between "new product email", "discount email", or "no-op" by comparing the incoming document against tracking fields on the product itself (`announcedAt`, `lastAnnouncedDiscountPercent`). Emails are sent via `resend.batch.send` in chunks of 100.

**Tech Stack:** Next.js App Router (Node runtime), Sanity CMS, `@sanity/webhook` (already in node_modules), Resend SDK, Vitest.

**Reference spec:** `docs/superpowers/specs/2026-04-19-product-announcement-emails-design.md`

---

## File Map

| Path | Action | Purpose |
|---|---|---|
| `src/sanity/schemas/product.ts` | modify | Add `discountPercent`, `announcedAt`, `lastAnnouncedDiscountPercent`. |
| `src/lib/env.ts` | modify | Add `SANITY_WEBHOOK_SECRET`. |
| `src/sanity/queries.ts` | modify | Add `getAllUserEmails()`. |
| `src/lib/email.ts` | modify | Add `formatCents`, `applyDiscount`, `sendNewProductEmail`, `sendDiscountEmail`. |
| `src/lib/email.test.ts` | create | Unit tests for new email functions. |
| `src/app/api/webhooks/sanity/route.ts` | create | Webhook handler. |
| `src/app/api/webhooks/sanity/route.test.ts` | create | Webhook route tests. |

---

## Task 1: Extend product schema with discount + announcement tracking fields

**Files:**
- Modify: `src/sanity/schemas/product.ts`

- [ ] **Step 1: Add three new fields to the product schema**

Open `src/sanity/schemas/product.ts`. Immediately after the `isActive` field (currently the last field), insert three new `defineField` entries so the fields array ends like this:

```ts
    defineField({ name: 'featured', type: 'boolean', initialValue: false }),
    defineField({ name: 'isActive', type: 'boolean', initialValue: true }),
    defineField({
      name: 'discountPercent',
      title: 'Discount %',
      description: 'Percentage off the base price. 0 means no discount.',
      type: 'number',
      initialValue: 0,
      validation: (r) => r.min(0).max(100).integer(),
    }),
    defineField({
      name: 'announcedAt',
      title: 'Announced at',
      description: 'Set automatically when the new-product announcement email is sent. Do not edit.',
      type: 'datetime',
      readOnly: true,
    }),
    defineField({
      name: 'lastAnnouncedDiscountPercent',
      title: 'Last announced discount %',
      description: 'Set automatically when a discount announcement email is sent. Do not edit.',
      type: 'number',
      readOnly: true,
    }),
  ],
});
```

- [ ] **Step 2: Verify Sanity Studio still loads**

Run: `npm run dev`
Open `http://localhost:3000/studio` in a browser.
Expected: Studio loads, opening any product shows the three new fields (Discount % is editable, the two tracking fields are grayed out / read-only).
Stop the dev server with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add src/sanity/schemas/product.ts
git commit -m "feat(sanity): add discount + announcement tracking fields to product schema"
```

---

## Task 2: Add `SANITY_WEBHOOK_SECRET` to env validation

**Files:**
- Modify: `src/lib/env.ts`

- [ ] **Step 1: Add the new server-only env key**

In `src/lib/env.ts`, extend `serverSchema`. The final `serverSchema` should read:

```ts
const serverSchema = publicSchema.extend({
  SANITY_API_WRITE_TOKEN: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z.string().email(),
  SANITY_WEBHOOK_SECRET: z.string().min(1),
});
```

- [ ] **Step 2: Add the secret to your local env file**

Append to `.env.local`:

```
SANITY_WEBHOOK_SECRET=dev-placeholder-change-me
```

(The real value will be set when the webhook is created in the Sanity dashboard during rollout — Task 8. The placeholder is just so `getServerEnv()` parses during development.)

- [ ] **Step 3: Verify type-check**

Run: `npx tsc --noEmit`
Expected: PASS with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/env.ts
git commit -m "feat(env): add SANITY_WEBHOOK_SECRET to server schema"
```

---

## Task 3: Add `getAllUserEmails` query

**Files:**
- Modify: `src/sanity/queries.ts`

- [ ] **Step 1: Add the recipient type and query**

At the top of `src/sanity/queries.ts`, add a new type export, then append a new function at the bottom of the file. The final state of the file should match this skeleton — keep everything that's already there, add only the new pieces marked with `// NEW`:

```ts
import { sanityClient } from './client';
import type { Category, ProductDetail, ProductListItem } from './types';

// NEW
export type UserEmailRecipient = { email: string; name?: string };

const LIST_PROJECTION = `
  _id,
  title,
  "slug": slug.current,
  description,
  "imageUrl": image.asset->url,
  basePrice,
  theme,
  tags,
  "categorySlugs": categories[]->slug.current
`;

// ... existing getCategories, getProducts, getProductBySlug unchanged ...

// NEW — append at the end of the file
export async function getAllUserEmails(): Promise<UserEmailRecipient[]> {
  return sanityClient.fetch(
    `*[_type == "user" && defined(email) && email != "" && email != "[deleted]"]{
      email,
      name
    }`,
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/sanity/queries.ts
git commit -m "feat(sanity): add getAllUserEmails query"
```

---

## Task 4: Add pure pricing helpers to `src/lib/email.ts`

**Files:**
- Modify: `src/lib/email.ts`
- Test: `src/lib/email.test.ts` (new)

- [ ] **Step 1: Write the failing tests**

Create `src/lib/email.test.ts` with:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

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
```

- [ ] **Step 2: Run and verify the tests fail**

Run: `npm test -- src/lib/email.test.ts`
Expected: FAIL — `formatCents` / `applyDiscount` are not exported from `./email`.

- [ ] **Step 3: Implement the helpers**

In `src/lib/email.ts`, below the existing imports and above `let resendClient`, add:

```ts
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function applyDiscount(cents: number, percent: number): number {
  return Math.round(cents * (1 - percent / 100));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/email.test.ts`
Expected: PASS — 2 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/email.ts src/lib/email.test.ts
git commit -m "feat(email): add formatCents and applyDiscount helpers"
```

---

## Task 5: Implement `sendNewProductEmail` (batch + chunking + template)

**Files:**
- Modify: `src/lib/email.ts`
- Modify: `src/lib/email.test.ts`

- [ ] **Step 1: Append the failing tests**

Append to `src/lib/email.test.ts` (after the `applyDiscount` describe block):

```ts
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

    const payload = batchSend.mock.calls[0][0] as Array<{ from: string; to: string; subject: string; html: string }>;
    expect(payload).toHaveLength(2);
    expect(payload[0].from).toBe('shop@pizza.test');
    expect(payload[0].to).toBe('a@t.test');
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
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/email.test.ts`
Expected: FAIL — `sendNewProductEmail` not exported.

- [ ] **Step 3: Implement types + helpers**

In `src/lib/email.ts`, add this type near the top (after imports):

```ts
export type EmailProduct = {
  _id: string;
  title: string;
  slug: string;
  description: string;
  imageUrl: string;
  basePrice: number;
};

export type EmailRecipient = { email: string; name?: string };

const BATCH_SIZE = 100;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
```

- [ ] **Step 4: Implement `sendNewProductEmail`**

Still in `src/lib/email.ts`, add below `sendWelcomeEmail`:

```ts
export async function sendNewProductEmail(params: {
  product: EmailProduct;
  recipients: EmailRecipient[];
}): Promise<void> {
  const { product, recipients } = params;
  if (recipients.length === 0) return;

  const { RESEND_FROM_EMAIL, NEXT_PUBLIC_APP_URL } = getServerEnv();
  const client = getResend();
  const productUrl = `${NEXT_PUBLIC_APP_URL}/product/${product.slug}`;
  const subject = `🍕 New on the menu: ${product.title}`;
  const preheader = `Just dropped: ${product.title} — see what's cooking.`;

  for (const group of chunk(recipients, BATCH_SIZE)) {
    const payload = group.map((r) => ({
      from: RESEND_FROM_EMAIL,
      to: r.email,
      subject,
      html: newProductHtml({ product, productUrl, preheader, name: r.name }),
      text: newProductText({ product, productUrl, name: r.name }),
    }));
    try {
      await client.batch.send(payload);
    } catch (err) {
      console.error('sendNewProductEmail batch failed', err);
    }
  }
}

function newProductText(params: { product: EmailProduct; productUrl: string; name?: string }): string {
  const { product, productUrl, name } = params;
  const greeting = name ? `Hi ${name},` : 'Hi,';
  return `${greeting}\n\nNew on the menu at Pizza Shop: ${product.title}.\n\n${product.description}\n\nFrom ${formatCents(product.basePrice)}.\n\nOrder now: ${productUrl}`;
}

function newProductHtml(params: {
  product: EmailProduct;
  productUrl: string;
  preheader: string;
  name?: string;
}): string {
  const { product, productUrl, preheader, name } = params;
  const greeting = name ? `Hi ${name},` : 'Hi there,';
  return `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#fff7ed;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#1f2937;">
    <span style="display:none !important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 2px 8px rgba(217,72,15,0.08);">
            <tr>
              <td style="padding:20px 28px;background:#d9480f;color:#fff;font-weight:700;font-size:18px;letter-spacing:0.4px;">
                PIZZA&nbsp;SHOP
              </td>
            </tr>
            <tr>
              <td style="padding:0;">
                <img src="${product.imageUrl}" alt="${product.title}" width="600" style="display:block;width:100%;height:auto;border:0;">
              </td>
            </tr>
            <tr>
              <td style="padding:28px 28px 8px 28px;">
                <div style="text-transform:uppercase;letter-spacing:2px;color:#d9480f;font-size:12px;font-weight:700;margin-bottom:10px;">NEW ON THE MENU</div>
                <h1 style="margin:0 0 12px 0;font-size:28px;line-height:1.2;color:#1f2937;">${product.title}</h1>
                <p style="margin:0 0 10px 0;font-size:14px;color:#6b7280;">${greeting}</p>
                <p style="margin:0 0 20px 0;font-size:16px;line-height:1.55;color:#1f2937;">${product.description}</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:4px 28px 8px 28px;">
                <a href="${productUrl}" style="display:inline-block;padding:14px 28px;background:#d9480f;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;font-size:16px;">Order Now</a>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:6px 28px 28px 28px;font-size:13px;color:#6b7280;">
                From ${formatCents(product.basePrice)}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;background:#fff7ed;color:#6b7280;font-size:12px;text-align:center;">
                Pizza Shop · ${productUrl.replace(/\/product\/.*$/, '')}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- src/lib/email.test.ts`
Expected: PASS — all `sendNewProductEmail` tests green, plus the helpers from Task 4.

- [ ] **Step 6: Commit**

```bash
git add src/lib/email.ts src/lib/email.test.ts
git commit -m "feat(email): implement sendNewProductEmail with batched delivery"
```

---

## Task 6: Implement `sendDiscountEmail`

**Files:**
- Modify: `src/lib/email.ts`
- Modify: `src/lib/email.test.ts`

- [ ] **Step 1: Append the failing tests**

Append to `src/lib/email.test.ts` (below the `sendNewProductEmail` describe block):

```ts
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
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/email.test.ts`
Expected: FAIL — `sendDiscountEmail` not exported.

- [ ] **Step 3: Implement `sendDiscountEmail`**

Append to `src/lib/email.ts` below `sendNewProductEmail` and its helpers:

```ts
export async function sendDiscountEmail(params: {
  product: EmailProduct;
  discountPercent: number;
  recipients: EmailRecipient[];
}): Promise<void> {
  const { product, discountPercent, recipients } = params;
  if (recipients.length === 0) return;

  const { RESEND_FROM_EMAIL, NEXT_PUBLIC_APP_URL } = getServerEnv();
  const client = getResend();
  const productUrl = `${NEXT_PUBLIC_APP_URL}/product/${product.slug}`;
  const subject = `${discountPercent}% OFF ${product.title} — limited time`;
  const preheader = `Save ${discountPercent}% on ${product.title} today.`;
  const discountedCents = applyDiscount(product.basePrice, discountPercent);

  for (const group of chunk(recipients, BATCH_SIZE)) {
    const payload = group.map((r) => ({
      from: RESEND_FROM_EMAIL,
      to: r.email,
      subject,
      html: discountHtml({
        product,
        productUrl,
        preheader,
        discountPercent,
        discountedCents,
        name: r.name,
      }),
      text: discountText({
        product,
        productUrl,
        discountPercent,
        discountedCents,
        name: r.name,
      }),
    }));
    try {
      await client.batch.send(payload);
    } catch (err) {
      console.error('sendDiscountEmail batch failed', err);
    }
  }
}

function discountText(params: {
  product: EmailProduct;
  productUrl: string;
  discountPercent: number;
  discountedCents: number;
  name?: string;
}): string {
  const { product, productUrl, discountPercent, discountedCents, name } = params;
  const greeting = name ? `Hi ${name},` : 'Hi,';
  return `${greeting}\n\n${discountPercent}% OFF ${product.title} — now ${formatCents(discountedCents)} (was ${formatCents(product.basePrice)}).\n\n${product.description}\n\nGrab the deal: ${productUrl}\n\nLimited-time offer.`;
}

function discountHtml(params: {
  product: EmailProduct;
  productUrl: string;
  preheader: string;
  discountPercent: number;
  discountedCents: number;
  name?: string;
}): string {
  const { product, productUrl, preheader, discountPercent, discountedCents, name } = params;
  const greeting = name ? `Hi ${name},` : 'Hi there,';
  return `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#fff7ed;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#1f2937;">
    <span style="display:none !important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 2px 8px rgba(217,72,15,0.08);">
            <tr>
              <td style="padding:20px 28px;background:#d9480f;color:#fff;font-weight:700;font-size:18px;letter-spacing:0.4px;">
                PIZZA&nbsp;SHOP
              </td>
            </tr>
            <tr>
              <td style="padding:0;position:relative;">
                <img src="${product.imageUrl}" alt="${product.title}" width="600" style="display:block;width:100%;height:auto;border:0;">
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:20px 28px 0 28px;">
                <div style="display:inline-block;padding:10px 22px;background:#d9480f;color:#ffffff;font-weight:800;font-size:22px;letter-spacing:1px;border-radius:999px;">
                  ${discountPercent}% OFF
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px 6px 28px;text-align:center;">
                <h1 style="margin:0;font-size:26px;line-height:1.2;color:#1f2937;">${product.title}</h1>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:6px 28px 10px 28px;">
                <span style="font-size:16px;color:#6b7280;text-decoration:line-through;margin-right:10px;">${formatCents(product.basePrice)}</span>
                <span style="font-size:28px;font-weight:800;color:#d9480f;">${formatCents(discountedCents)}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 0 28px;">
                <p style="margin:0 0 6px 0;font-size:14px;color:#6b7280;">${greeting}</p>
                <p style="margin:0 0 20px 0;font-size:16px;line-height:1.55;color:#1f2937;">${product.description}</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:4px 28px 6px 28px;">
                <a href="${productUrl}" style="display:inline-block;padding:14px 28px;background:#d9480f;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;font-size:16px;">Grab the deal</a>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:4px 28px 24px 28px;font-size:13px;color:#6b7280;">
                Limited-time offer
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;background:#fff7ed;color:#6b7280;font-size:12px;text-align:center;">
                Pizza Shop · ${productUrl.replace(/\/product\/.*$/, '')}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
```

- [ ] **Step 4: Run all email tests to verify**

Run: `npm test -- src/lib/email.test.ts`
Expected: PASS — all tests green (helpers + both email functions).

- [ ] **Step 5: Commit**

```bash
git add src/lib/email.ts src/lib/email.test.ts
git commit -m "feat(email): implement sendDiscountEmail with discount badge template"
```

---

## Task 7: Implement the Sanity webhook route

**Files:**
- Create: `src/app/api/webhooks/sanity/route.ts`
- Create: `src/app/api/webhooks/sanity/route.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/app/api/webhooks/sanity/route.test.ts`:

```ts
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

  it('returns 500 when the Sanity patch fails', async () => {
    isValidSignature.mockResolvedValue(true);
    patchCommit.mockRejectedValueOnce(new Error('sanity down'));
    const { POST } = await import('./route');
    const res = await POST(req(baseProduct));
    expect(res.status).toBe(500);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/app/api/webhooks/sanity/route.test.ts`
Expected: FAIL — route file does not exist.

- [ ] **Step 3: Implement the route**

Create `src/app/api/webhooks/sanity/route.ts`:

```ts
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
```

- [ ] **Step 4: Run the route tests to verify they pass**

Run: `npm test -- src/app/api/webhooks/sanity/route.test.ts`
Expected: PASS — all 8 tests green.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: PASS — no regressions anywhere.

- [ ] **Step 6: Run the linter**

Run: `npm run lint`
Expected: PASS, or only pre-existing warnings in files you did not touch.

- [ ] **Step 7: Run the build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/app/api/webhooks/sanity/route.ts src/app/api/webhooks/sanity/route.test.ts
git commit -m "feat(webhook): add Sanity product webhook for announcement emails"
```

---

## Task 8: Manual rollout & end-to-end verification

No code. This is the deploy checklist. Do each step in order; do not skip.

- [ ] **Step 1: Generate a real webhook secret**

Generate a random 32-byte hex string (any method). Save it — you'll paste it in two places.

- [ ] **Step 2: Add the real secret to local env**

Replace `SANITY_WEBHOOK_SECRET=dev-placeholder-change-me` in `.env.local` with the real value generated in Step 1.

- [ ] **Step 3: Add the secret to the production env**

In your hosting provider (Vercel): Settings → Environment Variables → add `SANITY_WEBHOOK_SECRET` for Production (and Preview if you use preview webhooks).

- [ ] **Step 4: Deploy**

Merge the feature branch, deploy to production. Confirm the deploy succeeds and `/api/webhooks/sanity` returns 401 on a curl without signature (sanity check that the route exists).

- [ ] **Step 5: Create the webhook in Sanity**

In the Sanity management console (https://www.sanity.io/manage):
1. Pick this project → **API** → **GROQ-powered webhooks** → **Create webhook**.
2. Configure:
   - **Name:** `Product announcement emails`
   - **URL:** `https://<your-prod-domain>/api/webhooks/sanity`
   - **Dataset:** production
   - **Trigger on:** Create + Update
   - **Filter:** `_type == "product"`
   - **Projection:**
     ```
     {
       _id,
       _type,
       title,
       "slug": slug.current,
       description,
       "imageUrl": image.asset->url,
       basePrice,
       discountPercent,
       isActive,
       announcedAt,
       lastAnnouncedDiscountPercent
     }
     ```
   - **HTTP method:** POST
   - **API version:** v2025-02-19 (or the latest v2025 available)
   - **Secret:** paste the value from Step 1.
3. Save.

- [ ] **Step 6: Test "new product" email end-to-end**

1. Confirm at least one real user exists in the Sanity `user` collection (sign up through the app, or seed one).
2. In Studio, publish a new product with `isActive = true`, `discountPercent = 0`, no `announcedAt`.
3. Check your seed user's inbox within ~30s.
   - Expected: subject `🍕 New on the menu: <title>`, hero image, Order Now button.
4. Re-open the product in Studio.
   - Expected: `Announced at` is now populated (read-only).

- [ ] **Step 7: Test "discount" email end-to-end**

1. On the same product, set `discountPercent` to `20`. Publish.
2. Check inbox within ~30s.
   - Expected: subject `20% OFF <title> — limited time`, discount badge, struck-through original price.
3. Re-open in Studio.
   - Expected: `Last announced discount %` is now `20`.

- [ ] **Step 8: Test no-op on unrelated edit**

1. Edit only the description. Publish.
2. Wait 60s. Expected: NO email arrives.

- [ ] **Step 9: Test no-op on same-discount re-publish**

1. With `discountPercent` still `20`, republish the product (no changes).
2. Expected: NO email.

- [ ] **Step 10: Final commit of the rollout checklist completion (optional)**

If anything about the configuration had to be hand-tuned (projection fields, API version), update this plan file to reflect reality and commit the change so future engineers have accurate docs.

```bash
git add docs/superpowers/plans/2026-04-19-product-announcement-emails.md
git commit -m "docs: update announcement-emails plan with verified rollout config"
```

---

## Post-Implementation Notes

- The spec's "discount removed → re-added" behavior is intentionally a one-time send. If the product team later wants re-announcement on toggle, clear `lastAnnouncedDiscountPercent` when `discountPercent` becomes `0` (inside the webhook's no-op branch) — small follow-up.
- No unsubscribe link is included. Before this is used for real customer marketing, add either an opt-in flag on the user or a per-recipient unsubscribe link for CAN-SPAM / GDPR compliance.
- Batch failures are logged and swallowed per-chunk. If you need guaranteed delivery, move to a queue-based worker (e.g., Inngest) — out of scope here.
