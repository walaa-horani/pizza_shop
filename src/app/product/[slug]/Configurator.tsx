'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProductDetail } from '@/sanity/types';
import { useCartStore } from '@/lib/cart/store';
import { lineUnitPrice } from '@/lib/cart/pricing';

export default function Configurator({ product }: { product: ProductDetail }) {
  const defaultSize = product.sizes.find((s) => s.default) ?? product.sizes[0];
  const defaultCrust = product.crustOptions.find((c) => c.default) ?? product.crustOptions[0];

  const [size, setSize] = useState(defaultSize);
  const [crust, setCrust] = useState(defaultCrust);
  const [selectedToppingSlugs, setSelectedToppingSlugs] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  const toppings = product.availableToppings.filter((t) => selectedToppingSlugs.includes(t.slug));

  const unit = useMemo(
    () =>
      lineUnitPrice({
        lineId: '',
        productId: product._id,
        productSlug: product.slug,
        productTitle: product.title,
        imageUrl: product.imageUrl,
        basePrice: product.basePrice,
        size: { name: size.name, priceModifier: size.priceModifier },
        crust: { name: crust?.name ?? 'Standard', priceModifier: crust?.priceModifier ?? 0 },
        toppings: toppings.map((t) => ({ slug: t.slug, title: t.title, price: t.price })),
        quantity: 1,
      }),
    [product, size, crust, toppings],
  );
  const total = unit * quantity;

  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);

  function toggleTopping(slug: string) {
    setSelectedToppingSlugs((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }

  function handleAdd() {
    addItem({
      productId: product._id,
      productSlug: product.slug,
      productTitle: product.title,
      imageUrl: product.imageUrl,
      basePrice: product.basePrice,
      size: { name: size.name, priceModifier: size.priceModifier },
      crust: { name: crust?.name ?? 'Standard', priceModifier: crust?.priceModifier ?? 0 },
      toppings: toppings.map((t) => ({ slug: t.slug, title: t.title, price: t.price })),
      specialInstructions: notes || undefined,
      quantity,
    });
    router.push('/cart');
  }

  return (
    <div className="sticky top-32 space-y-8 bg-surface-container-low p-8 rounded-xl shadow-[0_30px_60px_rgba(229,226,225,0.03)] border border-outline-variant/10">
      <div className="flex justify-between items-end border-b border-outline-variant/15 pb-6">
        <div>
          <span className="font-label text-sm tracking-[0.05rem] text-primary uppercase block mb-1">Unit Price</span>
          <div className="font-headline text-4xl font-bold text-tertiary">${(unit / 100).toFixed(2)}</div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-headline text-xl font-bold text-on-surface">Size</h3>
        <div className="grid grid-cols-2 gap-3">
          {product.sizes.map((s) => {
            const active = s.name === size.name;
            return (
              <button
                key={s.name}
                onClick={() => setSize(s)}
                className={`p-3 rounded-xl text-left ${active ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-highest text-on-surface hover:bg-surface-bright'}`}
              >
                <span className="font-label font-bold block">{s.name}</span>
                <span className="font-body text-xs opacity-80">
                  {s.priceModifier === 0 ? 'included' : `${s.priceModifier > 0 ? '+' : ''}$${(s.priceModifier / 100).toFixed(2)}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {product.crustOptions.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-headline text-xl font-bold text-on-surface">Crust</h3>
          <div className="grid grid-cols-2 gap-3">
            {product.crustOptions.map((c) => {
              const active = c.name === crust?.name;
              return (
                <button
                  key={c.name}
                  onClick={() => setCrust(c)}
                  className={`p-3 rounded-xl text-left ${active ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-highest text-on-surface hover:bg-surface-bright'}`}
                >
                  <span className="font-label font-bold block">{c.name}</span>
                  <span className="font-body text-xs opacity-80">
                    {c.priceModifier === 0 ? 'included' : `+$${(c.priceModifier / 100).toFixed(2)}`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {product.availableToppings.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-headline text-xl font-bold text-on-surface">Toppings</h3>
          <div className="flex flex-wrap gap-3">
            {product.availableToppings.map((t) => {
              const active = selectedToppingSlugs.includes(t.slug);
              return (
                <button
                  key={t.slug}
                  onClick={() => toggleTopping(t.slug)}
                  className={`px-4 py-2 rounded-xl font-label text-sm border ${active ? 'bg-secondary-container text-on-secondary-container border-transparent' : 'bg-surface-container-highest text-on-surface border-outline-variant/10 hover:bg-surface-bright'}`}
                >
                  {t.title} {t.price > 0 ? `(+$${(t.price / 100).toFixed(2)})` : ''}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label className="font-label text-sm text-on-surface block">Special Instructions</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full bg-surface-container-lowest border border-outline-variant/15 rounded-lg p-3 text-on-surface font-body text-sm focus:border-primary/50 outline-none"
          rows={2}
          placeholder="e.g. Please don't cut the pizza…"
        />
      </div>

      <div className="flex items-center justify-between gap-4 pt-4 border-t border-outline-variant/15">
        <div className="flex items-center bg-surface-container-lowest rounded-full p-1 border border-outline-variant/20">
          <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-bright">
            <span className="material-symbols-outlined text-sm">remove</span>
          </button>
          <span className="font-headline text-base font-bold w-8 text-center text-on-surface">{quantity}</span>
          <button onClick={() => setQuantity((q) => q + 1)} className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-bright">
            <span className="material-symbols-outlined text-sm">add</span>
          </button>
        </div>
        <button
          onClick={handleAdd}
          className="flex-1 bg-gradient-to-br from-primary to-primary-container text-on-primary-fixed font-headline font-bold text-lg px-6 py-3 rounded-xl flex items-center justify-center gap-3 hover:opacity-90 transition-opacity"
        >
          Add to Cart · ${(total / 100).toFixed(2)}
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>shopping_bag</span>
        </button>
      </div>
    </div>
  );
}
