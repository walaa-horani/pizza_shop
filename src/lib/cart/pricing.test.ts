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
