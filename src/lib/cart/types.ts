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
