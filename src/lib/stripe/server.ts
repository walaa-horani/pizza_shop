import 'server-only';
import Stripe from 'stripe';
import { getServerEnv } from '@/lib/env';

let cached: Stripe | null = null;

export function getStripe() {
  if (cached) return cached;
  const { STRIPE_SECRET_KEY } = getServerEnv();
  cached = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2026-03-25.dahlia' });
  return cached;
}
