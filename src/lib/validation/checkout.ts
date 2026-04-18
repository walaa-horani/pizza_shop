import { z } from 'zod';

export const checkoutFormSchema = z.object({
  fullName: z.string().trim().min(1, 'Required'),
  email: z.string().trim().min(1, 'Required').regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Valid email required'),
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
