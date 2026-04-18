import { sanityClient } from './client';
import type { Category, ProductDetail, ProductListItem } from './types';

const LIST_PROJECTION = `
  _id,
  title,
  "slug": slug.current,
  description,
  "imageUrl": image.asset->url,
  basePrice,
  theme,
  tags,
  "categorySlugs": categories[]->slug.current
`;

export async function getCategories(): Promise<Category[]> {
  return sanityClient.fetch(
    `*[_type == "category"] | order(order asc) {
      _id, title, "slug": slug.current, description, order
    }`,
  );
}

export async function getProducts(categorySlug?: string): Promise<ProductListItem[]> {
  if (categorySlug && categorySlug !== 'all') {
    return sanityClient.fetch(
      `*[_type == "product" && isActive == true && $slug in categories[]->slug.current] {
        ${LIST_PROJECTION}
      }`,
      { slug: categorySlug },
    );
  }
  return sanityClient.fetch(
    `*[_type == "product" && isActive == true] { ${LIST_PROJECTION} }`,
  );
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  return sanityClient.fetch(
    `*[_type == "product" && slug.current == $slug && isActive == true][0] {
      ${LIST_PROJECTION},
      sizes,
      crustOptions,
      "availableToppings": availableToppings[]-> {
        _id, title, "slug": slug.current, price, isVegan, isSpicy
      }
    }`,
    { slug },
  );
}
