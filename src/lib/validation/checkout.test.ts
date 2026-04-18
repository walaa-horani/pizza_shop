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
