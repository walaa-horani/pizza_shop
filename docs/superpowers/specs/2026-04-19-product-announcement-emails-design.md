# Product Announcement Emails — Design

**Date:** 2026-04-19
**Status:** Approved for planning

## Goal

Automatically send branded marketing emails to every signed-up user when:

1. A **new product** is published in Sanity.
2. An **existing product's discount** is added or changed.

Emails are sent via Resend's batch API. Triggered by Sanity webhooks.

## Non-Goals

- Unsubscribe / opt-in mechanism. (User accepted the trade-off; not CAN-SPAM/GDPR compliant in its current form. Noted as future work.)
- Admin preview / approval step before sending. Fires automatically.
- Separate "promotion" documents. Discounts live on the product.
- Scheduled / delayed sending, A/B testing, segmentation.

## Architecture Overview

```
Sanity Studio ──publish──> Sanity Webhook ──signed POST──> /api/webhooks/sanity
                                                                 │
                                                                 ├── verify signature
                                                                 ├── decide: new product? discount change? no-op?
                                                                 ├── fetch all user emails from Sanity
                                                                 ├── Resend.batch.send in chunks of 100
                                                                 └── patch tracking fields on the product
```

One webhook, one route, two email templates.

## Schema Changes

Extend `src/sanity/schemas/product.ts` with three fields:

| Field | Type | Purpose |
|---|---|---|
| `discountPercent` | `number` (int, 0–100, defaults to 0) | Percentage off `basePrice`. `0` means no discount. |
| `announcedAt` | `datetime` (optional) | Set when the "new product" email is sent. Prevents re-sending if the product is edited later. |
| `lastAnnouncedDiscountPercent` | `number` (int, optional) | Stores the discount value that was last emailed about. Used to detect genuine discount changes vs. unrelated edits. |

**Why tracking fields on the product itself:** Sanity webhooks fire on every update. Without state to compare against, any typo fix would trigger a fresh blast to the whole user base. Storing "what did we last announce?" on the document is the simplest deduplication.

**Explicit edge case — discount removed then re-added:** Setting `discountPercent` back to `0` does NOT clear `lastAnnouncedDiscountPercent`. Consequence: the sequence `20% → 0% → 20%` sends one email (the first change), not two. This is intentional for V1 (prevents accidental re-spamming when an editor toggles a sale off and on). If you want "re-announcing a previously-announced discount" later, clear `lastAnnouncedDiscountPercent` when `discountPercent` becomes `0`.

## Webhook Endpoint

**Path:** `src/app/api/webhooks/sanity/route.ts`
**Runtime:** `nodejs`, `dynamic = 'force-dynamic'`
**Method:** `POST`

### Sanity webhook configuration

Configured once in the Sanity management console:

- **Trigger on:** `create`, `update`
- **Filter:** `_type == "product"`
- **Projection:**
  ```groq
  {
    _id,
    _type,
    title,
    "slug": slug.current,
    "imageUrl": image.asset->url,
    description,
    basePrice,
    discountPercent,
    isActive,
    announcedAt,
    lastAnnouncedDiscountPercent
  }
  ```
- **Secret:** matches `SANITY_WEBHOOK_SECRET` env var.

### Handler logic

```
1. Read raw body and signature header (`sanity-webhook-signature`).
2. Verify signature using @sanity/webhook `isValidSignature`.
   - Failure → 401.
3. Parse JSON payload.
4. If product is not active → 200, no-op.
5. Decide action:
   a. announcedAt is null/undefined
        → send "new product" email
        → patch product: set announcedAt = now()
   b. else if discountPercent > 0
             && discountPercent !== lastAnnouncedDiscountPercent
        → send "discount" email
        → patch product: set lastAnnouncedDiscountPercent = discountPercent
   c. else → no-op.
6. Return 200 with { received: true, action: "new" | "discount" | "noop" }.
```

**Error handling:**
- A Resend batch failure inside the send functions is logged and swallowed per-chunk; it does NOT fail the route.
- A Sanity patch failure on the tracking fields DOES return 500 — because not patching means the next webhook would re-send.

### New env var

`SANITY_WEBHOOK_SECRET` — added to `serverSchema` in `src/lib/env.ts`.

## Email Sending

### New functions in `src/lib/email.ts`

- `sendNewProductEmail({ product, recipients })`
- `sendDiscountEmail({ product, recipients })`

Both:

1. Take `recipients: { email: string; name?: string }[]`.
2. Chunk recipients into groups of 100.
3. For each chunk, build an array of `{ from, to, subject, html, text }` and call `resend.batch.send()`.
4. Wrap each chunk in try/catch. Log and continue on failure — one bad chunk does not abort the whole run.

### Recipient query

New helper in `src/sanity/queries.ts`:

```ts
export async function getAllUserEmails(): Promise<{ email: string; name?: string }[]> {
  return sanityClient.fetch(
    `*[_type == "user" && defined(email) && email != "" && email != "[deleted]"]{ email, name }`,
  );
}
```

### Templates

Shared styling conventions — applied inline via string templates (no React Email / MJML for now):

- Max width 600px, centered, stacks on mobile.
- Inline CSS only (email-client safe).
- Preheader: hidden span at the top of the `<body>`; shown as preview text in inbox lists.
- Brand palette: `#d9480f` (primary orange), `#fff7ed` (cream background), `#1f2937` (dark text), `#6b7280` (muted).
- System font stack: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.
- Branded header with "Pizza Shop" wordmark.
- Footer with small "Pizza Shop · [app url]" line.
- Each link uses `${NEXT_PUBLIC_APP_URL}/product/${slug}`.

#### New product email

- **Subject:** `🍕 New on the menu: {title}`
- **Preheader:** `Just dropped: {title} — see what's cooking.`
- **Body elements (top to bottom):**
  - Brand header.
  - Full-width hero image of the product (rounded top corners).
  - Eyebrow badge: `NEW ON THE MENU` (uppercase, letter-spaced, orange).
  - Product title at 28px display weight.
  - Description paragraph.
  - CTA button: `Order Now` (solid orange, full-width on mobile, inline-block otherwise).
  - `From $X.XX` line below CTA (formatted from `basePrice` cents).
  - Footer.

#### Discount email

- **Subject:** `{discountPercent}% OFF {title} — limited time`
- **Preheader:** `Save {discountPercent}% on {title} today.`
- **Body elements:**
  - Brand header.
  - Full-width hero image of the product.
  - A CSS-styled discount badge block: centered, large bold `{discountPercent}% OFF` on contrasting background (no image dependency).
  - Product title.
  - Price row: `<s>$original</s>` in muted gray, next to discounted price in large bold orange.
  - CTA button: `Grab the deal`.
  - Small muted urgency line: `Limited-time offer`.
  - Footer.

### Price formatting

Helper in `src/lib/email.ts` (local):

```ts
function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function applyDiscount(cents: number, percent: number): number {
  return Math.round(cents * (1 - percent / 100));
}
```

## Testing Strategy

All tests are Vitest, following the existing patterns in `src/actions/checkout.test.ts` and `src/app/api/webhooks/stripe/route.test.ts`.

### `src/lib/email.test.ts`

Mock the Resend SDK.

- `sendNewProductEmail` with 250 recipients → `batch.send` called 3 times with 100, 100, 50 recipients.
- `sendDiscountEmail` → generated HTML contains the struck-through original price and the discounted price.
- `sendDiscountEmail` → generated HTML contains the discount percent badge.
- A batch call that rejects → error is logged, the next chunk still sends, no throw.

### `src/app/api/webhooks/sanity/route.test.ts`

Mock the Sanity write client and the email module.

- Invalid signature → 401, neither email function called, no patch.
- Valid signature, `announcedAt` null → `sendNewProductEmail` called, `patch(...).set({ announcedAt: <iso> }).commit()` called.
- Valid signature, `announcedAt` set, `discountPercent` 20, `lastAnnouncedDiscountPercent` 10 → `sendDiscountEmail` called, patch sets `lastAnnouncedDiscountPercent: 20`.
- Same as above but `lastAnnouncedDiscountPercent` also 20 → no email, no patch.
- `discountPercent` 0 with `announcedAt` set → no email, no patch.
- `isActive: false` → no email regardless of other state.
- Sanity patch throws → route returns 500.

## Files Touched

| File | Change |
|---|---|
| `src/sanity/schemas/product.ts` | Add `discountPercent`, `announcedAt`, `lastAnnouncedDiscountPercent`. |
| `src/sanity/queries.ts` | Add `getAllUserEmails()`. |
| `src/lib/email.ts` | Add `sendNewProductEmail`, `sendDiscountEmail`, `formatCents`, `applyDiscount`. |
| `src/lib/env.ts` | Add `SANITY_WEBHOOK_SECRET` to server schema. |
| `src/app/api/webhooks/sanity/route.ts` | New route (handler + signature verification). |
| `src/lib/email.test.ts` | New test file. |
| `src/app/api/webhooks/sanity/route.test.ts` | New test file. |

## Rollout Steps

1. Implement schema changes; re-deploy Sanity Studio so editors see the new fields.
2. Add `SANITY_WEBHOOK_SECRET` to `.env.local` and Vercel.
3. Implement email functions and the webhook route with tests.
4. Create the Sanity webhook in the management console pointing at `https://<prod-domain>/api/webhooks/sanity`.
5. Seed one or two test users in Sanity (dev dataset).
6. Publish a new product → confirm test users receive the new-product email.
7. Edit the product's `discountPercent` from `0` to `20` → confirm discount email.
8. Edit an unrelated field (e.g. description) → confirm no email fires.

## Future Work (explicitly out of scope)

- Unsubscribe link + opt-in flag on users (for compliance).
- Admin preview / "send test" button before broadcast.
- Separate promotion documents for multi-product sales.
- Queue-based sending for tens of thousands of users.
- Per-user segmentation (e.g. only vegetarian users get vegan product announcements).
