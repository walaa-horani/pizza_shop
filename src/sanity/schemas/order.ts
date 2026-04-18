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
