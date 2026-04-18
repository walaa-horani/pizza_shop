import { notFound } from 'next/navigation';
import Nav from '@/components/Nav';
import Link from 'next/link';
import Configurator from './Configurator';
import { getProductBySlug } from '@/sanity/queries';

export default async function ProductDetails({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  return (
    <>
      <Nav />
      <main className="pt-24 max-w-[1440px] mx-auto px-4 md:px-8 bg-surface text-on-surface antialiased min-h-screen pb-32">
        <div className="mb-8 mt-4">
          <Link className="inline-flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors font-label text-sm tracking-[0.05rem] uppercase" href="/menu">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to Menu
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          <div className="lg:col-span-7 space-y-12">
            <div className="relative w-full aspect-square md:aspect-[4/3] rounded-xl overflow-hidden bg-surface-container-lowest shadow-[0_40px_80px_rgba(229,226,225,0.04)]">
              <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover scale-105 transform hover:scale-110 transition-transform duration-700 ease-out" />
              <div className="absolute top-6 left-6 bg-surface/80 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 border border-outline-variant/15">
                <span className="material-symbols-outlined text-tertiary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                <span className="font-label text-xs tracking-[0.05rem] uppercase text-on-surface font-bold">Wood-Fired</span>
              </div>
            </div>
            <div className="space-y-6 max-w-2xl">
              <h1 className="font-headline text-5xl md:text-6xl font-black tracking-tighter text-on-surface">{product.title}</h1>
              <p className="font-body text-lg text-on-surface-variant leading-relaxed">{product.description}</p>
            </div>
          </div>

          <div className="lg:col-span-5">
            <Configurator product={product} />
          </div>
        </div>
      </main>
    </>
  );
}
