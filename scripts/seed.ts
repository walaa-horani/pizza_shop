import { config as loadEnv } from 'dotenv';
import { createClient } from 'next-sanity';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });
import { z } from 'zod';

const env = z
  .object({
    NEXT_PUBLIC_SANITY_PROJECT_ID: z.string().min(1),
    NEXT_PUBLIC_SANITY_DATASET: z.string().min(1),
    NEXT_PUBLIC_SANITY_API_VERSION: z.string().min(1),
    SANITY_API_WRITE_TOKEN: z.string().min(1),
  })
  .parse(process.env);

const client = createClient({
  projectId: env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: env.NEXT_PUBLIC_SANITY_API_VERSION,
  token: env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
});

const categories = [
  { slug: 'signatures', title: 'All Signatures', order: 0 },
  { slug: 'rosso', title: 'Rosso (Red Base)', order: 1 },
  { slug: 'bianca', title: 'Bianca (White Base)', order: 2 },
  { slug: 'plant-based', title: 'Plant-Based', order: 3 },
];

const toppings = [
  { slug: 'extra-basil', title: 'Extra Basil', price: 100, isVegan: true },
  { slug: 'nduja', title: 'Nduja', price: 300, isSpicy: true },
  { slug: 'double-mozzarella', title: 'Double Mozzarella', price: 400 },
  { slug: 'chili-oil', title: 'Chili Oil', price: 0, isVegan: true, isSpicy: true },
];

const products = [
  {
    slug: 'diavola',
    title: 'Diavola',
    description: 'San Marzano DOP, fior di latte, spicy Calabrian salame, fresh basil, EVOO.',
    basePrice: 2100,
    theme: 'tall' as const,
    tags: [],
    categories: ['signatures', 'rosso'],
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDWXeXKh69Z-IZab9ytz2eERYeKSRiRoS98S_YvQLzoblxfsbjJQ-P7wxY-IHIsqzQy_YBuGQImpJq6HcYFwkv8JrRSWoc7vL8QredgXQGSfi2Oepnf1uu9ABs0NbyiVLdGx7KRsPu937tOEMQ25KoHFd9SceVA8t8BvqbOQ9PpwyjgFOeX72aSOWQoQ_9mswlc_bpDNrWeiwbyZLwPrSu67VyoJa-HUhkLKzroGsyAjOWA0rkxwlrN_e-yLh4yIELKocRcPKES2kk',
  },
  {
    slug: 'margherita',
    title: 'Margherita',
    description: 'The undisputed classic. San Marzano DOP, fresh fior di latte mozzarella, basil.',
    basePrice: 1800,
    theme: 'standard' as const,
    tags: [],
    categories: ['signatures', 'rosso'],
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuC8747IR60efrqB_OIofJy66twn5tvNfF1RIcz-xVqhfYK_dyBnI-Tbt_uSY1ISVvgLIKhub9RMjuyNbJFW01ghZcCUahAZIKP6rVfANoi-KMBxbabeYltWbCLRzmuB48BQ4ltnNuzOoTOxbAQQV4uwYzu2LWisQQnzN-qEHFXYtd2-07wV-2eF6UbcRwdeUXIOPujyuKLk4BngFCJGfROAuAGKO20SbE5bmhjxLxTnErxtd_zpUNhfCZuDVEFUpjMOrgqZsyhkIyQ',
  },
  {
    slug: 'tartufo',
    title: 'Tartufo Bianco',
    description: 'Truffle cream base, roasted wild mushrooms, fior di latte, 24-month Parmigiano, white truffle oil.',
    basePrice: 2800,
    theme: 'premium' as const,
    tags: ["Chef's Reserve"],
    categories: ['signatures', 'bianca'],
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBjaGSwGUVGE9B5REKz98SZwJoXpe26OImf1U6neTj3QdpgvDihtNk8SSoDhxO0Mzzo-R_vJZlPghF0waeTJ0kApLatTLGBmkAfAk1jE4rTkZ_1JT7zF9wpndY64uC6U1J-nBmXzyElQemlhWhXwqPkLHLvuMeaKiuxKpOXMeMJ45kC_c63a765yj13Jy9olltpp_UPMSJ_pOTfilyLc2Sg23is3yWA_fhHKc_btlbiY36hy6FDGh3GkpbKGcaP9L0FOaCBQeXFXhY',
  },
  {
    slug: 'quattro-formaggi',
    title: 'Quattro Formaggi',
    description: 'Fior di latte, gorgonzola dolce, fontina, parmigiano reggiano. No tomato.',
    basePrice: 2000,
    theme: 'standard' as const,
    tags: [],
    categories: ['signatures', 'bianca'],
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCIMyJC-bLHOq4uUox3MVdqc0x4nAsgA-XJwL29mSIUiiG8t85T_tkDaU-wPfFOlTKNoPyAmhwjhRuWO_muBpMAAgmxrmZ2yUm6jqw1TU5-K0ygznMtUJo2XYuMPX7LbK9axHGGIxGt4AVipj4xU_YeTQ2d-WworD_75MJEdwkC9JkaFgsj9HwHB7ZrEFDUH2F01ZZ-ArIV4DspdSD1JQ7zzZYD5J2ciBYOYwmF5xMFVdfB70j6iscf29uGguxHIhf8pxYGJVGHEek',
  },
  {
    slug: 'marinara',
    title: 'Marinara',
    description: "The purist's choice. San Marzano DOP, oregano, garlic, EVOO. Naturally vegan.",
    basePrice: 1500,
    theme: 'standard' as const,
    tags: [],
    categories: ['signatures', 'rosso', 'plant-based'],
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAZOfqp51yfOvrEBVo-VgFe5s73dcW2hGAC4xYoRplO8iWRgZBMdOkqhRX5y42OE7lk_Yn-CuyVkLp3e1NjgvnlikiHJES_uNOhNK-Q4vlcKWqAIjxqLSpa8DwfS52HpfR2kzq6c9R6kmF1osn0IoHexWYowCxAaHXFusWLu_zDjiRcdcYL3eRtZnAH0q5SE8IWdRYjBi094iSKNWL-nZDNckA6_7GNLuuKFRjXm_EEYWPHlw1KTyHnWY6V-Be-IZ1KdA0uw5adVAs',
  },
  {
    slug: 'salsiccia-friarielli',
    title: 'Salsiccia e Friarielli',
    description: 'Smoked provola, fennel sausage, bitter Neapolitan broccoli rabe.',
    basePrice: 2200,
    theme: 'standard' as const,
    tags: [],
    categories: ['signatures', 'bianca'],
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuC7qaR0jipjdUWjaDVCWfsghYQs1fXRpvUo3Mvh03EcEgFeUONT9Ikvak5-dZSQ1Bmrp6UUsHuXeNmxDGjz_-acmQjlH_U3HeTLRccFely---biE3RTFUTFZ2FRl2vBk9Rvftsu_SYG6igDPAE2dShu7QxXQPKsd6OrDsa0_RasXjHq6wUa-XYWJGJQR-NmXB1cbRgw9C5aCARS_clgNhhMbJXR7B0nP-FmoEDiCYOV64HROHWMIxMjIrbWfIcTiElKx3xkOr3tksg',
  },
];

function docId(prefix: string, slug: string) {
  return `${prefix}-${slug}`;
}

async function uploadImage(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`failed to download ${url}: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return client.assets.upload('image', Buffer.from(arrayBuffer), { filename: 'product.jpg' });
}

async function seedCategories() {
  for (const c of categories) {
    await client.createOrReplace({
      _id: docId('category', c.slug),
      _type: 'category',
      title: c.title,
      slug: { _type: 'slug', current: c.slug },
      order: c.order,
    });
  }
  console.log(`✓ seeded ${categories.length} categories`);
}

async function seedToppings() {
  for (const t of toppings) {
    await client.createOrReplace({
      _id: docId('topping', t.slug),
      _type: 'topping',
      title: t.title,
      slug: { _type: 'slug', current: t.slug },
      price: t.price,
      isVegan: t.isVegan ?? false,
      isSpicy: t.isSpicy ?? false,
    });
  }
  console.log(`✓ seeded ${toppings.length} toppings`);
}

async function seedProducts() {
  const toppingRefs = toppings.map((t) => ({ _type: 'reference' as const, _ref: docId('topping', t.slug), _key: t.slug }));
  for (const p of products) {
    const asset = await uploadImage(p.imageUrl);
    await client.createOrReplace({
      _id: docId('product', p.slug),
      _type: 'product',
      title: p.title,
      slug: { _type: 'slug', current: p.slug },
      description: p.description,
      image: { _type: 'image', asset: { _type: 'reference', _ref: asset._id } },
      basePrice: p.basePrice,
      theme: p.theme,
      tags: p.tags,
      categories: p.categories.map((c) => ({ _type: 'reference' as const, _ref: docId('category', c), _key: c })),
      availableToppings: toppingRefs,
      sizes: [
        { _type: 'sizeOption', _key: 'small', name: 'Small', priceModifier: -300, default: false },
        { _type: 'sizeOption', _key: 'medium', name: 'Medium', priceModifier: 0, default: true },
        { _type: 'sizeOption', _key: 'large', name: 'Large', priceModifier: 400, default: false },
      ],
      crustOptions: [
        { _type: 'crustOption', _key: 'neapolitan', name: 'Traditional Neapolitan', priceModifier: 0, default: true },
        { _type: 'crustOption', _key: 'gluten-free', name: 'Gluten-Free', priceModifier: 300, default: false },
      ],
      featured: false,
      isActive: true,
    });
  }
  console.log(`✓ seeded ${products.length} products`);
}

async function main() {
  await seedCategories();
  await seedToppings();
  await seedProducts();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
