'use client';
import { useState, useEffect } from 'react';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Link from 'next/link';

interface CartItem {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  image: string;
}

const mockCartItems: CartItem[] = [
  {
    id: 'margherita',
    name: 'Margherita Verace',
    description: 'San Marzano DOP, Fior di Latte, Fresh Basil, EVOO.',
    price: 22.00,
    quantity: 1,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBmFQU92D0Zd0svfDM43e180uCSB5cKL7gjKsLHTmzuBtIOOXXBhkk9wsQG0F3R5CW35W9dVPWLrnOhiGUEjgp8lfXHURDrC6BIpBdQ_-utA8yvrSfzMHXaWAvsLkqCuo0xxM--a1FmkzahhuDb1w7rNWkHKXpzci4PnjR4fPhFcV9J4qhAD1EOTaEEz6ZP6LhRXAZSi_7xB8UhXzhblLwqc0J0aWvBR7A62MYeUmhci3MPF5QwG_QhL9w07qSO14-5ZIMwa3PcVJI'
  },
  {
    id: 'inferno',
    name: 'Inferno Nduja',
    description: 'Spicy Nduja, Calabrian Chilies, Smoked Provola, Honey.',
    price: 26.00,
    quantity: 2,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuApnC1nAedVyBQFulePhwHI6A5-ilOpaomfebw5P_wDvtZQ8L7uegI7lJ91sjJz1HxihOWj_pjw9ON2oBPtQTlzSa9CRwHjMoaw066u44SYAm6MJBmH3WqoGC05WNoyFEbk5TQz0HcKbHC4Dtc7gnkwOxZ6KnaAY8OVwuTziZQdngqkYCAHIlr7K42NkXF5pznQjO90GhAR189KJZGOzGoaBekhapW-9khOEQBOsn0XLrb6OKq__pM-umbGtXdLFNgeZTHMk7jbXKc'
  }
];

function SkeletonCartItem() {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-8 relative p-6 bg-surface-container-low rounded-[2rem] animate-pulse">
      <div className="w-full sm:w-40 h-40 sm:-mt-12 sm:-ml-8 flex-shrink-0 bg-surface-container-high rounded-full border-4 border-surface-container-low"></div>
      <div className="flex-grow flex flex-col sm:flex-row justify-between w-full items-start sm:items-center gap-6">
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <div className="h-6 bg-surface-container-high rounded w-3/4 mb-1"></div>
          <div className="h-3 bg-surface-container-high rounded w-full"></div>
          <div className="h-3 bg-surface-container-high rounded w-2/3"></div>
          <div className="h-6 bg-surface-container-high rounded w-16 mt-2"></div>
        </div>
        <div className="flex items-center gap-6">
          <div className="w-24 h-12 bg-surface-container-high rounded-xl"></div>
          <div className="w-8 h-8 bg-surface-container-high rounded-lg"></div>
        </div>
      </div>
    </div>
  );
}

export default function Cart() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setItems(mockCartItems);
      setLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const updateQuantity = (id: string, delta: number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const taxesFlow = subtotal * 0.085; // 8.5% tax roughly to match $6.29
  const discount = items.length > 0 ? 5.00 : 0;
  const total = subtotal + taxesFlow - discount;

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
            {loading ? (
              <>
                <SkeletonCartItem />
                <SkeletonCartItem />
              </>
            ) : items.length === 0 ? (
              <div className="p-12 text-center text-on-surface-variant bg-surface-container-low rounded-[2rem]">
                Your cart is empty.
              </div>
            ) : (
              items.map((item, index) => (
                <div key={item.id} className="group flex flex-col sm:flex-row items-start sm:items-center gap-8 relative p-6 bg-surface-container-low rounded-[2rem] shadow-[0_30px_60px_rgba(229,226,225,0.02)] hover:shadow-[0_30px_60px_rgba(229,226,225,0.05)] transition-all duration-500">
                  <div className={`w-full sm:w-40 h-40 sm:-mt-12 sm:-ml-8 flex-shrink-0 relative z-10 drop-shadow-[0_20px_30px_rgba(0,0,0,0.5)] transition-transform duration-500 group-hover:scale-105 ${index % 2 === 0 ? 'group-hover:rotate-2' : 'group-hover:-rotate-2'}`}>
                    <img 
                      alt={item.name} 
                      className="w-full h-full object-cover rounded-full aspect-square border-4 border-surface-container-low" 
                      src={item.image} 
                    />
                  </div>
                  <div className="flex-grow flex flex-col sm:flex-row justify-between w-full items-start sm:items-center gap-6">
                    <div className="flex flex-col gap-2">
                      <h3 className="font-headline text-2xl font-bold text-on-background">{item.name}</h3>
                      <p className="font-body text-on-surface-variant text-sm max-w-xs">{item.description}</p>
                      <span className="font-headline text-tertiary font-bold text-xl mt-2">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center bg-surface-container-lowest rounded-xl p-1 ring-1 ring-outline-variant/10">
                        <button onClick={() => updateQuantity(item.id, -1)} className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors rounded-lg hover:bg-surface-bright/50">
                          <span className="material-symbols-outlined text-sm">remove</span>
                        </button>
                        <span className="font-headline font-bold text-on-background w-8 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors rounded-lg hover:bg-surface-bright/50">
                          <span className="material-symbols-outlined text-sm">add</span>
                        </button>
                      </div>
                      <button onClick={() => removeItem(item.id)} className="text-outline hover:text-error transition-colors p-2">
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="lg:col-span-5 xl:col-span-4">
            <div className="sticky top-32 bg-surface/60 backdrop-blur-2xl ring-1 ring-outline-variant/15 rounded-[2rem] p-8 md:p-10 shadow-[0_40px_80px_rgba(0,0,0,0.4)] relative overflow-hidden">
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
              <h2 className="font-headline text-3xl font-bold text-on-background mb-8">Summary</h2>
              
              <div className="flex flex-col gap-6 font-body text-on-surface-variant mb-8">
                <div className="flex justify-between items-center">
                  <span className="tracking-[0.05rem] text-sm uppercase">Subtotal</span>
                  {loading ? (
                    <div className="h-5 w-16 bg-surface-container-high animate-pulse rounded"></div>
                  ) : (
                    <span className="font-headline font-medium text-on-background">${subtotal.toFixed(2)}</span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="tracking-[0.05rem] text-sm uppercase">Taxes & Fees</span>
                  {loading ? (
                    <div className="h-5 w-12 bg-surface-container-high animate-pulse rounded"></div>
                  ) : (
                    <span className="font-headline font-medium text-on-background">${taxesFlow.toFixed(2)}</span>
                  )}
                </div>
                <div className="flex justify-between items-center text-secondary">
                  <span className="tracking-[0.05rem] text-sm uppercase flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">local_fire_department</span>
                    Hearth Member Discount
                  </span>
                  {loading ? (
                    <div className="h-5 w-12 bg-surface-container-high animate-pulse rounded"></div>
                  ) : (
                    <span className="font-headline font-medium">-${discount.toFixed(2)}</span>
                  )}
                </div>
              </div>

              <div className="bg-surface-container-lowest/50 rounded-2xl p-6 mb-8 flex justify-between items-end ring-1 ring-outline-variant/10">
                <span className="font-headline font-medium text-on-background">Total</span>
                {loading ? (
                  <div className="h-10 w-24 bg-surface-container-high animate-pulse rounded"></div>
                ) : (
                  <span className="font-headline text-4xl font-black text-tertiary">${Math.max(0, total).toFixed(2)}</span>
                )}
              </div>

              <Link href="/checkout" className="w-full bg-gradient-to-br from-primary to-primary-container text-on-primary-fixed font-headline font-bold text-lg rounded-[1.5rem] py-5 flex justify-center items-center gap-3 hover:shadow-[0_0_30px_rgba(196,30,58,0.4)] transition-all duration-300 transform active:scale-[0.98]">
                Proceed to Checkout
                <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
              
              <p className="font-body text-xs text-center text-on-surface-variant/60 mt-6 tracking-[0.05rem]">
                SECURE ENCRYPTED TRANSACTION
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
