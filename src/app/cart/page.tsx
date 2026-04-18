'use client';

import { useEffect, useState } from 'react';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { useCartStore } from '@/lib/cart/store';
import { summarize, lineTotal } from '@/lib/cart/pricing';

export default function Cart() {
  const [mounted, setMounted] = useState(false);
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  useEffect(() => setMounted(true), []);

  const summary = summarize(items, 'standard');

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col antialiased">
      <Nav />
      <main className="flex-grow pt-32 pb-24 px-6 md:px-12 max-w-[1600px] mx-auto w-full">
        <div className="mb-12">
          <h1 className="font-headline text-5xl md:text-6xl font-black tracking-tight text-on-background">Your Order</h1>
          <p className="font-body text-on-surface-variant mt-4 text-lg">Curated selections from the fire.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24">
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-12">
            {!mounted ? (
              <div className="p-12 text-center text-on-surface-variant bg-surface-container-low rounded-[2rem]">Loading…</div>
            ) : items.length === 0 ? (
              <div className="p-12 text-center text-on-surface-variant bg-surface-container-low rounded-[2rem]">
                Your cart is empty. <Link href="/menu" className="text-primary">Browse menu</Link>.
              </div>
            ) : (
              items.map((item, index) => (
                <div key={item.lineId} className="group flex flex-col sm:flex-row items-start sm:items-center gap-8 relative p-6 bg-surface-container-low rounded-[2rem]">
                  <div className={`w-full sm:w-40 h-40 sm:-mt-12 sm:-ml-8 flex-shrink-0 relative z-10 drop-shadow-[0_20px_30px_rgba(0,0,0,0.5)] transition-transform duration-500 group-hover:scale-105 ${index % 2 === 0 ? 'group-hover:rotate-2' : 'group-hover:-rotate-2'}`}>
                    <img alt={item.productTitle} className="w-full h-full object-cover rounded-full aspect-square border-4 border-surface-container-low" src={item.imageUrl} />
                  </div>
                  <div className="flex-grow flex flex-col sm:flex-row justify-between w-full items-start sm:items-center gap-6">
                    <div className="flex flex-col gap-2">
                      <h3 className="font-headline text-2xl font-bold">{item.productTitle}</h3>
                      <p className="font-body text-on-surface-variant text-sm">
                        {item.size.name} · {item.crust.name}
                        {item.toppings.length > 0 && ` · ${item.toppings.map((t) => t.title).join(', ')}`}
                      </p>
                      {item.specialInstructions && (
                        <p className="font-body text-on-surface-variant text-xs italic">&ldquo;{item.specialInstructions}&rdquo;</p>
                      )}
                      <span className="font-headline text-tertiary font-bold text-xl mt-2">
                        ${(lineTotal(item) / 100).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center bg-surface-container-lowest rounded-xl p-1 ring-1 ring-outline-variant/10">
                        <button onClick={() => updateQuantity(item.lineId, item.quantity - 1)} className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary">
                          <span className="material-symbols-outlined text-sm">remove</span>
                        </button>
                        <span className="font-headline font-bold w-8 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.lineId, item.quantity + 1)} className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary">
                          <span className="material-symbols-outlined text-sm">add</span>
                        </button>
                      </div>
                      <button onClick={() => removeItem(item.lineId)} className="text-outline hover:text-error transition-colors p-2">
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="lg:col-span-5 xl:col-span-4">
            <div className="sticky top-32 bg-surface/60 backdrop-blur-2xl ring-1 ring-outline-variant/15 rounded-[2rem] p-8 md:p-10">
              <h2 className="font-headline text-3xl font-bold mb-8">Summary</h2>
              <div className="flex flex-col gap-4 font-body text-on-surface-variant mb-8">
                <div className="flex justify-between"><span>Subtotal</span><span>${(summary.subtotal / 100).toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Taxes &amp; Fees</span><span>${(summary.taxes / 100).toFixed(2)}</span></div>
                {summary.discount > 0 && (
                  <div className="flex justify-between text-secondary"><span>Hearth Member Discount</span><span>-${(summary.discount / 100).toFixed(2)}</span></div>
                )}
              </div>
              <div className="bg-surface-container-lowest/50 rounded-2xl p-6 mb-8 flex justify-between items-end">
                <span className="font-headline">Total</span>
                <span className="font-headline text-4xl font-black text-tertiary">${(summary.total / 100).toFixed(2)}</span>
              </div>
              <Link
                href="/checkout"
                aria-disabled={items.length === 0}
                className={`w-full font-headline font-bold text-lg rounded-[1.5rem] py-5 flex justify-center items-center gap-3 transition-all ${items.length === 0 ? 'bg-surface-container-highest text-on-surface-variant pointer-events-none' : 'bg-gradient-to-br from-primary to-primary-container text-on-primary-fixed hover:shadow-[0_0_30px_rgba(196,30,58,0.4)]'}`}
              >
                Proceed to Checkout
                <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
