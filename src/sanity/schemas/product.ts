import { defineType, defineField, defineArrayMember } from 'sanity';

export const productSchema = defineType({
  name: 'product',
  title: 'Product',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({ name: 'description', type: 'text', rows: 4, validation: (r) => r.required() }),
    defineField({
      name: 'image',
      type: 'image',
      options: { hotspot: true },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'basePrice',
      title: 'Base price (cents)',
      type: 'number',
      validation: (r) => r.required().min(0).integer(),
    }),
    defineField({
      name: 'theme',
      type: 'string',
      options: { list: ['standard', 'premium', 'tall'] },
      initialValue: 'standard',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'tags',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
    }),
    defineField({
      name: 'categories',
      type: 'array',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'category' }] })],
      validation: (r) => r.required().min(1),
    }),
    defineField({
      name: 'availableToppings',
      type: 'array',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'topping' }] })],
    }),
    defineField({
      name: 'sizes',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'sizeOption',
          fields: [
            { name: 'name', type: 'string', validation: (r) => r.required() },
            { name: 'priceModifier', title: 'Price modifier (cents)', type: 'number', validation: (r) => r.required().integer() },
            { name: 'default', type: 'boolean', initialValue: false },
          ],
        }),
      ],
      initialValue: [{ _type: 'sizeOption', name: 'Medium', priceModifier: 0, default: true }],
    }),
    defineField({
      name: 'crustOptions',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'crustOption',
          fields: [
            { name: 'name', type: 'string', validation: (r) => r.required() },
            { name: 'priceModifier', title: 'Price modifier (cents)', type: 'number', validation: (r) => r.required().integer() },
            { name: 'default', type: 'boolean', initialValue: false },
          ],
        }),
      ],
    }),
    defineField({ name: 'featured', type: 'boolean', initialValue: false }),
    defineField({ name: 'isActive', type: 'boolean', initialValue: true }),
    defineField({
      name: 'discountPercent',
      title: 'Discount %',
      description: 'Percentage off the base price. 0 means no discount.',
      type: 'number',
      initialValue: 0,
      validation: (r) => r.min(0).max(100).integer(),
    }),
    defineField({
      name: 'announcedAt',
      title: 'Announced at',
      description: 'Set automatically when the new-product announcement email is sent. Do not edit.',
      type: 'datetime',
      readOnly: true,
    }),
    defineField({
      name: 'lastAnnouncedDiscountPercent',
      title: 'Last announced discount %',
      description: 'Set automatically when a discount announcement email is sent. Do not edit.',
      type: 'number',
      readOnly: true,
    }),
  ],
});
