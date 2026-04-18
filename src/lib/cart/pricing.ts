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
