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
