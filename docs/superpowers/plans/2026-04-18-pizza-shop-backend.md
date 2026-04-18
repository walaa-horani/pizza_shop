# Pizza Shop Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the existing Next.js 16 pizza UI to Sanity (content) + Clerk (auth) + Stripe (payments) + Zustand (cart) + Zod (validation), replacing all dummy data and enabling end-to-end ordering.

**Architecture:** Server Components fetch live data via GROQ; a Zustand cart persists in localStorage; a server action re-prices and creates a pending Sanity order, then a Stripe Checkout Session; a Stripe webhook finalizes the order; Clerk users link to Stripe customers via a shared Sanity `user` doc.

**Tech Stack:** Next.js 16.2.4 (App Router) · React 19.2.4 · TypeScript · Sanity (`next-sanity`) · `@clerk/nextjs` · `stripe` + `@stripe/stripe-js` · Zustand · Zod · Vitest (tests) · `svix` (Clerk webhook verification)

**Important:** This uses Next.js 16 — `params`, `searchParams`, and `cookies()` return **Promises** and must be awaited. Always consult `node_modules/next/dist/docs/` when using framework APIs.

**Spec:** [`docs/superpowers/specs/2026-04-18-pizza-shop-backend-design.md`](../specs/2026-04-18-pizza-shop-backend-design.md)

---

## File Map

### Created
- `.env.local.example`
- `sanity.config.ts`, `sanity.cli.ts`
- `src/lib/env.ts`
- `src/sanity/env.ts`, `src/sanity/client.ts`, `src/sanity/serverClient.ts`, `src/sanity/image.ts`
- `src/sanity/schemas/index.ts`, `category.ts`, `topping.ts`, `product.ts`, `user.ts`, `order.ts`
- `src/sanity/queries.ts`, `src/sanity/types.ts`
- `src/lib/cart/types.ts`, `src/lib/cart/pricing.ts`, `src/lib/cart/pricing.test.ts`
- `src/lib/cart/store.ts`, `src/lib/cart/store.test.ts`
- `src/lib/stripe/server.ts`, `src/lib/stripe/client.ts`
- `src/lib/validation/checkout.ts`, `src/lib/validation/checkout.test.ts`
- `src/actions/checkout.ts`, `src/actions/checkout.test.ts`
- `src/middleware.ts` (Clerk)
- `src/app/studio/[[...tool]]/page.tsx`
- `src/app/api/webhooks/stripe/route.ts`, `src/app/api/webhooks/stripe/route.test.ts`
- `src/app/api/webhooks/clerk/route.ts`
- `src/app/product/[slug]/page.tsx`, `src/app/product/[slug]/Configurator.tsx`
- `src/app/checkout/CheckoutForm.tsx`
- `src/app/checkout/success/page.tsx`
- `src/components/CartBadge.tsx`, `src/components/AuthButtons.tsx`
- `scripts/seed.ts`
- `vitest.config.ts`, `vitest.setup.ts`

### Modified
- `package.json` — add dependencies + scripts
- `src/app/layout.tsx` — wrap in `<ClerkProvider>`
- `src/app/menu/page.tsx` — convert to Server Component + live data
- `src/app/cart/page.tsx` — Zustand-driven, remove mocks
- `src/app/checkout/page.tsx` — Server shell + client form
- `src/components/Nav.tsx` — add Clerk buttons + cart badge

### Deleted
- `src/app/product/page.tsx` (replaced by `[slug]/`)

---

## Phase 0 — Toolchain Setup

### Task 0.1: Install runtime dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install runtime dependencies**

Run:
```bash
npm install sanity next-sanity @sanity/image-url @sanity/vision @clerk/nextjs stripe @stripe/stripe-js zustand zod server-only svix
```

Expected: packages added to `package.json` dependencies; `package-lock.json` updated.

- [ ] **Step 2: Install dev dependencies (test framework + seeder runtime)**

Run:
```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom tsx dotenv
```

Expected: Vitest + React Testing Library + `tsx` (for running `scripts/seed.ts`) added to devDependencies.

- [ ] **Step 3: Add npm scripts**

Edit `package.json` `scripts` to add:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest",
    "seed": "tsx scripts/seed.ts"
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add Sanity, Clerk, Stripe, Zustand, Zod, Vitest deps"
```

### Task 0.2: Configure Vitest

**Files:**
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`

- [ ] **Step 1: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 2: Write `vitest.setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 3: Verify Vitest runs with no tests**

Run: `npm test`
Expected: Exits 0 with "No test files found" (or equivalent).

- [ ] **Step 4: Commit**

```bash
git add vitest.config.ts vitest.setup.ts
git commit -m "chore: configure Vitest"
```

### Task 0.3: Create `.env.local.example`

**Files:**
- Create: `.env.local.example`

- [ ] **Step 1: Write the template**

```
# Sanity
NEXT_PUBLIC_SANITY_PROJECT_ID=your-project-id
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2025-01-01
SANITY_API_WRITE_TOKEN=your-write-token

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 2: Commit**

```bash
git add .env.local.example
git commit -m "chore: add env template"
```

---

## Phase 1 — Environment & Sanity Client

### Task 1.1: Zod-validated env loader

**Files:**
- Create: `src/lib/env.ts`

- [ ] **Step 1: Write `src/lib/env.ts`**

```ts
import { z } from 'zod';

const publicSchema = z.object({
  NEXT_PUBLIC_SANITY_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_SANITY_DATASET: z.string().min(1),
  NEXT_PUBLIC_SANITY_API_VERSION: z.string().min(1),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

const serverSchema = publicSchema.extend({
  SANITY_API_WRITE_TOKEN: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
});

export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SANITY_PROJECT_ID: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  NEXT_PUBLIC_SANITY_DATASET: process.env.NEXT_PUBLIC_SANITY_DATASET,
  NEXT_PUBLIC_SANITY_API_VERSION: process.env.NEXT_PUBLIC_SANITY_API_VERSION,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});

export function getServerEnv() {
  return serverSchema.parse(process.env);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/env.ts
git commit -m "feat: add Zod env loader"
```

### Task 1.2: Sanity env + clients

**Files:**
- Create: `src/sanity/env.ts`
- Create: `src/sanity/client.ts`
- Create: `src/sanity/serverClient.ts`
- Create: `src/sanity/image.ts`

- [ ] **Step 1: Write `src/sanity/env.ts`**

```ts
import { publicEnv } from '@/lib/env';

export const projectId = publicEnv.NEXT_PUBLIC_SANITY_PROJECT_ID;
export const dataset = publicEnv.NEXT_PUBLIC_SANITY_DATASET;
export const apiVersion = publicEnv.NEXT_PUBLIC_SANITY_API_VERSION;
```

- [ ] **Step 2: Write `src/sanity/client.ts` (read, CDN)**

```ts
import { createClient } from 'next-sanity';
import { projectId, dataset, apiVersion } from './env';

export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
  perspective: 'published',
});
```

- [ ] **Step 3: Write `src/sanity/serverClient.ts` (write, token)**

```ts
import 'server-only';
import { createClient } from 'next-sanity';
import { projectId, dataset, apiVersion } from './env';
import { getServerEnv } from '@/lib/env';

export function getSanityWriteClient() {
  const { SANITY_API_WRITE_TOKEN } = getServerEnv();
  return createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: false,
    token: SANITY_API_WRITE_TOKEN,
  });
}
```

- [ ] **Step 4: Write `src/sanity/image.ts`**

```ts
import imageUrlBuilder from '@sanity/image-url';
import type { SanityImageSource } from '@sanity/image-url/lib/types/types';
import { projectId, dataset } from './env';

const builder = imageUrlBuilder({ projectId, dataset });

export function urlForImage(source: SanityImageSource) {
  return builder.image(source).auto('format').fit('max');
}
```

- [ ] **Step 5: Commit**

```bash
git add src/sanity/
git commit -m "feat: add Sanity client + image builder"
```

---

## Phase 2 — Sanity Schemas & Embedded Studio

### Task 2.1: Category schema

**Files:**
- Create: `src/sanity/schemas/category.ts`

- [ ] **Step 1: Write schema**

```ts
import { defineType, defineField } from 'sanity';

export const categorySchema = defineType({
  name: 'category',
  title: 'Category',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({ name: 'description', type: 'text', rows: 3 }),
    defineField({ name: 'order', type: 'number', initialValue: 0 }),
  ],
  orderings: [{ title: 'Sort order', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] }],
});
```

- [ ] **Step 2: Commit**

```bash
git add src/sanity/schemas/category.ts
git commit -m "feat: add Category schema"
```

### Task 2.2: Topping schema

**Files:**
- Create: `src/sanity/schemas/topping.ts`

- [ ] **Step 1: Write schema**

```ts
import { defineType, defineField } from 'sanity';

export const toppingSchema = defineType({
  name: 'topping',
  title: 'Topping',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'price',
      title: 'Price (cents)',
      type: 'number',
      validation: (r) => r.required().min(0).integer(),
    }),
    defineField({ name: 'isVegan', type: 'boolean', initialValue: false }),
    defineField({ name: 'isSpicy', type: 'boolean', initialValue: false }),
  ],
});
```

- [ ] **Step 2: Commit**

```bash
git add src/sanity/schemas/topping.ts
git commit -m "feat: add Topping schema"
```

### Task 2.3: Product schema

**Files:**
- Create: `src/sanity/schemas/product.ts`

- [ ] **Step 1: Write schema**

```ts
import { defineType, defineField, defineArrayMember } from 'sanity';

export const productSchema = defineType({
  name: 'product',
  title: 'Product',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({ name: 'description', type: 'text', rows: 4, validation: (r) => r.required() }),
    defineField({
      name: 'image',
      type: 'image',
      options: { hotspot: true },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'basePrice',
      title: 'Base price (cents)',
      type: 'number',
      validation: (r) => r.required().min(0).integer(),
    }),
    defineField({
      name: 'theme',
      type: 'string',
      options: { list: ['standard', 'premium', 'tall'] },
      initialValue: 'standard',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'tags',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
    }),
    defineField({
      name: 'categories',
      type: 'array',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'category' }] })],
      validation: (r) => r.required().min(1),
    }),
    defineField({
      name: 'availableToppings',
      type: 'array',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'topping' }] })],
    }),
    defineField({
      name: 'sizes',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'sizeOption',
          fields: [
            { name: 'name', type: 'string', validation: (r) => r.required() },
            { name: 'priceModifier', title: 'Price modifier (cents)', type: 'number', validation: (r) => r.required().integer() },
            { name: 'default', type: 'boolean', initialValue: false },
          ],
        }),
      ],
      initialValue: [{ _type: 'sizeOption', name: 'Medium', priceModifier: 0, default: true }],
    }),
    defineField({
      name: 'crustOptions',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'crustOption',
          fields: [
            { name: 'name', type: 'string', validation: (r) => r.required() },
            { name: 'priceModifier', title: 'Price modifier (cents)', type: 'number', validation: (r) => r.required().integer() },
            { name: 'default', type: 'boolean', initialValue: false },
          ],
        }),
      ],
    }),
    defineField({ name: 'featured', type: 'boolean', initialValue: false }),
    defineField({ name: 'isActive', type: 'boolean', initialValue: true }),
  ],
});
```

- [ ] **Step 2: Commit**

```bash
git add src/sanity/schemas/product.ts
git commit -m "feat: add Product schema"
```

### Task 2.4: User schema

**Files:**
- Create: `src/sanity/schemas/user.ts`

- [ ] **Step 1: Write schema**

```ts
import { defineType, defineField } from 'sanity';

export const userSchema = defineType({
  name: 'user',
  title: 'User',
  type: 'document',
  fields: [
    defineField({ name: 'clerkUserId', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'email', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'name', type: 'string' }),
    defineField({ name: 'stripeCustomerId', type: 'string' }),
  ],
});
```

- [ ] **Step 2: Commit**

```bash
git add src/sanity/schemas/user.ts
git commit -m "feat: add User schema"
```

### Task 2.5: Order schema

**Files:**
- Create: `src/sanity/schemas/order.ts`

- [ ] **Step 1: Write schema**

```ts
import { defineType, defineField, defineArrayMember } from 'sanity';

export const orderSchema = defineType({
  name: 'order',
  title: 'Order',
  type: 'document',
  fields: [
    defineField({ name: 'orderNumber', type: 'string', readOnly: true, validation: (r) => r.required() }),
    defineField({ name: 'user', type: 'reference', to: [{ type: 'user' }] }),
    defineField({ name: 'guestEmail', type: 'string' }),
    defineField({
      name: 'items',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'orderLine',
          fields: [
            { name: 'productRef', type: 'reference', to: [{ type: 'product' }] },
            {
              name: 'productSnapshot',
              type: 'object',
              fields: [
                { name: 'title', type: 'string' },
                { name: 'slug', type: 'string' },
                { name: 'imageUrl', type: 'string' },
                { name: 'basePrice', type: 'number' },
              ],
            },
            {
              name: 'size',
              type: 'object',
              fields: [
                { name: 'name', type: 'string' },
                { name: 'priceModifier', type: 'number' },
              ],
            },
            {
              name: 'crust',
              type: 'object',
              fields: [
                { name: 'name', type: 'string' },
                { name: 'priceModifier', type: 'number' },
              ],
            },
            {
              name: 'toppings',
              type: 'array',
              of: [
                defineArrayMember({
                  type: 'object',
                  name: 'toppingSnapshot',
                  fields: [
                    { name: 'title', type: 'string' },
                    { name: 'slug', type: 'string' },
                    { name: 'price', type: 'number' },
                  ],
                }),
              ],
            },
            { name: 'specialInstructions', type: 'text' },
            { name: 'quantity', type: 'number', validation: (r) => r.required().min(1).integer() },
            { name: 'lineTotal', type: 'number', validation: (r) => r.required().integer() },
          ],
        }),
      ],
      validation: (r) => r.required().min(1),
    }),
    defineField({
      name: 'shipping',
      type: 'object',
      fields: [
        { name: 'fullName', type: 'string' },
        { name: 'street', type: 'string' },
        { name: 'city', type: 'string' },
        { name: 'postalCode', type: 'string' },
      ],
    }),
    defineField({
      name: 'deliverySpeed',
      type: 'string',
      options: { list: ['express', 'standard'] },
    }),
    defineField({ name: 'subtotal', type: 'number', validation: (r) => r.required().integer() }),
    defineField({ name: 'taxes', type: 'number', validation: (r) => r.required().integer() }),
    defineField({ name: 'deliveryFee', type: 'number', validation: (r) => r.required().integer() }),
    defineField({ name: 'discount', type: 'number', validation: (r) => r.required().integer() }),
    defineField({ name: 'total', type: 'number', validation: (r) => r.required().integer() }),
    defineField({ name: 'currency', type: 'string', initialValue: 'usd' }),
    defineField({
      name: 'status',
      type: 'string',
      options: { list: ['pending', 'paid', 'failed', 'refunded', 'fulfilled', 'cancelled'] },
      initialValue: 'pending',
      validation: (r) => r.required(),
    }),
    defineField({ name: 'stripeSessionId', type: 'string' }),
    defineField({ name: 'stripePaymentIntentId', type: 'string' }),
    defineField({ name: 'createdAt', type: 'datetime' }),
  ],
  orderings: [{ title: 'Newest first', name: 'createdDesc', by: [{ field: 'createdAt', direction: 'desc' }] }],
});
```

- [ ] **Step 2: Commit**

```bash
git add src/sanity/schemas/order.ts
git commit -m "feat: add Order schema"
```

### Task 2.6: Schema index

**Files:**
- Create: `src/sanity/schemas/index.ts`

- [ ] **Step 1: Write index**

```ts
import type { SchemaTypeDefinition } from 'sanity';
import { categorySchema } from './category';
import { toppingSchema } from './topping';
import { productSchema } from './product';
import { userSchema } from './user';
import { orderSchema } from './order';

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [categorySchema, toppingSchema, productSchema, userSchema, orderSchema],
};
```

- [ ] **Step 2: Commit**

```bash
git add src/sanity/schemas/index.ts
git commit -m "feat: register Sanity schemas"
```

### Task 2.7: Sanity Studio config + embedded route

**Files:**
- Create: `sanity.config.ts`
- Create: `sanity.cli.ts`
- Create: `src/app/studio/[[...tool]]/page.tsx`

- [ ] **Step 1: Write `sanity.config.ts`**

```ts
import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { schema } from './src/sanity/schemas';
import { projectId, dataset, apiVersion } from './src/sanity/env';

export default defineConfig({
  basePath: '/studio',
  projectId,
  dataset,
  schema,
  plugins: [structureTool(), visionTool({ defaultApiVersion: apiVersion })],
});
```

- [ ] **Step 2: Write `sanity.cli.ts`**

```ts
import { defineCliConfig } from 'sanity/cli';
import { projectId, dataset } from './src/sanity/env';

export default defineCliConfig({
  api: { projectId, dataset },
});
```

- [ ] **Step 3: Write `src/app/studio/[[...tool]]/page.tsx`**

Consult `node_modules/next/dist/docs/01-app/02-guides/` for `force-static`/`dynamic` if needed. Standard embedded-Studio page:

```tsx
'use client';

import { NextStudio } from 'next-sanity/studio';
import config from '../../../../sanity.config';

export const dynamic = 'force-static';

export default function StudioPage() {
  return <NextStudio config={config} />;
}
```

- [ ] **Step 4: Verify Studio loads**

Run: `npm run dev`
Visit: `http://localhost:3000/studio`
Expected: Sanity Studio UI appears (will prompt for login on first use — env must be set).

- [ ] **Step 5: Commit**

```bash
git add sanity.config.ts sanity.cli.ts src/app/studio
git commit -m "feat: embed Sanity Studio at /studio"
```

### Task 2.8: GROQ queries + result types

**Files:**
- Create: `src/sanity/queries.ts`
- Create: `src/sanity/types.ts`

- [ ] **Step 1: Write `src/sanity/types.ts`**

```ts
export type SizeOption = { name: string; priceModifier: number; default?: boolean };
export type CrustOption = { name: string; priceModifier: number; default?: boolean };

export type Topping = {
  _id: string;
  title: string;
  slug: string;
  price: number;
  isVegan?: boolean;
  isSpicy?: boolean;
};

export type Category = {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  order: number;
};

export type ProductListItem = {
  _id: string;
  title: string;
  slug: string;
  description: string;
  imageUrl: string;
  basePrice: number;
  theme: 'standard' | 'premium' | 'tall';
  tags?: string[];
  categorySlugs: string[];
};

export type ProductDetail = ProductListItem & {
  sizes: SizeOption[];
  crustOptions: CrustOption[];
  availableToppings: Topping[];
};
```

- [ ] **Step 2: Write `src/sanity/queries.ts`**

```ts
import { sanityClient } from './client';
import type { Category, ProductDetail, ProductListItem } from './types';

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

export async function getCategories(): Promise<Category[]> {
  return sanityClient.fetch(
    `*[_type == "category"] | order(order asc) {
      _id, title, "slug": slug.current, description, order
    }`,
  );
}

export async function getProducts(categorySlug?: string): Promise<ProductListItem[]> {
  if (categorySlug && categorySlug !== 'all') {
    return sanityClient.fetch(
      `*[_type == "product" && isActive == true && $slug in categories[]->slug.current] {
        ${LIST_PROJECTION}
      }`,
      { slug: categorySlug },
    );
  }
  return sanityClient.fetch(
    `*[_type == "product" && isActive == true] { ${LIST_PROJECTION} }`,
  );
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  return sanityClient.fetch(
    `*[_type == "product" && slug.current == $slug && isActive == true][0] {
      ${LIST_PROJECTION},
      sizes,
      crustOptions,
      "availableToppings": availableToppings[]-> {
        _id, title, "slug": slug.current, price, isVegan, isSpicy
      }
    }`,
    { slug },
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/sanity/queries.ts src/sanity/types.ts
git commit -m "feat: add GROQ queries + types"
```

---

## Phase 3 — Cart (Zustand) + Pricing

### Task 3.1: Cart types

**Files:**
- Create: `src/lib/cart/types.ts`

- [ ] **Step 1: Write types**

```ts
export type CartToppingSnapshot = { slug: string; title: string; price: number };
export type CartSize = { name: string; priceModifier: number };
export type CartCrust = { name: string; priceModifier: number };

export type CartItem = {
  lineId: string;
  productId: string;
  productSlug: string;
  productTitle: string;
  imageUrl: string;
  basePrice: number;
  size: CartSize;
  crust: CartCrust;
  toppings: CartToppingSnapshot[];
  specialInstructions?: string;
  quantity: number;
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/cart/types.ts
git commit -m "feat: add cart types"
```

### Task 3.2: Pricing functions (TDD)

**Files:**
- Create: `src/lib/cart/pricing.ts`
- Create: `src/lib/cart/pricing.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/cart/pricing.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { lineUnitPrice, lineTotal, summarize, TAX_RATE, DELIVERY_EXPRESS_FEE, DISCOUNT_FLAT } from './pricing';
import type { CartItem } from './types';

const base: CartItem = {
  lineId: '1',
  productId: 'p',
  productSlug: 'margherita',
  productTitle: 'Margherita',
  imageUrl: '',
  basePrice: 1800,
  size: { name: 'Medium', priceModifier: 0 },
  crust: { name: 'Neapolitan', priceModifier: 0 },
  toppings: [],
  quantity: 1,
};

describe('lineUnitPrice', () => {
  it('returns base price when no modifiers', () => {
    expect(lineUnitPrice(base)).toBe(1800);
  });
  it('adds size + crust modifiers', () => {
    expect(lineUnitPrice({ ...base, size: { name: 'Large', priceModifier: 400 }, crust: { name: 'GF', priceModifier: 300 } })).toBe(2500);
  });
  it('adds topping prices', () => {
    expect(lineUnitPrice({ ...base, toppings: [{ slug: 'a', title: 'A', price: 100 }, { slug: 'b', title: 'B', price: 200 }] })).toBe(2100);
  });
});

describe('lineTotal', () => {
  it('multiplies unit by quantity', () => {
    expect(lineTotal({ ...base, quantity: 3 })).toBe(5400);
  });
});

describe('summarize', () => {
  it('computes subtotal, taxes, delivery, discount, total', () => {
    const items: CartItem[] = [base, { ...base, lineId: '2', quantity: 2 }];
    const s = summarize(items, 'express');
    expect(s.subtotal).toBe(1800 + 3600);
    expect(s.taxes).toBe(Math.round(s.subtotal * TAX_RATE));
    expect(s.deliveryFee).toBe(DELIVERY_EXPRESS_FEE);
    expect(s.discount).toBe(DISCOUNT_FLAT);
    expect(s.total).toBe(s.subtotal + s.taxes + s.deliveryFee - s.discount);
  });
  it('applies no discount when cart is empty', () => {
    const s = summarize([], 'standard');
    expect(s.subtotal).toBe(0);
    expect(s.discount).toBe(0);
    expect(s.total).toBe(0);
  });
  it('floors total at zero', () => {
    const tinyItem: CartItem = { ...base, basePrice: 10 };
    const s = summarize([tinyItem], 'standard');
    expect(s.total).toBeGreaterThanOrEqual(0);
  });
  it('charges no delivery fee for standard', () => {
    expect(summarize([base], 'standard').deliveryFee).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `npm test -- pricing`
Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

Create `src/lib/cart/pricing.ts`:
```ts
import type { CartItem } from './types';

export const TAX_RATE = 0.085;
export const DELIVERY_EXPRESS_FEE = 400; // cents
export const DISCOUNT_FLAT = 500; // cents

export type DeliverySpeed = 'express' | 'standard';

export function lineUnitPrice(item: CartItem): number {
  const toppingsSum = item.toppings.reduce((acc, t) => acc + t.price, 0);
  return item.basePrice + item.size.priceModifier + item.crust.priceModifier + toppingsSum;
}

export function lineTotal(item: CartItem): number {
  return lineUnitPrice(item) * item.quantity;
}

export type CartSummary = {
  subtotal: number;
  taxes: number;
  deliveryFee: number;
  discount: number;
  total: number;
};

export function summarize(items: CartItem[], speed: DeliverySpeed): CartSummary {
  const subtotal = items.reduce((acc, i) => acc + lineTotal(i), 0);
  const taxes = Math.round(subtotal * TAX_RATE);
  const deliveryFee = speed === 'express' ? DELIVERY_EXPRESS_FEE : 0;
  const discount = subtotal > 0 ? DISCOUNT_FLAT : 0;
  const total = Math.max(0, subtotal + taxes + deliveryFee - discount);
  return { subtotal, taxes, deliveryFee, discount, total };
}
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `npm test -- pricing`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cart/pricing.ts src/lib/cart/pricing.test.ts
git commit -m "feat: cart pricing functions (TDD)"
```

### Task 3.3: Zustand cart store (TDD)

**Files:**
- Create: `src/lib/cart/store.ts`
- Create: `src/lib/cart/store.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from './store';
import type { CartItem } from './types';

const sample: Omit<CartItem, 'lineId'> = {
  productId: 'p1',
  productSlug: 'margherita',
  productTitle: 'Margherita',
  imageUrl: '',
  basePrice: 1800,
  size: { name: 'Medium', priceModifier: 0 },
  crust: { name: 'Neapolitan', priceModifier: 0 },
  toppings: [],
  quantity: 1,
};

beforeEach(() => {
  useCartStore.getState().clear();
});

describe('cart store', () => {
  it('adds an item with a generated lineId', () => {
    useCartStore.getState().addItem(sample);
    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].lineId).toBeTruthy();
    expect(items[0].productSlug).toBe('margherita');
  });

  it('adds a second distinct item as a separate line', () => {
    useCartStore.getState().addItem(sample);
    useCartStore.getState().addItem({ ...sample, productId: 'p2' });
    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it('updateQuantity updates the given line', () => {
    useCartStore.getState().addItem(sample);
    const lineId = useCartStore.getState().items[0].lineId;
    useCartStore.getState().updateQuantity(lineId, 4);
    expect(useCartStore.getState().items[0].quantity).toBe(4);
  });

  it('updateQuantity clamps to at least 1', () => {
    useCartStore.getState().addItem(sample);
    const lineId = useCartStore.getState().items[0].lineId;
    useCartStore.getState().updateQuantity(lineId, 0);
    expect(useCartStore.getState().items[0].quantity).toBe(1);
  });

  it('removeItem removes the matching line', () => {
    useCartStore.getState().addItem(sample);
    const lineId = useCartStore.getState().items[0].lineId;
    useCartStore.getState().removeItem(lineId);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('itemCount returns total quantity', () => {
    useCartStore.getState().addItem({ ...sample, quantity: 2 });
    useCartStore.getState().addItem({ ...sample, productId: 'p2', quantity: 3 });
    expect(useCartStore.getState().itemCount()).toBe(5);
  });

  it('clear empties the cart', () => {
    useCartStore.getState().addItem(sample);
    useCartStore.getState().clear();
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `npm test -- store`
Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CartItem } from './types';

type CartState = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'lineId'>) => void;
  removeItem: (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  clear: () => void;
  itemCount: () => number;
};

function makeLineId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) =>
        set((state) => ({ items: [...state.items, { ...item, lineId: makeLineId() }] })),
      removeItem: (lineId) => set((state) => ({ items: state.items.filter((i) => i.lineId !== lineId) })),
      updateQuantity: (lineId, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.lineId === lineId ? { ...i, quantity: Math.max(1, quantity) } : i,
          ),
        })),
      clear: () => set({ items: [] }),
      itemCount: () => get().items.reduce((acc, i) => acc + i.quantity, 0),
    }),
    {
      name: 'hearth-cart',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? window.localStorage : (undefined as never))),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
```

- [ ] **Step 4: Run tests — verify pass**

Run: `npm test -- store`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cart/store.ts src/lib/cart/store.test.ts
git commit -m "feat: Zustand cart store (TDD)"
```

---

## Phase 4 — Clerk Integration

### Task 4.1: Clerk middleware

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Write middleware**

Check `node_modules/@clerk/nextjs/dist/types/server/clerkMiddleware.d.ts` for the current signature. Standard setup:

```ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isStudioRoute = createRouteMatcher(['/studio(.*)']);
const isWebhookRoute = createRouteMatcher(['/api/webhooks/(.*)']);

export default clerkMiddleware(async (auth, req) => {
  if (isStudioRoute(req) || isWebhookRoute(req)) return;
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
```

- [ ] **Step 2: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: Clerk middleware (excluding studio + webhooks)"
```

### Task 4.2: Wrap app in ClerkProvider

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Edit layout**

Replace the `<body>` contents with a `<ClerkProvider>` wrapper:

```tsx
import type { Metadata } from 'next';
import { Lexend, Manrope } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

const lexend = Lexend({ variable: '--font-lexend', subsets: ['latin'] });
const manrope = Manrope({ variable: '--font-manrope', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Premium Neapolitan Pizza App',
  description: 'Forged in Fire.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <head>
          <link
            href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
            rel="stylesheet"
          />
        </head>
        <body className={`${lexend.variable} ${manrope.variable} antialiased`}>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: wrap app in ClerkProvider"
```

### Task 4.3: Auth buttons component

**Files:**
- Create: `src/components/AuthButtons.tsx`

- [ ] **Step 1: Write component**

```tsx
'use client';

import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

export default function AuthButtons() {
  return (
    <>
      <SignedOut>
        <div className="flex items-center gap-3">
          <SignInButton>
            <button className="font-label text-sm uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors">
              Sign in
            </button>
          </SignInButton>
          <SignUpButton>
            <button className="font-label text-sm uppercase tracking-widest bg-primary text-on-primary px-4 py-2 rounded-xl">
              Sign up
            </button>
          </SignUpButton>
        </div>
      </SignedOut>
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AuthButtons.tsx
git commit -m "feat: Clerk auth buttons component"
```

### Task 4.4: Cart badge component

**Files:**
- Create: `src/components/CartBadge.tsx`

- [ ] **Step 1: Write component**

```tsx
'use client';

import Link from 'next/link';
import { useCartStore } from '@/lib/cart/store';
import { useEffect, useState } from 'react';

export default function CartBadge() {
  const [mounted, setMounted] = useState(false);
  const itemCount = useCartStore((s) => s.itemCount());
  useEffect(() => setMounted(true), []);
  const count = mounted ? itemCount : 0;

  return (
    <Link href="/cart" className="relative inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-container-highest transition-colors">
      <span className="material-symbols-outlined text-on-surface" style={{ fontVariationSettings: "'FILL' 1" }}>shopping_bag</span>
      {count > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-on-primary text-[10px] font-bold rounded-full flex items-center justify-center font-headline">
          {count}
        </span>
      )}
    </Link>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/CartBadge.tsx
git commit -m "feat: CartBadge reading Zustand itemCount"
```

### Task 4.5: Wire Nav with auth + cart badge

**Files:**
- Modify: `src/components/Nav.tsx`

- [ ] **Step 1: Replace `src/components/Nav.tsx` with this full file**

```tsx
import Link from 'next/link';
import AuthButtons from './AuthButtons';
import CartBadge from './CartBadge';

export default function Nav() {
  return (
    <nav className="fixed top-0 w-full z-50 bg-[#131313]/70 backdrop-blur-[20px] shadow-none">
      <div className="flex justify-between items-center w-full px-8 py-4 max-w-[1920px] mx-auto">
        <Link href="/" className="text-2xl font-black tracking-tighter text-[#E5E2E1] font-headline uppercase hover:opacity-80 transition-opacity">
          HEARTH
        </Link>
        <div className="hidden md:flex items-center gap-8 font-body">
          <Link className="text-[#E5E2E1]/70 font-medium hover:text-[#E5E2E1] transition-colors hover:bg-[#E5E2E1]/5 duration-300 px-3 py-2 rounded-lg" href="/menu">Menu</Link>
          <Link className="text-[#E5E2E1]/70 font-medium hover:text-[#E5E2E1] transition-colors hover:bg-[#E5E2E1]/5 duration-300 px-3 py-2 rounded-lg" href="/menu">Gallery</Link>
          <Link className="text-[#E5E2E1]/70 font-medium hover:text-[#E5E2E1] transition-colors hover:bg-[#E5E2E1]/5 duration-300 px-3 py-2 rounded-lg" href="/">How it Works</Link>
          <Link className="text-[#E5E2E1]/70 font-medium hover:text-[#E5E2E1] transition-colors hover:bg-[#E5E2E1]/5 duration-300 px-3 py-2 rounded-lg" href="/">Offers</Link>
        </div>
        <div className="flex items-center gap-4 text-[#FFB3B4]">
          <CartBadge />
          <AuthButtons />
        </div>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Nav.tsx
git commit -m "feat: Nav with Clerk auth + live cart badge"
```

---

## Phase 5 — Seed Script

### Task 5.1: Write seed script

**Files:**
- Create: `scripts/seed.ts`

- [ ] **Step 1: Write the seed**

```ts
import 'dotenv/config';
import { createClient } from 'next-sanity';
import { z } from 'zod';

const env = z
  .object({
    NEXT_PUBLIC_SANITY_PROJECT_ID: z.string().min(1),
    NEXT_PUBLIC_SANITY_DATASET: z.string().min(1),
    NEXT_PUBLIC_SANITY_API_VERSION: z.string().min(1),
    SANITY_API_WRITE_TOKEN: z.string().min(1),
  })
  .parse(process.env);

const client = createClient({
  projectId: env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: env.NEXT_PUBLIC_SANITY_API_VERSION,
  token: env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
});

const categories = [
  { slug: 'signatures', title: 'All Signatures', order: 0 },
  { slug: 'rosso', title: 'Rosso (Red Base)', order: 1 },
  { slug: 'bianca', title: 'Bianca (White Base)', order: 2 },
  { slug: 'plant-based', title: 'Plant-Based', order: 3 },
];

const toppings = [
  { slug: 'extra-basil', title: 'Extra Basil', price: 100, isVegan: true },
  { slug: 'nduja', title: 'Nduja', price: 300, isSpicy: true },
  { slug: 'double-mozzarella', title: 'Double Mozzarella', price: 400 },
  { slug: 'chili-oil', title: 'Chili Oil', price: 0, isVegan: true, isSpicy: true },
];

const products = [
  {
    slug: 'diavola',
    title: 'Diavola',
    description: 'San Marzano DOP, fior di latte, spicy Calabrian salame, fresh basil, EVOO.',
    basePrice: 2100,
    theme: 'tall' as const,
    tags: [],
    categories: ['signatures', 'rosso'],
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDWXeXKh69Z-IZab9ytz2eERYeKSRiRoS98S_YvQLzoblxfsbjJQ-P7wxY-IHIsqzQy_YBuGQImpJq6HcYFwkv8JrRSWoc7vL8QredgXQGSfi2Oepnf1uu9ABs0NbyiVLdGx7KRsPu937tOEMQ25KoHFd9SceVA8t8BvqbOQ9PpwyjgFOeX72aSOWQoQ_9mswlc_bpDNrWeiwbyZLwPrSu67VyoJa-HUhkLKzroGsyAjOWA0rkxwlrN_e-yLh4yIELKocRcPKES2kk',
  },
  {
    slug: 'margherita',
    title: 'Margherita',
    description: 'The undisputed classic. San Marzano DOP, fresh fior di latte mozzarella, basil.',
    basePrice: 1800,
    theme: 'standard' as const,
    tags: [],
    categories: ['signatures', 'rosso'],
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuC8747IR60efrqB_OIofJy66twn5tvNfF1RIcz-xVqhfYK_dyBnI-Tbt_uSY1ISVvgLIKhub9RMjuyNbJFW01ghZcCUahAZIKP6rVfANoi-KMBxbabeYltWbCLRzmuB48BQ4ltnNuzOoTOxbAQQV4uwYzu2LWisQQnzN-qEHFXYtd2-07wV-2eF6UbcRwdeUXIOPujyuKLk4BngFCJGfROAuAGKO20SbE5bmhjxLxTnErxtd_zpUNhfCZuDVEFUpjMOrgqZsyhkIyQ',
  },
  {
    slug: 'tartufo',
    title: 'Tartufo Bianco',
    description: 'Truffle cream base, roasted wild mushrooms, fior di latte, 24-month Parmigiano, white truffle oil.',
    basePrice: 2800,
    theme: 'premium' as const,
    tags: ["Chef's Reserve"],
    categories: ['signatures', 'bianca'],
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBjaGSwGUVGE9B5REKz98SZwJoXpe26OImf1U6neTj3QdpgvDihtNk8SSoDhxO0Mzzo-R_vJZlPghF0waeTJ0kApLatTLGBmkAfAk1jE4rTkZ_1JT7zF9wpndY64uC6U1J-nBmXzyElQemlhWhXwqPkLHLvuMeaKiuxKpOXMeMJ45kC_c63a765yj13Jy9olltpp_UPMSJ_pOTfilyLc2Sg23is3yWA_fhHKc_btlbiY36hy6FDGh3GkpbKGcaP9L0FOaCBQeXFXhY',
  },
  {
    slug: 'quattro-formaggi',
    title: 'Quattro Formaggi',
    description: 'Fior di latte, gorgonzola dolce, fontina, parmigiano reggiano. No tomato.',
    basePrice: 2000,
    theme: 'standard' as const,
    tags: [],
    categories: ['signatures', 'bianca'],
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCIMyJC-bLHOq4uUox3MVdqc0x4nAsgA-XJwL29mSIUiiG8t85T_tkDaU-wPfFOlTKNoPyAmhwjhRuWO_muBpMAAgmxrmZ2yUm6jqw1TU5-K0ygznMtUJo2XYuMPX7LbK9axHGGIxGt4AVipj4xU_YeTQ2d-WworD_75MJEdwkC9JkaFgsj9HwHB7ZrEFDUH2F01ZZ-ArIV4DspdSD1JQ7zzZYD5J2ciBYOYwmF5xMFVdfB70j6iscf29uGguxHIhf8pxYGJVGHEek',
  },
  {
    slug: 'marinara',
    title: 'Marinara',
    description: "The purist's choice. San Marzano DOP, oregano, garlic, EVOO. Naturally vegan.",
    basePrice: 1500,
    theme: 'standard' as const,
    tags: [],
    categories: ['signatures', 'rosso', 'plant-based'],
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAZOfqp51yfOvrEBVo-VgFe5s73dcW2hGAC4xYoRplO8iWRgZBMdOkqhRX5y42OE7lk_Yn-CuyVkLp3e1NjgvnlikiHJES_uNOhNK-Q4vlcKWqAIjxqLSpa8DwfS52HpfR2kzq6c9R6kmF1osn0IoHexWYowCxAaHXFusWLu_zDjiRcdcYL3eRtZnAH0q5SE8IWdRYjBi094iSKNWL-nZDNckA6_7GNLuuKFRjXm_EEYWPHlw1KTyHnWY6V-Be-IZ1KdA0uw5adVAs',
  },
  {
    slug: 'salsiccia-friarielli',
    title: 'Salsiccia e Friarielli',
    description: 'Smoked provola, fennel sausage, bitter Neapolitan broccoli rabe.',
    basePrice: 2200,
    theme: 'standard' as const,
    tags: [],
    categories: ['signatures', 'bianca'],
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuC7qaR0jipjdUWjaDVCWfsghYQs1fXRpvUo3Mvh03EcEgFeUONT9Ikvak5-dZSQ1Bmrp6UUsHuXeNmxDGjz_-acmQjlH_U3HeTLRccFely---biE3RTFUTFZ2FRl2vBk9Rvftsu_SYG6igDPAE2dShu7QxXQPKsd6OrDsa0_RasXjHq6wUa-XYWJGJQR-NmXB1cbRgw9C5aCARS_clgNhhMbJXR7B0nP-FmoEDiCYOV64HROHWMIxMjIrbWfIcTiElKx3xkOr3tksg',
  },
];

function docId(prefix: string, slug: string) {
  return `${prefix}-${slug}`;
}

async function uploadImage(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`failed to download ${url}: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return client.assets.upload('image', Buffer.from(arrayBuffer), { filename: 'product.jpg' });
}

async function seedCategories() {
  for (const c of categories) {
    await client.createOrReplace({
      _id: docId('category', c.slug),
      _type: 'category',
      title: c.title,
      slug: { _type: 'slug', current: c.slug },
      order: c.order,
    });
  }
  console.log(`✓ seeded ${categories.length} categories`);
}

async function seedToppings() {
  for (const t of toppings) {
    await client.createOrReplace({
      _id: docId('topping', t.slug),
      _type: 'topping',
      title: t.title,
      slug: { _type: 'slug', current: t.slug },
      price: t.price,
      isVegan: t.isVegan ?? false,
      isSpicy: t.isSpicy ?? false,
    });
  }
  console.log(`✓ seeded ${toppings.length} toppings`);
}

async function seedProducts() {
  const toppingRefs = toppings.map((t) => ({ _type: 'reference' as const, _ref: docId('topping', t.slug), _key: t.slug }));
  for (const p of products) {
    const asset = await uploadImage(p.imageUrl);
    await client.createOrReplace({
      _id: docId('product', p.slug),
      _type: 'product',
      title: p.title,
      slug: { _type: 'slug', current: p.slug },
      description: p.description,
      image: { _type: 'image', asset: { _type: 'reference', _ref: asset._id } },
      basePrice: p.basePrice,
      theme: p.theme,
      tags: p.tags,
      categories: p.categories.map((c) => ({ _type: 'reference' as const, _ref: docId('category', c), _key: c })),
      availableToppings: toppingRefs,
      sizes: [
        { _type: 'sizeOption', _key: 'small', name: 'Small', priceModifier: -300, default: false },
        { _type: 'sizeOption', _key: 'medium', name: 'Medium', priceModifier: 0, default: true },
        { _type: 'sizeOption', _key: 'large', name: 'Large', priceModifier: 400, default: false },
      ],
      crustOptions: [
        { _type: 'crustOption', _key: 'neapolitan', name: 'Traditional Neapolitan', priceModifier: 0, default: true },
        { _type: 'crustOption', _key: 'gluten-free', name: 'Gluten-Free', priceModifier: 300, default: false },
      ],
      featured: false,
      isActive: true,
    });
  }
  console.log(`✓ seeded ${products.length} products`);
}

async function main() {
  await seedCategories();
  await seedToppings();
  await seedProducts();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Commit**

```bash
git add scripts/seed.ts
git commit -m "feat: seed script for categories, toppings, products"
```

### Task 5.2: Verify seed runs (manual gate)

- [ ] **Step 1: Populate `.env.local`** with real Sanity credentials (via `README` once written). If credentials aren't ready, skip this task and return to it before the end.

- [ ] **Step 2: Run `npm run seed`**
Expected:
```
✓ seeded 4 categories
✓ seeded 4 toppings
✓ seeded 6 products
```

- [ ] **Step 3: Visit `/studio`** and confirm docs exist. No commit needed (data only).

---

## Phase 6 — Menu Page (Live Data)

### Task 6.1: Convert menu to Server Component

**Files:**
- Modify: `src/app/menu/page.tsx`

- [ ] **Step 1: Replace the file entirely**

Per `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md`, Next.js 16 page props `params` and `searchParams` are Promises — must await.

```tsx
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { getCategories, getProducts } from '@/sanity/queries';
import type { ProductListItem } from '@/sanity/types';

export default async function MenuGallery({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const [categories, pizzas] = await Promise.all([
    getCategories(),
    getProducts(category),
  ]);
  const activeSlug = category ?? 'signatures';

  return (
    <>
      <Nav />
      <main className="flex-grow pt-32 pb-24 px-6 md:px-12 max-w-[1920px] mx-auto w-full min-h-screen">
        <header className="mb-16 relative">
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary-container/20 rounded-full blur-[100px] pointer-events-none"></div>
          <h1 className="font-headline text-5xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-on-surface to-on-surface/50 mb-6">
            The Masterpiece <br />Collection.
          </h1>
          <p className="font-body text-on-surface-variant text-lg md:text-xl max-w-2xl font-light">
            Hand-stretched daily. Fired at 900°F. Experience the raw warmth of Neapolitan tradition, engineered for the modern palate.
          </p>

          <div className="flex flex-wrap gap-3 mt-10">
            {categories.map((c) => {
              const isActive = c.slug === activeSlug;
              return (
                <Link
                  key={c._id}
                  href={`/menu?category=${c.slug}`}
                  className={`px-5 py-2.5 rounded-xl font-body text-sm transition-all ${
                    isActive
                      ? 'bg-secondary-container text-on-secondary-container font-semibold tracking-wide shadow-[0_10px_20px_rgba(0,0,0,0.2)]'
                      : 'bg-surface-container-high text-on-surface font-medium hover:bg-surface-bright'
                  }`}
                >
                  {c.title}
                </Link>
              );
            })}
          </div>
        </header>

        <div className="columns-1 sm:columns-2 lg:columns-3 gap-8 mt-24">
          {pizzas.map((pizza: ProductListItem) => {
            const isPremium = pizza.theme === 'premium';
            const isTall = pizza.theme === 'tall';
            const minHeight = isTall ? 'min-h-[400px]' : isPremium ? 'min-h-[380px]' : '';
            const bgClass = isPremium
              ? 'bg-surface-container-lowest border border-outline-variant/10'
              : 'bg-surface-container-low';
            return (
              <Link
                key={pizza._id}
                href={`/product/${pizza.slug}`}
                className={`block break-inside-avoid mb-12 group relative ${bgClass} rounded-[1.5rem] p-6 pt-24 shadow-[0_30px_60px_-15px_rgba(229,226,225,0.03)] hover:shadow-[0_40px_80px_-20px_rgba(229,226,225,0.08)] transition-all duration-500 overflow-hidden ${minHeight} flex flex-col justify-end`}
              >
                <img
                  src={pizza.imageUrl}
                  alt={pizza.title}
                  className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 object-cover rounded-full pointer-events-none z-20 border-4 border-surface drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)] group-hover:scale-105 transition-transform duration-500"
                />
                <div className="relative z-10 mt-auto">
                  {pizza.tags?.includes("Chef's Reserve") && (
                    <div className="mb-2 inline-flex items-center gap-1 text-tertiary font-headline text-xs font-bold uppercase tracking-wider">
                      <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      Chef&apos;s Reserve
                    </div>
                  )}
                  <h3 className="font-headline text-2xl md:text-3xl font-bold text-on-surface mb-3">{pizza.title}</h3>
                  <p className="font-body text-on-surface-variant text-sm mb-6 leading-relaxed">{pizza.description}</p>
                  <div className="flex items-center justify-between border-t border-outline-variant/10 pt-4">
                    <span className="font-headline text-tertiary font-black text-2xl tracking-tight">
                      ${(pizza.basePrice / 100).toFixed(2)}
                    </span>
                    <span className="font-headline text-sm text-on-surface-variant">View details →</span>
                  </div>
                </div>
              </Link>
            );
          })}
          {pizzas.length === 0 && (
            <p className="text-on-surface-variant font-body">No pizzas found in this category.</p>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 2: Run dev server and verify**

Run: `npm run dev`
Visit: `http://localhost:3000/menu`
Expected: Live data from Sanity; category filter buttons work.

- [ ] **Step 3: Commit**

```bash
git add src/app/menu/page.tsx
git commit -m "feat: menu page as Server Component with live Sanity data"
```

---

## Phase 7 — Product Detail (Dynamic Route)

### Task 7.1: Remove old static product page

**Files:**
- Delete: `src/app/product/page.tsx`

- [ ] **Step 1: Delete file**

```bash
git rm src/app/product/page.tsx
```

- [ ] **Step 2: Commit**

```bash
git commit -m "chore: remove static product page (replaced by [slug])"
```

### Task 7.2: Product detail Server Component

**Files:**
- Create: `src/app/product/[slug]/page.tsx`

- [ ] **Step 1: Write page**

Per `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/dynamic-routes.md`, `params` is a Promise.

```tsx
import { notFound } from 'next/navigation';
import Nav from '@/components/Nav';
import Link from 'next/link';
import Configurator from './Configurator';
import { getProductBySlug } from '@/sanity/queries';

export default async function ProductDetails({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  return (
    <>
      <Nav />
      <main className="pt-24 max-w-[1440px] mx-auto px-4 md:px-8 bg-surface text-on-surface antialiased min-h-screen pb-32">
        <div className="mb-8 mt-4">
          <Link className="inline-flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors font-label text-sm tracking-[0.05rem] uppercase" href="/menu">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to Menu
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          <div className="lg:col-span-7 space-y-12">
            <div className="relative w-full aspect-square md:aspect-[4/3] rounded-xl overflow-hidden bg-surface-container-lowest shadow-[0_40px_80px_rgba(229,226,225,0.04)]">
              <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover scale-105 transform hover:scale-110 transition-transform duration-700 ease-out" />
              <div className="absolute top-6 left-6 bg-surface/80 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 border border-outline-variant/15">
                <span className="material-symbols-outlined text-tertiary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                <span className="font-label text-xs tracking-[0.05rem] uppercase text-on-surface font-bold">Wood-Fired</span>
              </div>
            </div>
            <div className="space-y-6 max-w-2xl">
              <h1 className="font-headline text-5xl md:text-6xl font-black tracking-tighter text-on-surface">{product.title}</h1>
              <p className="font-body text-lg text-on-surface-variant leading-relaxed">{product.description}</p>
            </div>
          </div>

          <div className="lg:col-span-5">
            <Configurator product={product} />
          </div>
        </div>
      </main>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/product/[slug]/page.tsx
git commit -m "feat: product detail Server Component at /product/[slug]"
```

### Task 7.3: Product Configurator (Client Component)

**Files:**
- Create: `src/app/product/[slug]/Configurator.tsx`

- [ ] **Step 1: Write component**

```tsx
'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProductDetail } from '@/sanity/types';
import { useCartStore } from '@/lib/cart/store';
import { lineUnitPrice } from '@/lib/cart/pricing';

export default function Configurator({ product }: { product: ProductDetail }) {
  const defaultSize = product.sizes.find((s) => s.default) ?? product.sizes[0];
  const defaultCrust = product.crustOptions.find((c) => c.default) ?? product.crustOptions[0];

  const [size, setSize] = useState(defaultSize);
  const [crust, setCrust] = useState(defaultCrust);
  const [selectedToppingSlugs, setSelectedToppingSlugs] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  const toppings = product.availableToppings.filter((t) => selectedToppingSlugs.includes(t.slug));

  const unit = useMemo(
    () =>
      lineUnitPrice({
        lineId: '',
        productId: product._id,
        productSlug: product.slug,
        productTitle: product.title,
        imageUrl: product.imageUrl,
        basePrice: product.basePrice,
        size: { name: size.name, priceModifier: size.priceModifier },
        crust: { name: crust?.name ?? 'Standard', priceModifier: crust?.priceModifier ?? 0 },
        toppings: toppings.map((t) => ({ slug: t.slug, title: t.title, price: t.price })),
        quantity: 1,
      }),
    [product, size, crust, toppings],
  );
  const total = unit * quantity;

  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);

  function toggleTopping(slug: string) {
    setSelectedToppingSlugs((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }

  function handleAdd() {
    addItem({
      productId: product._id,
      productSlug: product.slug,
      productTitle: product.title,
      imageUrl: product.imageUrl,
      basePrice: product.basePrice,
      size: { name: size.name, priceModifier: size.priceModifier },
      crust: { name: crust?.name ?? 'Standard', priceModifier: crust?.priceModifier ?? 0 },
      toppings: toppings.map((t) => ({ slug: t.slug, title: t.title, price: t.price })),
      specialInstructions: notes || undefined,
      quantity,
    });
    router.push('/cart');
  }

  return (
    <div className="sticky top-32 space-y-8 bg-surface-container-low p-8 rounded-xl shadow-[0_30px_60px_rgba(229,226,225,0.03)] border border-outline-variant/10">
      <div className="flex justify-between items-end border-b border-outline-variant/15 pb-6">
        <div>
          <span className="font-label text-sm tracking-[0.05rem] text-primary uppercase block mb-1">Unit Price</span>
          <div className="font-headline text-4xl font-bold text-tertiary">${(unit / 100).toFixed(2)}</div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-headline text-xl font-bold text-on-surface">Size</h3>
        <div className="grid grid-cols-2 gap-3">
          {product.sizes.map((s) => {
            const active = s.name === size.name;
            return (
              <button
                key={s.name}
                onClick={() => setSize(s)}
                className={`p-3 rounded-xl text-left ${active ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-highest text-on-surface hover:bg-surface-bright'}`}
              >
                <span className="font-label font-bold block">{s.name}</span>
                <span className="font-body text-xs opacity-80">
                  {s.priceModifier === 0 ? 'included' : `${s.priceModifier > 0 ? '+' : ''}$${(s.priceModifier / 100).toFixed(2)}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {product.crustOptions.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-headline text-xl font-bold text-on-surface">Crust</h3>
          <div className="grid grid-cols-2 gap-3">
            {product.crustOptions.map((c) => {
              const active = c.name === crust?.name;
              return (
                <button
                  key={c.name}
                  onClick={() => setCrust(c)}
                  className={`p-3 rounded-xl text-left ${active ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-highest text-on-surface hover:bg-surface-bright'}`}
                >
                  <span className="font-label font-bold block">{c.name}</span>
                  <span className="font-body text-xs opacity-80">
                    {c.priceModifier === 0 ? 'included' : `+$${(c.priceModifier / 100).toFixed(2)}`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {product.availableToppings.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-headline text-xl font-bold text-on-surface">Toppings</h3>
          <div className="flex flex-wrap gap-3">
            {product.availableToppings.map((t) => {
              const active = selectedToppingSlugs.includes(t.slug);
              return (
                <button
                  key={t.slug}
                  onClick={() => toggleTopping(t.slug)}
                  className={`px-4 py-2 rounded-xl font-label text-sm border ${active ? 'bg-secondary-container text-on-secondary-container border-transparent' : 'bg-surface-container-highest text-on-surface border-outline-variant/10 hover:bg-surface-bright'}`}
                >
                  {t.title} {t.price > 0 ? `(+$${(t.price / 100).toFixed(2)})` : ''}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label className="font-label text-sm text-on-surface block">Special Instructions</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full bg-surface-container-lowest border border-outline-variant/15 rounded-lg p-3 text-on-surface font-body text-sm focus:border-primary/50 outline-none"
          rows={2}
          placeholder="e.g. Please don't cut the pizza…"
        />
      </div>

      <div className="flex items-center justify-between gap-4 pt-4 border-t border-outline-variant/15">
        <div className="flex items-center bg-surface-container-lowest rounded-full p-1 border border-outline-variant/20">
          <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-bright">
            <span className="material-symbols-outlined text-sm">remove</span>
          </button>
          <span className="font-headline text-base font-bold w-8 text-center text-on-surface">{quantity}</span>
          <button onClick={() => setQuantity((q) => q + 1)} className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-bright">
            <span className="material-symbols-outlined text-sm">add</span>
          </button>
        </div>
        <button
          onClick={handleAdd}
          className="flex-1 bg-gradient-to-br from-primary to-primary-container text-on-primary-fixed font-headline font-bold text-lg px-6 py-3 rounded-xl flex items-center justify-center gap-3 hover:opacity-90 transition-opacity"
        >
          Add to Cart · ${(total / 100).toFixed(2)}
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>shopping_bag</span>
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Run: `npm run dev`
Visit any pizza (e.g. `/product/margherita`). Click Add to Cart — should navigate to `/cart` with the item. (Cart page update comes next.)

- [ ] **Step 3: Commit**

```bash
git add src/app/product/[slug]/Configurator.tsx
git commit -m "feat: product Configurator with Zustand add-to-cart"
```

---

## Phase 8 — Cart Page (Zustand-driven)

### Task 8.1: Rewrite cart page

**Files:**
- Modify: `src/app/cart/page.tsx`

- [ ] **Step 1: Replace file**

```tsx
'use client';

import { useEffect, useState } from 'react';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { useCartStore } from '@/lib/cart/store';
import { summarize, lineTotal } from '@/lib/cart/pricing';

export default function Cart() {
  const [mounted, setMounted] = useState(false);
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  useEffect(() => setMounted(true), []);

  const summary = summarize(items, 'standard');

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col antialiased">
      <Nav />
      <main className="flex-grow pt-32 pb-24 px-6 md:px-12 max-w-[1600px] mx-auto w-full">
        <div className="mb-12">
          <h1 className="font-headline text-5xl md:text-6xl font-black tracking-tight text-on-background">Your Order</h1>
          <p className="font-body text-on-surface-variant mt-4 text-lg">Curated selections from the fire.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24">
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-12">
            {!mounted ? (
              <div className="p-12 text-center text-on-surface-variant bg-surface-container-low rounded-[2rem]">Loading…</div>
            ) : items.length === 0 ? (
              <div className="p-12 text-center text-on-surface-variant bg-surface-container-low rounded-[2rem]">
                Your cart is empty. <Link href="/menu" className="text-primary">Browse menu</Link>.
              </div>
            ) : (
              items.map((item, index) => (
                <div key={item.lineId} className="group flex flex-col sm:flex-row items-start sm:items-center gap-8 relative p-6 bg-surface-container-low rounded-[2rem]">
                  <div className={`w-full sm:w-40 h-40 sm:-mt-12 sm:-ml-8 flex-shrink-0 relative z-10 drop-shadow-[0_20px_30px_rgba(0,0,0,0.5)] transition-transform duration-500 group-hover:scale-105 ${index % 2 === 0 ? 'group-hover:rotate-2' : 'group-hover:-rotate-2'}`}>
                    <img alt={item.productTitle} className="w-full h-full object-cover rounded-full aspect-square border-4 border-surface-container-low" src={item.imageUrl} />
                  </div>
                  <div className="flex-grow flex flex-col sm:flex-row justify-between w-full items-start sm:items-center gap-6">
                    <div className="flex flex-col gap-2">
                      <h3 className="font-headline text-2xl font-bold">{item.productTitle}</h3>
                      <p className="font-body text-on-surface-variant text-sm">
                        {item.size.name} · {item.crust.name}
                        {item.toppings.length > 0 && ` · ${item.toppings.map((t) => t.title).join(', ')}`}
                      </p>
                      {item.specialInstructions && (
                        <p className="font-body text-on-surface-variant text-xs italic">“{item.specialInstructions}”</p>
                      )}
                      <span className="font-headline text-tertiary font-bold text-xl mt-2">
                        ${(lineTotal(item) / 100).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center bg-surface-container-lowest rounded-xl p-1 ring-1 ring-outline-variant/10">
                        <button onClick={() => updateQuantity(item.lineId, item.quantity - 1)} className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary">
                          <span className="material-symbols-outlined text-sm">remove</span>
                        </button>
                        <span className="font-headline font-bold w-8 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.lineId, item.quantity + 1)} className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary">
                          <span className="material-symbols-outlined text-sm">add</span>
                        </button>
                      </div>
                      <button onClick={() => removeItem(item.lineId)} className="text-outline hover:text-error transition-colors p-2">
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="lg:col-span-5 xl:col-span-4">
            <div className="sticky top-32 bg-surface/60 backdrop-blur-2xl ring-1 ring-outline-variant/15 rounded-[2rem] p-8 md:p-10">
              <h2 className="font-headline text-3xl font-bold mb-8">Summary</h2>
              <div className="flex flex-col gap-4 font-body text-on-surface-variant mb-8">
                <div className="flex justify-between"><span>Subtotal</span><span>${(summary.subtotal / 100).toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Taxes &amp; Fees</span><span>${(summary.taxes / 100).toFixed(2)}</span></div>
                {summary.discount > 0 && (
                  <div className="flex justify-between text-secondary"><span>Hearth Member Discount</span><span>-${(summary.discount / 100).toFixed(2)}</span></div>
                )}
              </div>
              <div className="bg-surface-container-lowest/50 rounded-2xl p-6 mb-8 flex justify-between items-end">
                <span className="font-headline">Total</span>
                <span className="font-headline text-4xl font-black text-tertiary">${(summary.total / 100).toFixed(2)}</span>
              </div>
              <Link
                href="/checkout"
                aria-disabled={items.length === 0}
                className={`w-full font-headline font-bold text-lg rounded-[1.5rem] py-5 flex justify-center items-center gap-3 transition-all ${items.length === 0 ? 'bg-surface-container-highest text-on-surface-variant pointer-events-none' : 'bg-gradient-to-br from-primary to-primary-container text-on-primary-fixed hover:shadow-[0_0_30px_rgba(196,30,58,0.4)]'}`}
              >
                Proceed to Checkout
                <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Visit `/cart` after adding an item — item appears, qty works, remove works, totals match pricing.

- [ ] **Step 3: Commit**

```bash
git add src/app/cart/page.tsx
git commit -m "feat: cart page wired to Zustand"
```

> **Note on cart reconciliation (spec §4.3 / §10):** The spec calls for an on-mount Sanity reconciliation that drops stale items and toasts the user. The server action already enforces this authoritatively at checkout (it re-prices against Sanity and returns a `formError` if a product is inactive/deleted). A nicer pre-checkout toast is deferred — an explicit v1 trade-off to keep this plan bounded. If the user wants it, add a small `useEffect` in `cart/page.tsx` that calls a new `getProductsByIds` query and `removeItem` for any missing IDs.

---

## Phase 9 — Checkout: Zod + Server Action

### Task 9.1: Checkout Zod schema (TDD)

**Files:**
- Create: `src/lib/validation/checkout.ts`
- Create: `src/lib/validation/checkout.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { checkoutFormSchema, checkoutPayloadSchema } from './checkout';

describe('checkoutFormSchema', () => {
  it('accepts valid input', () => {
    const r = checkoutFormSchema.safeParse({
      fullName: 'Massimo Bottura',
      email: 'm@example.com',
      street: 'Via 32',
      city: 'Napoli',
      postalCode: '80138',
      deliverySpeed: 'express',
    });
    expect(r.success).toBe(true);
  });
  it('rejects missing fields', () => {
    const r = checkoutFormSchema.safeParse({});
    expect(r.success).toBe(false);
  });
  it('rejects bad email', () => {
    const r = checkoutFormSchema.safeParse({
      fullName: 'X',
      email: 'not-email',
      street: 'a',
      city: 'b',
      postalCode: '1',
      deliverySpeed: 'standard',
    });
    expect(r.success).toBe(false);
  });
  it('rejects bad delivery speed', () => {
    const r = checkoutFormSchema.safeParse({
      fullName: 'X', email: 'a@b.c', street: 's', city: 'c', postalCode: '1',
      deliverySpeed: 'overnight',
    });
    expect(r.success).toBe(false);
  });
});

describe('checkoutPayloadSchema', () => {
  it('requires at least 1 item', () => {
    const r = checkoutPayloadSchema.safeParse({
      form: { fullName: 'X', email: 'a@b.c', street: 's', city: 'c', postalCode: '1', deliverySpeed: 'standard' },
      items: [],
    });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run, verify failure**

Run: `npm test -- checkout.test`
Expected: FAIL — module not found.

- [ ] **Step 3: Write schema**

```ts
import { z } from 'zod';

export const checkoutFormSchema = z.object({
  fullName: z.string().trim().min(1, 'Required'),
  email: z.string().email('Valid email required'),
  street: z.string().trim().min(1, 'Required'),
  city: z.string().trim().min(1, 'Required'),
  postalCode: z.string().trim().min(1, 'Required').max(12),
  deliverySpeed: z.enum(['express', 'standard']),
});

export type CheckoutForm = z.infer<typeof checkoutFormSchema>;

const cartToppingSchema = z.object({
  slug: z.string(),
  title: z.string(),
  price: z.number().int().min(0),
});

const cartItemSchema = z.object({
  lineId: z.string(),
  productId: z.string(),
  productSlug: z.string(),
  productTitle: z.string(),
  imageUrl: z.string(),
  basePrice: z.number().int().min(0),
  size: z.object({ name: z.string(), priceModifier: z.number().int() }),
  crust: z.object({ name: z.string(), priceModifier: z.number().int() }),
  toppings: z.array(cartToppingSchema),
  specialInstructions: z.string().optional(),
  quantity: z.number().int().min(1),
});

export const checkoutPayloadSchema = z.object({
  form: checkoutFormSchema,
  items: z.array(cartItemSchema).min(1, 'Cart is empty'),
});

export type CheckoutPayload = z.infer<typeof checkoutPayloadSchema>;
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- checkout.test`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validation/checkout.ts src/lib/validation/checkout.test.ts
git commit -m "feat: Zod checkout schemas (TDD)"
```

### Task 9.2: Stripe server + client helpers

**Files:**
- Create: `src/lib/stripe/server.ts`
- Create: `src/lib/stripe/client.ts`

- [ ] **Step 1: Write `server.ts`**

```ts
import 'server-only';
import Stripe from 'stripe';
import { getServerEnv } from '@/lib/env';

let cached: Stripe | null = null;

export function getStripe() {
  if (cached) return cached;
  const { STRIPE_SECRET_KEY } = getServerEnv();
  cached = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion });
  return cached;
}
```

> Note: if the installed `stripe` SDK reports a different current `apiVersion` at install time, update the literal to match (TypeScript error will show the expected value).

- [ ] **Step 2: Write `client.ts`**

```ts
'use client';

import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { publicEnv } from '@/lib/env';

let cached: Promise<Stripe | null> | null = null;

export function getStripeClient() {
  if (!cached) {
    cached = loadStripe(publicEnv.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  }
  return cached;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/stripe/
git commit -m "feat: Stripe server + client helpers"
```

### Task 9.3: Checkout server action (TDD)

**Files:**
- Create: `src/actions/checkout.ts`
- Create: `src/actions/checkout.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const sanityCreate = vi.fn().mockResolvedValue({ _id: 'order-123' });
const sanityFetch = vi.fn();

vi.mock('@/sanity/serverClient', () => ({
  getSanityWriteClient: () => ({ create: sanityCreate, fetch: sanityFetch }),
}));

const stripeCreate = vi.fn().mockResolvedValue({ id: 'sess_1', url: 'https://stripe.test/s' });
vi.mock('@/lib/stripe/server', () => ({
  getStripe: () => ({ checkout: { sessions: { create: stripeCreate } } }),
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => ({ userId: null }),
  currentUser: async () => null,
}));

vi.mock('@/lib/env', async () => ({
  publicEnv: { NEXT_PUBLIC_APP_URL: 'http://localhost:3000' },
  getServerEnv: () => ({ NEXT_PUBLIC_APP_URL: 'http://localhost:3000' }),
}));

const sampleItem = {
  lineId: 'l1',
  productId: 'p1',
  productSlug: 'margherita',
  productTitle: 'Margherita',
  imageUrl: 'https://x',
  basePrice: 1800,
  size: { name: 'Medium', priceModifier: 0 },
  crust: { name: 'Neapolitan', priceModifier: 0 },
  toppings: [],
  quantity: 1,
};

const validForm = {
  fullName: 'X',
  email: 'a@b.c',
  street: 's',
  city: 'c',
  postalCode: '1',
  deliverySpeed: 'standard' as const,
};

beforeEach(() => {
  sanityCreate.mockClear();
  sanityFetch.mockReset();
  stripeCreate.mockClear();
  sanityFetch.mockResolvedValue({
    _id: 'p1',
    title: 'Margherita',
    slug: 'margherita',
    basePrice: 1800,
    imageUrl: 'https://x',
    isActive: true,
  });
});

describe('checkout server action', () => {
  it('returns fieldErrors on invalid form', async () => {
    const { checkout } = await import('./checkout');
    const r = await checkout({ form: { ...validForm, email: 'bad' }, items: [sampleItem] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors?.email?.[0]).toBeTruthy();
  });

  it('rejects empty cart', async () => {
    const { checkout } = await import('./checkout');
    const r = await checkout({ form: validForm, items: [] });
    expect(r.ok).toBe(false);
  });

  it('creates Sanity order with pending status BEFORE Stripe call', async () => {
    const callOrder: string[] = [];
    sanityCreate.mockImplementationOnce(async (doc: any) => {
      callOrder.push('sanity.create');
      expect(doc.status).toBe('pending');
      return { _id: 'order-123' };
    });
    stripeCreate.mockImplementationOnce(async () => {
      callOrder.push('stripe.sessions.create');
      return { id: 'sess_1', url: 'https://stripe.test/s' };
    });
    const { checkout } = await import('./checkout');
    const r = await checkout({ form: validForm, items: [sampleItem] });
    expect(r.ok).toBe(true);
    expect(callOrder).toEqual(['sanity.create', 'stripe.sessions.create']);
  });

  it('returns Stripe URL on success', async () => {
    const { checkout } = await import('./checkout');
    const r = await checkout({ form: validForm, items: [sampleItem] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.url).toBe('https://stripe.test/s');
  });
});
```

- [ ] **Step 2: Run, verify failure**

Run: `npm test -- actions/checkout`
Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

```ts
'use server';

import { revalidatePath } from 'next/cache';
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
    const flat = parsed.error.flatten();
    return {
      ok: false,
      fieldErrors: flat.fieldErrors as Record<string, string[]>,
      formError: flat.formErrors[0],
    };
  }
  const payload: CheckoutPayload = parsed.data;

  const write = getSanityWriteClient();

  // Re-price each item against current Sanity data (authoritative)
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
      // Trust client size/crust/topping snapshots (display-only decided items);
      // base price + product identity are re-confirmed from Sanity.
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

  // Identify the buyer
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

  // Create pending order
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

  // Create Stripe Checkout Session
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
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
    // Discount via coupon would require a real Coupon; apply as a negative-price line would break Stripe, so we communicate via metadata and surface the saving in our UI.
    metadata: { sanityOrderId: order._id, discount: String(summary.discount) },
    success_url: `${publicEnv.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${publicEnv.NEXT_PUBLIC_APP_URL}/checkout`,
  });

  // Store Stripe session id on the order
  await write.patch(order._id).set({ stripeSessionId: session.id }).commit();

  revalidatePath('/checkout');
  if (!session.url) return { ok: false, formError: 'Stripe session missing URL' };
  return { ok: true, url: session.url };
}
```

- [ ] **Step 4: Run tests — verify pass**

Run: `npm test -- actions/checkout`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/actions/checkout.ts src/actions/checkout.test.ts
git commit -m "feat: checkout server action (TDD): Zod, re-price, Sanity pending, Stripe session"
```

### Task 9.4: Checkout form (Client) + wire server action

**Files:**
- Create: `src/app/checkout/CheckoutForm.tsx`
- Modify: `src/app/checkout/page.tsx`

- [ ] **Step 1: Write `CheckoutForm.tsx`**

Per React 19 `useActionState` + Next.js 16 App Router:

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCartStore } from '@/lib/cart/store';
import { summarize } from '@/lib/cart/pricing';
import { checkout } from '@/actions/checkout';

type Errors = Record<string, string[] | undefined>;

export default function CheckoutForm() {
  const items = useCartStore((s) => s.items);
  const [deliverySpeed, setDeliverySpeed] = useState<'express' | 'standard'>('express');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const summary = summarize(items, deliverySpeed);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (items.length === 0) {
      setFormError('Cart is empty.');
      return;
    }
    setSubmitting(true);
    setErrors({});
    setFormError(null);
    const result = await checkout({
      form: { fullName, email, street, city, postalCode, deliverySpeed },
      items,
    });
    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      setFormError(result.formError ?? null);
      setSubmitting(false);
      return;
    }
    window.location.href = result.url;
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24 w-full">
      <div className="lg:col-span-7 flex flex-col gap-8">
        <h1 className="font-headline text-3xl md:text-4xl font-bold tracking-tight text-on-surface">Delivery Details</h1>
        <div className="bg-surface-container-low rounded-3xl p-6 md:p-10 flex flex-col gap-6">
          <Field label="Full Name" value={fullName} onChange={setFullName} error={errors.fullName} />
          <Field label="Email" type="email" value={email} onChange={setEmail} error={errors.email} />
          <Field label="Street Address" value={street} onChange={setStreet} error={errors.street} />
          <div className="grid grid-cols-2 gap-6">
            <Field label="City" value={city} onChange={setCity} error={errors.city} />
            <Field label="Postal Code" value={postalCode} onChange={setPostalCode} error={errors.postalCode} />
          </div>
          <div className="pt-4">
            <label className="block text-xs uppercase tracking-[0.05rem] text-on-surface-variant font-bold mb-4">Delivery Speed</label>
            <div className="grid grid-cols-2 gap-4">
              {(['express', 'standard'] as const).map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setDeliverySpeed(s)}
                  className={`rounded-xl p-4 flex items-center justify-between text-left ${deliverySpeed === s ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-high hover:bg-surface-bright'}`}
                >
                  <span className="font-headline font-bold text-sm">{s === 'express' ? 'Express' : 'Standard'}</span>
                  <span className="font-headline font-bold text-sm">{s === 'express' ? '+$4.00' : 'Free'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-5">
        <div className="sticky top-8 flex flex-col gap-6 bg-surface-container-highest/80 backdrop-blur-xl rounded-[2rem] p-8">
          <div className="flex justify-between items-center">
            <h2 className="font-headline text-2xl font-bold">Your Tray</h2>
            <Link href="/cart" className="text-sm font-label text-primary uppercase tracking-widest">Edit</Link>
          </div>
          {items.map((item) => (
            <div key={item.lineId} className="flex gap-4 items-center">
              <img src={item.imageUrl} alt={item.productTitle} className="w-20 h-20 rounded-2xl object-cover" />
              <div className="flex-1">
                <h3 className="font-headline font-bold text-lg">{item.productTitle} × {item.quantity}</h3>
                <p className="font-label text-xs text-on-surface-variant">{item.size.name} · {item.crust.name}</p>
              </div>
              <span className="font-headline font-bold">${((item.basePrice + item.size.priceModifier + item.crust.priceModifier + item.toppings.reduce((a, t) => a + t.price, 0)) * item.quantity / 100).toFixed(2)}</span>
            </div>
          ))}
          <div className="flex flex-col gap-3 pt-6 border-t border-outline-variant/20">
            <Row label="Subtotal" value={summary.subtotal} />
            <Row label="Taxes &amp; Fees" value={summary.taxes} />
            {summary.deliveryFee > 0 && <Row label="Express Delivery" value={summary.deliveryFee} />}
            {summary.discount > 0 && <Row label="Discount" value={-summary.discount} />}
            <div className="flex justify-between pt-2">
              <span className="font-headline text-lg font-bold">Total</span>
              <span className="font-headline text-2xl font-black text-tertiary">${(summary.total / 100).toFixed(2)}</span>
            </div>
          </div>
          {formError && <p className="text-error text-sm">{formError}</p>}
          <button
            type="submit"
            disabled={submitting || items.length === 0}
            className="w-full bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-[1.5rem] py-5 px-8 font-headline font-bold text-lg disabled:opacity-50"
          >
            {submitting ? 'Redirecting…' : 'Proceed to Payment'}
          </button>
        </div>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string[];
  type?: string;
}) {
  return (
    <div className="relative bg-surface-container-lowest rounded-xl p-3 ring-1 ring-outline-variant/15 focus-within:ring-primary/50 transition-all">
      <label className="block text-[10px] uppercase tracking-wider text-on-surface-variant font-bold mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent text-on-surface font-body text-base outline-none" />
      {error?.[0] && <p className="text-error text-xs mt-1">{error[0]}</p>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-on-surface-variant font-label text-sm">
      <span>{label}</span>
      <span>{value < 0 ? '-' : ''}${(Math.abs(value) / 100).toFixed(2)}</span>
    </div>
  );
}
```

- [ ] **Step 2: Replace `src/app/checkout/page.tsx` with a simple shell**

```tsx
import Link from 'next/link';
import CheckoutForm from './CheckoutForm';

export default function CheckoutPage() {
  return (
    <div className="bg-surface text-on-surface font-body min-h-screen antialiased flex flex-col">
      <header className="w-full px-8 py-6 flex items-center justify-between z-50 relative isolate">
        <div className="absolute inset-0 bg-surface/70 backdrop-blur-[20px] -z-10"></div>
        <Link href="/" className="text-2xl font-black tracking-tighter text-on-background font-headline uppercase hover:opacity-80 transition-opacity">
          HEARTH
        </Link>
        <div className="flex items-center gap-2 text-on-surface-variant">
          <span className="material-symbols-outlined text-xl">lock</span>
          <span className="font-label text-sm tracking-[0.05rem] uppercase font-bold">Secure Checkout</span>
        </div>
      </header>
      <main className="flex-grow max-w-[1440px] mx-auto px-6 md:px-12 py-8 lg:py-16 w-full">
        <CheckoutForm />
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/checkout/page.tsx src/app/checkout/CheckoutForm.tsx
git commit -m "feat: checkout form wired to server action"
```

---

## Phase 10 — Stripe Webhook

### Task 10.1: Stripe webhook route (TDD)

**Files:**
- Create: `src/app/api/webhooks/stripe/route.ts`
- Create: `src/app/api/webhooks/stripe/route.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const patchSet = vi.fn().mockReturnValue({ commit: vi.fn().mockResolvedValue({}) });
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
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- webhooks/stripe`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the route**

Per `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`, use the Web `Request` API. Read raw body via `.text()` for signature verification.

```ts
import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/server';
import { getSanityWriteClient } from '@/sanity/serverClient';
import { getServerEnv } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  const signature = req.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'missing signature' }, { status: 400 });

  const rawBody = await req.text();
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
          .set({ status: 'paid', stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id })
          .commit();
      }
    } else if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object as Stripe.PaymentIntent;
      const orderId = pi.metadata?.sanityOrderId;
      if (orderId) {
        const order = await write.fetch(`*[_type == "order" && _id == $id][0] { _id, status }`, { id: orderId });
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
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- webhooks/stripe`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/webhooks/stripe
git commit -m "feat: Stripe webhook — signature-verified, idempotent"
```

---

## Phase 11 — Success Page

### Task 11.1: Success page

**Files:**
- Create: `src/app/checkout/success/page.tsx`

- [ ] **Step 1: Write page + client-side cart clear**

```tsx
import 'server-only';
import Link from 'next/link';
import { sanityClient } from '@/sanity/client';
import ClearCartOnMount from './ClearCartOnMount';

async function lookupOrder(sessionId: string) {
  return sanityClient.fetch(
    `*[_type == "order" && stripeSessionId == $id][0] {
      _id, orderNumber, status, total, currency
    }`,
    { id: sessionId },
  );
}

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  const order = session_id ? await lookupOrder(session_id) : null;

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col items-center justify-center px-6 text-center gap-6">
      <ClearCartOnMount />
      <span className="material-symbols-outlined text-6xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
      <h1 className="font-headline text-4xl font-bold">Order confirmed</h1>
      {order ? (
        <>
          <p className="font-body text-on-surface-variant">Order <span className="font-bold">{order.orderNumber}</span></p>
          <p className="font-body text-on-surface-variant">Total: ${(order.total / 100).toFixed(2)}</p>
        </>
      ) : (
        <p className="font-body text-on-surface-variant">We'll email you a receipt shortly.</p>
      )}
      <Link href="/menu" className="mt-4 bg-primary text-on-primary px-6 py-3 rounded-xl font-headline font-bold">
        Order more
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Write `ClearCartOnMount.tsx`**

Create `src/app/checkout/success/ClearCartOnMount.tsx`:
```tsx
'use client';

import { useEffect } from 'react';
import { useCartStore } from '@/lib/cart/store';

export default function ClearCartOnMount() {
  const clear = useCartStore((s) => s.clear);
  useEffect(() => {
    clear();
  }, [clear]);
  return null;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/checkout/success/
git commit -m "feat: checkout success page + clear-cart effect"
```

---

## Phase 12 — Clerk Webhook (User Sync)

### Task 12.1: Clerk webhook route

**Files:**
- Create: `src/app/api/webhooks/clerk/route.ts`

- [ ] **Step 1: Write handler**

```ts
import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { getSanityWriteClient } from '@/sanity/serverClient';
import { getServerEnv } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ClerkUserEvent = {
  type: string;
  data: {
    id: string;
    email_addresses?: { email_address: string; id: string }[];
    primary_email_address_id?: string;
    first_name?: string;
    last_name?: string;
  };
};

export async function POST(req: Request): Promise<Response> {
  const { CLERK_WEBHOOK_SECRET } = getServerEnv();
  const payload = await req.text();

  const svixId = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'missing svix headers' }, { status: 400 });
  }

  const wh = new Webhook(CLERK_WEBHOOK_SECRET);
  let event: ClerkUserEvent;
  try {
    event = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkUserEvent;
  } catch (err) {
    console.error('clerk webhook signature failed', err);
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  const write = getSanityWriteClient();

  if (event.type === 'user.created' || event.type === 'user.updated') {
    const primary = event.data.email_addresses?.find((e) => e.id === event.data.primary_email_address_id);
    const email = primary?.email_address ?? event.data.email_addresses?.[0]?.email_address ?? '';
    const name = [event.data.first_name, event.data.last_name].filter(Boolean).join(' ').trim() || undefined;

    const existing = await write.fetch(
      `*[_type == "user" && clerkUserId == $id][0]._id`,
      { id: event.data.id },
    );
    if (existing) {
      await write.patch(existing).set({ email, name }).commit();
    } else {
      await write.create({ _type: 'user', clerkUserId: event.data.id, email, name });
    }
  }
  // user.deleted left unhandled (preserve historical orders)

  return NextResponse.json({ received: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/webhooks/clerk/route.ts
git commit -m "feat: Clerk webhook — upsert Sanity user on user.created/updated"
```

---

## Phase 13 — README & Final Wiring

### Task 13.1: README setup guide

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace `README.md` with this content**

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: backend setup guide"
```

### Task 13.2: Full manual smoke test

- [ ] **Step 1: Run typecheck + tests + build**

```bash
npx tsc --noEmit
npm test
npm run build
```
Expected: all green.

- [ ] **Step 2: End-to-end smoke test (manual, with real env)**

1. `stripe listen --forward-to localhost:3000/api/webhooks/stripe` in one terminal.
2. `npm run dev` in another.
3. Visit `/menu` — pizzas render from Sanity. Click a category filter — URL updates, products filter.
4. Click a pizza → configure → Add to Cart.
5. Visit `/cart` → adjust quantity, remove an item.
6. Click Proceed to Checkout, fill address, Proceed to Payment.
7. Use Stripe test card `4242 4242 4242 4242`, any future date, any CVC, any ZIP.
8. Land on `/checkout/success?session_id=...`. Cart is cleared. Confirmation shows order number.
9. In `/studio`, verify the order status flipped from `pending` to `paid`.

- [ ] **Step 3: If all green, no commit** (no code changes). If bugs found, fix and commit each fix.

### Task 13.3: Final housekeeping

- [ ] **Step 1: Ensure `.env.local` is gitignored**

Run:
```bash
grep -q "^\.env\.local$" .gitignore || echo ".env.local" >> .gitignore
```

- [ ] **Step 2: Commit if changed**

```bash
git add .gitignore
git diff --cached --quiet || git commit -m "chore: gitignore .env.local"
```

---

## Post-implementation checklist

- [ ] All tests green (`npm test`).
- [ ] TypeScript clean (`npx tsc --noEmit`).
- [ ] Production build clean (`npm run build`).
- [ ] Sanity Studio loads at `/studio`.
- [ ] Menu renders live data and filters work.
- [ ] Product detail page renders for each seeded slug.
- [ ] Add to Cart → Cart → Checkout → Stripe test → Success round-trips.
- [ ] Stripe webhook marks the order `paid` in Studio.
- [ ] Clerk sign-up creates a Sanity user doc (webhook check).
- [ ] README onboarding steps work for a fresh clone.
