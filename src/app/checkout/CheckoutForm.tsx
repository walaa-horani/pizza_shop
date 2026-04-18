'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCartStore } from '@/lib/cart/store';
import { summarize } from '@/lib/cart/pricing';
import { checkout } from '@/actions/checkout';

type Errors = Record<string, string[] | undefined>;

export default function CheckoutForm() {
  const items = useCartStore((s) => s.items);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [deliverySpeed, setDeliverySpeed] = useState<'express' | 'standard'>('express');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const summary = summarize(items, deliverySpeed);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (items.length === 0) {
      setFormError('Cart is empty.');
      return;
    }
    setSubmitting(true);
    setErrors({});
    setFormError(null);
    const result = await checkout({
      form: { fullName, email, street, city, postalCode, deliverySpeed },
      items,
    });
    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      setFormError(result.formError ?? null);
      setSubmitting(false);
      return;
    }
    window.location.href = result.url;
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24 w-full">
      <div className="lg:col-span-7 flex flex-col gap-8">
        <h1 className="font-headline text-3xl md:text-4xl font-bold tracking-tight text-on-surface">Delivery Details</h1>
        <div className="bg-surface-container-low rounded-3xl p-6 md:p-10 flex flex-col gap-6">
          <Field label="Full Name" value={fullName} onChange={setFullName} error={errors.fullName} />
          <Field label="Email" type="email" value={email} onChange={setEmail} error={errors.email} />
          <Field label="Street Address" value={street} onChange={setStreet} error={errors.street} />
          <div className="grid grid-cols-2 gap-6">
            <Field label="City" value={city} onChange={setCity} error={errors.city} />
            <Field label="Postal Code" value={postalCode} onChange={setPostalCode} error={errors.postalCode} />
          </div>
          <div className="pt-4">
            <label className="block text-xs uppercase tracking-[0.05rem] text-on-surface-variant font-bold mb-4">Delivery Speed</label>
            <div className="grid grid-cols-2 gap-4">
              {(['express', 'standard'] as const).map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setDeliverySpeed(s)}
                  className={`rounded-xl p-4 flex items-center justify-between text-left ${deliverySpeed === s ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-high hover:bg-surface-bright'}`}
                >
                  <span className="font-headline font-bold text-sm">{s === 'express' ? 'Express' : 'Standard'}</span>
                  <span className="font-headline font-bold text-sm">{s === 'express' ? '+$4.00' : 'Free'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-5">
        <div className="sticky top-8 flex flex-col gap-6 bg-surface-container-highest/80 backdrop-blur-xl rounded-[2rem] p-8">
          <div className="flex justify-between items-center">
            <h2 className="font-headline text-2xl font-bold">Your Tray</h2>
            <Link href="/cart" className="text-sm font-label text-primary uppercase tracking-widest">Edit</Link>
          </div>
          {!mounted ? (
            <p className="font-label text-on-surface-variant text-sm">Loading your cart…</p>
          ) : items.length === 0 ? (
            <p className="font-label text-on-surface-variant text-sm">Cart is empty. <Link href="/menu" className="text-primary">Browse menu</Link>.</p>
          ) : (
            items.map((item) => (
              <div key={item.lineId} className="flex gap-4 items-center">
                <img src={item.imageUrl} alt={item.productTitle} className="w-20 h-20 rounded-2xl object-cover" />
                <div className="flex-1">
                  <h3 className="font-headline font-bold text-lg">{item.productTitle} × {item.quantity}</h3>
                  <p className="font-label text-xs text-on-surface-variant">{item.size.name} · {item.crust.name}</p>
                </div>
                <span className="font-headline font-bold">${((item.basePrice + item.size.priceModifier + item.crust.priceModifier + item.toppings.reduce((a, t) => a + t.price, 0)) * item.quantity / 100).toFixed(2)}</span>
              </div>
            ))
          )}
          <div className="flex flex-col gap-3 pt-6 border-t border-outline-variant/20">
            <Row label="Subtotal" value={summary.subtotal} />
            <Row label="Taxes &amp; Fees" value={summary.taxes} />
            {summary.deliveryFee > 0 && <Row label="Express Delivery" value={summary.deliveryFee} />}
            {summary.discount > 0 && <Row label="Discount" value={-summary.discount} />}
            <div className="flex justify-between pt-2">
              <span className="font-headline text-lg font-bold">Total</span>
              <span className="font-headline text-2xl font-black text-tertiary">${(summary.total / 100).toFixed(2)}</span>
            </div>
          </div>
          {formError && <p className="text-error text-sm">{formError}</p>}
          <button
            type="submit"
            disabled={submitting || !mounted || items.length === 0}
            className="w-full bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-[1.5rem] py-5 px-8 font-headline font-bold text-lg disabled:opacity-50"
          >
            {submitting ? 'Redirecting…' : 'Proceed to Payment'}
          </button>
        </div>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string[];
  type?: string;
}) {
  return (
    <div className="relative bg-surface-container-lowest rounded-xl p-3 ring-1 ring-outline-variant/15 focus-within:ring-primary/50 transition-all">
      <label className="block text-[10px] uppercase tracking-wider text-on-surface-variant font-bold mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent text-on-surface font-body text-base outline-none" />
      {error?.[0] && <p className="text-error text-xs mt-1">{error[0]}</p>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-on-surface-variant font-label text-sm">
      <span>{label}</span>
      <span>{value < 0 ? '-' : ''}${(Math.abs(value) / 100).toFixed(2)}</span>
    </div>
  );
}
