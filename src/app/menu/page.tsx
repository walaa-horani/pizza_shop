import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { getCategories, getProducts } from '@/sanity/queries';
import type { ProductListItem } from '@/sanity/types';

export default async function MenuGallery({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const [categories, pizzas] = await Promise.all([
    getCategories(),
    getProducts(category),
  ]);
  const activeSlug = category ?? 'signatures';

  return (
    <>
      <Nav />
      <main className="flex-grow pt-32 pb-24 px-6 md:px-12 max-w-[1920px] mx-auto w-full min-h-screen">
        <header className="mb-16 relative">
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary-container/20 rounded-full blur-[100px] pointer-events-none"></div>
          <h1 className="font-headline text-5xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-on-surface to-on-surface/50 mb-6">
            The Masterpiece <br />Collection.
          </h1>
          <p className="font-body text-on-surface-variant text-lg md:text-xl max-w-2xl font-light">
            Hand-stretched daily. Fired at 900°F. Experience the raw warmth of Neapolitan tradition, engineered for the modern palate.
          </p>

          <div className="flex flex-wrap gap-3 mt-10">
            {categories.map((c) => {
              const isActive = c.slug === activeSlug;
              return (
                <Link
                  key={c._id}
                  href={`/menu?category=${c.slug}`}
                  className={`px-5 py-2.5 rounded-xl font-body text-sm transition-all ${
                    isActive
                      ? 'bg-secondary-container text-on-secondary-container font-semibold tracking-wide shadow-[0_10px_20px_rgba(0,0,0,0.2)]'
                      : 'bg-surface-container-high text-on-surface font-medium hover:bg-surface-bright'
                  }`}
                >
                  {c.title}
                </Link>
              );
            })}
          </div>
        </header>

        <div className="columns-1 sm:columns-2 lg:columns-3 gap-8 mt-24">
          {pizzas.map((pizza: ProductListItem) => {
            const isPremium = pizza.theme === 'premium';
            const isTall = pizza.theme === 'tall';
            const minHeight = isTall ? 'min-h-[400px]' : isPremium ? 'min-h-[380px]' : '';
            const bgClass = isPremium
              ? 'bg-surface-container-lowest border border-outline-variant/10'
              : 'bg-surface-container-low';
            return (
              <Link
                key={pizza._id}
                href={`/product/${pizza.slug}`}
                className={`block break-inside-avoid mb-12 group relative ${bgClass} rounded-[1.5rem] p-6 pt-24 shadow-[0_30px_60px_-15px_rgba(229,226,225,0.03)] hover:shadow-[0_40px_80px_-20px_rgba(229,226,225,0.08)] transition-all duration-500 overflow-hidden ${minHeight} flex flex-col justify-end`}
              >
                <img
                  src={pizza.imageUrl}
                  alt={pizza.title}
                  className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 object-cover rounded-full pointer-events-none z-20 border-4 border-surface drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)] group-hover:scale-105 transition-transform duration-500"
                />
                <div className="relative z-10 mt-auto">
                  {pizza.tags?.includes("Chef's Reserve") && (
                    <div className="mb-2 inline-flex items-center gap-1 text-tertiary font-headline text-xs font-bold uppercase tracking-wider">
                      <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      Chef&apos;s Reserve
                    </div>
                  )}
                  <h3 className="font-headline text-2xl md:text-3xl font-bold text-on-surface mb-3">{pizza.title}</h3>
                  <p className="font-body text-on-surface-variant text-sm mb-6 leading-relaxed">{pizza.description}</p>
                  <div className="flex items-center justify-between border-t border-outline-variant/10 pt-4">
                    <span className="font-headline text-tertiary font-black text-2xl tracking-tight">
                      ${(pizza.basePrice / 100).toFixed(2)}
                    </span>
                    <span className="font-headline text-sm text-on-surface-variant">View details →</span>
                  </div>
                </div>
              </Link>
            );
          })}
          {pizzas.length === 0 && (
            <p className="text-on-surface-variant font-body">No pizzas found in this category.</p>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
