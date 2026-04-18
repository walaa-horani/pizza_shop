import { defineType, defineField } from 'sanity';

export const toppingSchema = defineType({
  name: 'topping',
  title: 'Topping',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'price',
      title: 'Price (cents)',
      type: 'number',
      validation: (r) => r.required().min(0).integer(),
    }),
    defineField({ name: 'isVegan', type: 'boolean', initialValue: false }),
    defineField({ name: 'isSpicy', type: 'boolean', initialValue: false }),
  ],
});
