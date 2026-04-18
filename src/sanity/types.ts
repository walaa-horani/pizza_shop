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
