# Pizza Shop

A Next.js 16 + Sanity + Clerk + Stripe commerce app.

## Tech stack

- Next.js 16 (App Router) + React 19
- Sanity (content + embedded Studio at `/studio`)
- Clerk (auth)
- Stripe Checkout (payments) + webhooks
- Zustand (cart) + Zod (validation)
- Vitest (tests)

## Setup

### 1. Install

```bash
npm install
```

### 2. Environment

Copy the template and fill in real values:

```bash
cp .env.local.example .env.local
```

### 3. Sanity

1. Go to [sanity.io/manage](https://www.sanity.io/manage) and create a new project. Note the **project ID** and **dataset** (usually `production`).
2. In your project → API → Tokens, create a token with **Editor** or **Write** scope. Save it as `SANITY_API_WRITE_TOKEN`.
3. Fill these into `.env.local`:

   ```
   NEXT_PUBLIC_SANITY_PROJECT_ID=<id>
   NEXT_PUBLIC_SANITY_DATASET=production
   NEXT_PUBLIC_SANITY_API_VERSION=2025-01-01
   SANITY_API_WRITE_TOKEN=<token>
   ```

### 4. Clerk

1. Create a Clerk app at [dashboard.clerk.com](https://dashboard.clerk.com).
2. Copy the publishable + secret keys from **API Keys**.
3. Create a webhook endpoint under **Webhooks** pointing to your local tunnel (e.g. from `ngrok http 3000`) at path `/api/webhooks/clerk`, subscribe to `user.created` and `user.updated`. Copy the signing secret.
4. Fill:

   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   CLERK_WEBHOOK_SECRET=whsec_...
   ```

### 5. Stripe

1. Create a Stripe account at [dashboard.stripe.com](https://dashboard.stripe.com) (test mode is fine).
2. Copy the publishable + secret keys.
3. Install the Stripe CLI and forward webhooks to your local dev server:

   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

   The CLI prints a webhook signing secret starting with `whsec_...`.
4. Fill:

   ```
   STRIPE_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

### 6. Seed Sanity content

```bash
npm run seed
```

Creates categories, toppings, and six products.

### 7. Run

```bash
npm run dev
```

- App: <http://localhost:3000>
- Studio: <http://localhost:3000/studio>

## Scripts

- `npm run dev` — dev server
- `npm run build` — production build
- `npm test` — run tests
- `npm run seed` — seed Sanity content
- `npm run lint`

## Flow

Menu (`/menu`) → Product detail (`/product/[slug]`) → Cart (`/cart`) → Checkout (`/checkout`) → Stripe Hosted Checkout → Success (`/checkout/success`). The Stripe webhook flips the Sanity order from `pending` to `paid`.
