# Pizza Shop — Backend & CMS Integration Design

**Date:** 2026-04-18
**Status:** Approved for implementation
**Stack:** Next.js 16.2.4 · React 19.2.4 · Sanity · Clerk · Stripe · Zustand · Zod

> Note on Next.js: this project uses Next.js 16.2.4, which may differ from defaults in training data. Implementation must consult `node_modules/next/dist/docs/` before using any framework API.

## 1. Goal

Turn the existing static Next.js pizza UI into a fully functional commerce app: Sanity-backed content, Clerk authentication, Zustand cart, Zod-validated server actions, and Stripe-powered checkout with webhooks. Replace all dummy data; connect every UI surface to live Sanity content.

## 2. Scope

**In scope**
- Sanity schemas: `category`, `topping`, `product`, `user`, `order`
- Embedded Sanity Studio at `/studio`
- Typed GROQ queries + Server Component data fetching
- Zustand cart store with localStorage persistence
- Zod validation for checkout form
- Server action: validate → create pending order → Stripe Checkout Session
- Stripe webhook (`checkout.session.completed`, `payment_intent.payment_failed`)
- Clerk auth + Clerk webhook → Sanity `user` upsert + Stripe customer link
- Seed script for the six existing pizzas, four categories, and shared toppings
- Dynamic product route `/product/[slug]`
- Post-payment `/checkout/success` page
- Unit + integration tests (schemas, cart, server action, webhook)

**Out of scope**
- Delivery logistics / real-time tracking (the map UI stays a static image)
- Admin-side order management UI beyond Studio defaults
- Coupons / promotions beyond the flat "Hearth Member" discount shown in UI
- SEO sitemaps, analytics, email notifications

## 3. Decisions (from brainstorming)

| # | Decision | Rationale |
|---|---|---|
| 1 | No existing Sanity/Stripe accounts — use placeholder env vars | User will create accounts from README instructions |
| 2 | Studio embedded at `/studio` (Option A) | Single repo/deploy, standard Next.js + Sanity pattern |
| 3 | Sizes inline per product; toppings as shared referenced docs | Sizes vary per pizza; toppings are reusable catalog |
| 4 | Create pending Sanity order → Stripe Checkout → webhook finalizes | Best traceability; keeps Stripe as hosted (no PCI scope) |
| 5 | Clerk for auth; link Clerk user → Sanity user → Stripe customer | Returning users keep payment methods + order history |
| 6 | Dynamic route `/product/[slug]` | SEO-friendly; App Router convention |
| 7 | Real Category docs with wired filters | Schema already required; filter wiring is a small query-param clause |

## 4. Architecture

### 4.1 Packages

**Runtime:** `sanity`, `next-sanity`, `@sanity/image-url`, `@sanity/vision`, `@clerk/nextjs`, `stripe`, `@stripe/stripe-js`, `zustand`, `zod`, `server-only`, `svix` (Clerk webhook verification).

**Dev:** `@types/...`, optional `tsx` for running the seed script.

### 4.2 Folder layout (additions)

```
src/
  sanity/
    env.ts              # Zod-validated env loader
    client.ts           # read client (CDN)
    serverClient.ts     # write client with token (imports 'server-only')
    image.ts            # urlForImage()
    schemas/
      index.ts
      category.ts
      topping.ts
      product.ts
      user.ts
      order.ts
    queries.ts          # typed GROQ query strings + result types
  lib/
    env.ts              # shared runtime env validation
    cart/
      store.ts          # Zustand + persist
      types.ts
      pricing.ts        # pure pricing functions, tested in isolation
    stripe/
      server.ts         # server-only Stripe client
      client.ts         # loadStripe for redirect
    validation/
      checkout.ts       # Zod schema
  actions/
    checkout.ts         # 'use server' action
  app/
    studio/[[...tool]]/page.tsx
    api/
      webhooks/
        stripe/route.ts
        clerk/route.ts
    product/[slug]/page.tsx         # replaces /product/page.tsx
    checkout/success/page.tsx
    layout.tsx                      # wraps in <ClerkProvider>
sanity.config.ts
sanity.cli.ts
scripts/seed.ts
.env.local.example
```

### 4.3 Data flow

```
Menu (/menu)            Server Component
   GROQ: *[_type=="product" && isActive][...]
   ↓
Product (/product/[slug])  Server Component + Client <Configurator/>
   GROQ: *[_type=="product" && slug.current==$slug][0] { ..., availableToppings[]-> }
   Configurator → Zustand addItem()
   ↓
Cart (/cart)            Client Component — Zustand store (persisted)
   On mount: reconcile with Sanity (drop stale, warn on price change)
   ↓
Checkout (/checkout)    Server Component shell + Client form
   Form submit → Server Action
     1. Zod validate form
     2. Re-price cart against Sanity (authoritative totals)
     3. Ensure Sanity user (if Clerk signed-in) + Stripe customer
     4. Create Sanity order { status: "pending" }
     5. Create Stripe Checkout Session (metadata.sanityOrderId)
     6. Return session.url
   ↓
Stripe Hosted Checkout → success_url = /checkout/success?session_id=...
   ↓
Webhook (/api/webhooks/stripe)  verifies signature, updates order:
   checkout.session.completed     → status: "paid", stripePaymentIntentId set
   payment_intent.payment_failed  → status: "failed"
   (idempotent: checks current status before writing)
   ↓
Success page            Server Component — looks up order by session_id
   On mount: Zustand clearCart()
```

Parallel flow: **Clerk webhook** (`/api/webhooks/clerk`) handles `user.created`/`user.updated` → upserts Sanity `user` with `clerkUserId`, `email`, `name`.

## 5. Schemas

All monetary values are **integer cents** to avoid float drift. UI formats on display.

### 5.1 `category`
- `title` (string, required)
- `slug` (slug on `title`, required, unique)
- `description` (text, optional)
- `order` (number, default 0 — for sort)

### 5.2 `topping`
- `title` (string, required)
- `slug` (slug, required, unique)
- `price` (number, cents, required, min 0)
- `isVegan` (boolean, default false)
- `isSpicy` (boolean, default false)

### 5.3 `product`
- `title` (string, required)
- `slug` (slug on `title`, required, unique)
- `description` (text, required)
- `image` (image with hotspot, required)
- `basePrice` (number, cents, required, min 0)
- `theme` (string enum: `standard` | `premium` | `tall`, default `standard`)
- `tags` (array of strings)
- `categories` (array of refs → `category`, at least 1)
- `availableToppings` (array of refs → `topping`)
- `sizes` (array of inline `{ name, priceModifier (cents), default? }`, default `[{name:"Medium", priceModifier:0, default:true}]`)
- `crustOptions` (array of inline `{ name, priceModifier (cents), default? }`)
- `featured` (boolean, default false)
- `isActive` (boolean, default true)

### 5.4 `user`
- `clerkUserId` (string, required, unique)
- `email` (string, required)
- `name` (string)
- `stripeCustomerId` (string, optional)

### 5.5 `order`
- `orderNumber` (string, required, unique — generated: `HRT-{YYYYMMDD}-{6char}`)
- `user` (ref → `user`, optional)
- `guestEmail` (string, optional — required iff `user` is null)
- `items` (array of inline objects):
  - `productRef` (ref → `product`)
  - `productSnapshot` `{ title, slug, imageUrl, basePrice }` — frozen at checkout
  - `size` `{ name, priceModifier }`
  - `crust` `{ name, priceModifier }`
  - `toppings` (array of `{ title, slug, price }` snapshots)
  - `specialInstructions` (text, optional)
  - `quantity` (number, min 1)
  - `lineTotal` (number, cents)
- `shipping` `{ fullName, street, city, postalCode }`
- `deliverySpeed` (`express` | `standard`)
- `subtotal`, `taxes`, `deliveryFee`, `discount`, `total` (numbers, cents)
- `currency` (string, default `"usd"`)
- `status` (`pending` | `paid` | `failed` | `refunded` | `fulfilled` | `cancelled`, default `pending`)
- `stripeSessionId` (string)
- `stripePaymentIntentId` (string, optional)
- `createdAt` (datetime, default now)

## 6. Pricing rules

All computation happens in **`lib/cart/pricing.ts`** (pure, tested):

```
lineUnitPrice = product.basePrice + size.priceModifier + crust.priceModifier + sum(toppings.price)
lineTotal     = lineUnitPrice * quantity
subtotal      = sum(lineTotal)
taxes         = round(subtotal * TAX_RATE)         # TAX_RATE = 0.085
deliveryFee   = deliverySpeed === "express" ? 400 : 0   # cents
discount      = HEARTH_DISCOUNT if subtotal > 0 else 0  # 500 cents flat
total         = max(0, subtotal + taxes + deliveryFee - discount)
```

The server action **always** recomputes these from Sanity data — client values are display-only.

## 7. Environment

**`.env.local.example`** (all placeholders, documented in README):

```
NEXT_PUBLIC_SANITY_PROJECT_ID=your-project-id
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2025-01-01
SANITY_API_WRITE_TOKEN=your-write-token

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Env is validated with Zod at module load time (`lib/env.ts`). Missing or malformed vars throw with a specific message.

## 8. Seeding

`scripts/seed.ts` (run via `npm run seed`):

1. Load env; assert write token present.
2. Download the six existing `lh3.googleusercontent.com` pizza images; upload to Sanity assets.
3. `createOrReplace` four categories: `signatures`, `rosso`, `bianca`, `plant-based`.
4. `createOrReplace` four toppings: Extra Basil (100), Nduja (300), Double Mozzarella (400), Chili Oil (0).
5. `createOrReplace` six products (Diavola, Margherita, Tartufo Bianco, Quattro Formaggi, Marinara, Salsiccia e Friarielli) with correct categories, theme, basePrice in cents, and references to toppings.
6. Idempotent: re-running the script updates existing docs, does not duplicate.

## 9. Webhooks

### 9.1 Stripe — `POST /api/webhooks/stripe`
- Reads raw body (Next.js 16 App Router: use `request.text()` for signature verification).
- Verifies with `stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)`.
- Routes by `event.type`:
  - `checkout.session.completed` → find order by `stripeSessionId`; if `status === "pending"`, patch to `paid` + set `stripePaymentIntentId`.
  - `payment_intent.payment_failed` → find order by metadata `sanityOrderId`; if `pending`, patch to `failed`.
  - Other verified events: log and return 200.
- Idempotent: status transitions guarded by current value.

### 9.2 Clerk — `POST /api/webhooks/clerk`
- Verifies using `svix` headers + `CLERK_WEBHOOK_SECRET`.
- `user.created`, `user.updated` → upsert Sanity `user` doc keyed by `clerkUserId`.
- `user.deleted` → soft-handle (mark user doc but keep orders).

## 10. Error handling

| Boundary | Strategy |
|---|---|
| Server action | Returns `{ ok: true, url } \| { ok: false, fieldErrors?, formError? }`. Form surfaces field errors under inputs. |
| Sanity fetch failure (Server Component) | Caught by Next.js error boundary (`error.tsx` at route level). |
| Stale cart item (product deleted/inactive) | Dropped on cart mount; user sees toast "X is no longer available." |
| Webhook signature failure | 400 + logged; never processed. |
| Webhook unknown but verified event | 200 + logged. |
| Stripe session creation failure | Order patched to `status: "failed"`; server action returns `formError`. |
| Env var missing | Throws at module load; dev server fails to start with a clear message. |

## 11. Testing

- **Zod** (`lib/validation/checkout.test.ts`): required fields, postal code format, email shape.
- **Pricing** (`lib/cart/pricing.test.ts`): base price only, size + crust modifiers, toppings, discount floor at zero, quantity multiplication.
- **Cart store** (`lib/cart/store.test.ts`): add / remove / updateQuantity, persistence hydration, reconciliation.
- **Server action** (`actions/checkout.test.ts`): mocked Sanity + Stripe. Asserts order is created with `pending` before Stripe call; asserts Zod failures short-circuit.
- **Stripe webhook** (`app/api/webhooks/stripe/route.test.ts`): valid signature → paid; invalid signature → 400; duplicate `checkout.session.completed` → no-op on second call.

## 12. UI wiring (mapping dummy → live data)

| File | Change |
|---|---|
| `src/app/page.tsx` | Keep as-is (marketing-only, no dummy product data). |
| `src/app/menu/page.tsx` | Convert to Server Component. Remove local `pizzas` array. GROQ fetch. Filter buttons become links with `?category=<slug>` (e.g. `?category=bianca`); selected slug is parsed from `searchParams` and fed to GROQ as `$category in categories[]->slug.current`. Extract cart badge to Client Component reading Zustand. |
| `src/app/product/page.tsx` | **Delete.** Replaced by `src/app/product/[slug]/page.tsx` (Server Component) + `src/app/product/[slug]/Configurator.tsx` (Client Component owning size/crust/toppings/qty). Menu card links become `/product/${slug}`. |
| `src/app/cart/page.tsx` | Remove `mockCartItems`. Read from Zustand. Keep pricing summary (computed via `lib/cart/pricing.ts`). |
| `src/app/checkout/page.tsx` | Form → Client Component. Hook up to server action via React 19's `useActionState` (verify exact import path in `node_modules/next/dist/docs/` for Next.js 16). Read cart for summary display. On success, browser redirects to Stripe URL. |
| `src/app/checkout/success/page.tsx` | New. Reads `?session_id=`, fetches order, clears cart on mount. |
| `src/components/Nav.tsx` | Adds Clerk `<SignInButton>` / `<UserButton>` + cart count from Zustand. |
| `src/app/layout.tsx` | Wraps children in `<ClerkProvider>`. |

## 13. Open questions (none — all resolved in brainstorm)

## 14. Risks & mitigations

- **Next.js 16 breaking changes:** mitigated by reading `node_modules/next/dist/docs/` for every framework API before use (server actions, route handlers, dynamic routes, metadata).
- **Client cart drift from real prices:** server action re-prices against Sanity before Stripe; client totals are display-only.
- **Orphaned "pending" orders (abandoned checkout):** acceptable; adds visibility. Can later add a cleanup job if volume warrants.
- **Webhook replay attacks / duplicates:** handled by idempotent status transitions + Stripe's signed timestamp.
