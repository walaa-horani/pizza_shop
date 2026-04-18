import { defineType, defineField } from 'sanity';

export const userSchema = defineType({
  name: 'user',
  title: 'User',
  type: 'document',
  fields: [
    defineField({ name: 'clerkUserId', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'email', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'name', type: 'string' }),
    defineField({ name: 'stripeCustomerId', type: 'string' }),
  ],
});
