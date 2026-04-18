import type { SchemaTypeDefinition } from 'sanity';
import { categorySchema } from './category';
import { toppingSchema } from './topping';
import { productSchema } from './product';
import { userSchema } from './user';
import { orderSchema } from './order';

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [categorySchema, toppingSchema, productSchema, userSchema, orderSchema],
};
