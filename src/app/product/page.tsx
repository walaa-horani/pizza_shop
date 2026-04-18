'use client';

import { useState, useEffect } from 'react';
import Nav from '@/components/Nav';
import Link from 'next/link';

export default function ProductDetails() {
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedCrust, setSelectedCrust] = useState('Neapolitan');
  const [addons, setAddons] = useState<string[]>(['Double Mozzarella']);

  useEffect(() => {
    // Simulate fetching data
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const toggleAddon = (addon: string) => {
    setAddons(prev => 
      prev.includes(addon) ? prev.filter(a => a !== addon) : [...prev, addon]
    );
  };

  const basePrice = 18;
  const additionsTotal = addons.includes('Double Mozzarella') ? 4 : 0;
  const crustExtra = selectedCrust === 'Gluten-Free' ? 3 : 0;
  const totalPrice = (basePrice + additionsTotal + crustExtra) * quantity;

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
              {loading ? (
                <div className="w-full h-full bg-surface-container-high animate-pulse"></div>
              ) : (
                <>
                  <img alt="Margherita Verace" className="w-full h-full object-cover scale-105 transform hover:scale-110 transition-transform duration-700 ease-out" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD99kFiXiuoL0tAhAk6_6TktlUsoqP2fsQQsqr5sLl8jeLvRXVUoR25Anko_xVVgcGH26GIQwlBJWr82C4m0su8OlbADBcEvSa_T3hZmBMy4R9OnOPFfzcsF_HoqM8DlQAZVexCO3HrX_bkFR-XflQt4OVQFdiJZmZQW8150jkGKHvzj1ag1hsUketjP6mGeYL2Yi0giibwIczsIwyRxgUY9SLcqVOWNhqtvV-lUv1OYKmBATrUzzBb-it_Vs8YOPXG2dg1yyWYoHU" />
                  <div className="absolute top-6 left-6 bg-surface/80 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 outline-variant/15 border border-outline-variant/15 mt-[100px] lg:mt-0">
                    <span className="material-symbols-outlined text-tertiary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                    <span className="font-label text-xs tracking-[0.05rem] uppercase text-on-surface font-bold">Wood-Fired</span>
                  </div>
                </>
              )}
            </div>
            
            <div className="space-y-6 max-w-2xl">
              {loading ? (
                <>
                  <div className="h-16 bg-surface-container-high animate-pulse rounded w-3/4"></div>
                  <div className="h-20 bg-surface-container-high animate-pulse rounded w-full"></div>
                  <div className="flex gap-4">
                    <div className="h-8 bg-surface-container-high animate-pulse rounded w-32"></div>
                    <div className="h-8 bg-surface-container-high animate-pulse rounded w-24"></div>
                    <div className="h-8 bg-surface-container-high animate-pulse rounded w-40"></div>
                  </div>
                </>
              ) : (
                <>
                  <h1 className="font-headline text-5xl md:text-6xl font-black tracking-tighter text-on-surface">
                    Margherita Verace
                  </h1>
                  <p className="font-body text-lg text-on-surface-variant leading-relaxed">
                    The purest expression of Neapolitan tradition. San Marzano tomatoes D.O.P. from the slopes of Mount Vesuvius, fresh buffalo mozzarella from Campania, hand-torn basil, and a drizzle of organic extra virgin olive oil. Baked at 900°F for exactly 90 seconds.
                  </p>
                  <div className="flex flex-wrap gap-4 pt-4">
                    <div className="flex items-center gap-2 bg-surface-container-low px-4 py-2 rounded-lg">
                      <span className="material-symbols-outlined text-primary text-sm">nutrition</span>
                      <span className="font-label text-sm text-on-surface">San Marzano D.O.P.</span>
                    </div>
                    <div className="flex items-center gap-2 bg-surface-container-low px-4 py-2 rounded-lg">
                      <span className="material-symbols-outlined text-secondary text-sm">eco</span>
                      <span className="font-label text-sm text-on-surface">Fresh Basil</span>
                    </div>
                    <div className="flex items-center gap-2 bg-surface-container-low px-4 py-2 rounded-lg">
                      <span className="material-symbols-outlined text-surface-tint text-sm">water_drop</span>
                      <span className="font-label text-sm text-on-surface">Buffalo Mozzarella</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div className="lg:col-span-5">
            <div className="sticky top-32 space-y-8 bg-surface-container-low p-8 rounded-xl shadow-[0_30px_60px_rgba(229,226,225,0.03)] border border-outline-variant/10">
              <div className="flex justify-between items-end border-b border-outline-variant/15 pb-6">
                <div>
                  <span className="font-label text-sm tracking-[0.05rem] text-primary uppercase block mb-1">Base Price</span>
                  {loading ? (
                    <div className="h-10 bg-surface-container-high animate-pulse rounded w-24"></div>
                  ) : (
                    <div className="font-headline text-4xl font-bold text-tertiary">€{basePrice.toFixed(2)}</div>
                  )}
                </div>
                <div className="flex items-center gap-1 bg-surface-container-highest px-3 py-1 rounded-full">
                  <span className="material-symbols-outlined text-tertiary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="font-label text-sm font-bold text-on-surface">4.9</span>
                </div>
              </div>
              
              <div className="space-y-8 pt-2">
                <div className="space-y-4">
                  <h3 className="font-headline text-xl font-bold text-on-surface">Crust Style</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setSelectedCrust('Neapolitan')}
                      className={`flex flex-col items-start p-4 rounded-xl transition-all text-left ${selectedCrust === 'Neapolitan' ? 'bg-secondary-container text-on-secondary-container border border-transparent' : 'bg-surface-container-highest text-on-surface border border-outline-variant/15 hover:bg-surface-bright'}`}
                    >
                      <span className="font-label font-bold text-base mb-1">Traditional Neapolitan</span>
                      <span className={`font-body text-xs ${selectedCrust === 'Neapolitan' ? 'opacity-80' : 'text-on-surface-variant'}`}>Soft, airy, charred edges</span>
                    </button>
                    <button 
                      onClick={() => setSelectedCrust('Gluten-Free')}
                      className={`flex flex-col items-start p-4 rounded-xl transition-all text-left ${selectedCrust === 'Gluten-Free' ? 'bg-secondary-container text-on-secondary-container border border-transparent' : 'bg-surface-container-highest text-on-surface border border-outline-variant/15 hover:bg-surface-bright'}`}
                    >
                      <span className="font-label font-bold text-base mb-1">Gluten-Free Base</span>
                      <span className={`font-body text-xs ${selectedCrust === 'Gluten-Free' ? 'opacity-80' : 'text-on-surface-variant'}`}>+€3.00</span>
                    </button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-headline text-xl font-bold text-on-surface flex justify-between items-center">
                    Additions
                    <span className="font-label text-xs text-on-surface-variant font-normal normal-case">Optional</span>
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    <button onClick={() => toggleAddon('Extra Basil')} className={`px-5 py-2.5 rounded-xl font-label text-sm transition-colors border ${addons.includes('Extra Basil') ? 'bg-secondary-container text-on-secondary-container border-transparent shadow-[0_10px_20px_rgba(67,75,24,0.2)]' : 'bg-surface-container-highest text-on-surface hover:bg-surface-bright border-outline-variant/10'}`}>
                      Extra Basil (+€1)
                    </button>
                    <button onClick={() => toggleAddon('Nduja')} className={`px-5 py-2.5 rounded-xl font-label text-sm transition-colors border ${addons.includes('Nduja') ? 'bg-secondary-container text-on-secondary-container border-transparent shadow-[0_10px_20px_rgba(67,75,24,0.2)]' : 'bg-surface-container-highest text-on-surface hover:bg-surface-bright border-outline-variant/10'}`}>
                      Nduja (+€3)
                    </button>
                    <button onClick={() => toggleAddon('Double Mozzarella')} className={`px-5 py-2.5 rounded-xl font-label text-sm transition-colors border ${addons.includes('Double Mozzarella') ? 'bg-secondary-container text-on-secondary-container border-transparent shadow-[0_10px_20px_rgba(67,75,24,0.2)]' : 'bg-surface-container-highest text-on-surface hover:bg-surface-bright border-outline-variant/10'}`}>
                      Double Mozzarella (+€4)
                    </button>
                    <button onClick={() => toggleAddon('Chili Oil')} className={`px-5 py-2.5 rounded-xl font-label text-sm transition-colors border ${addons.includes('Chili Oil') ? 'bg-secondary-container text-on-secondary-container border-transparent shadow-[0_10px_20px_rgba(67,75,24,0.2)]' : 'bg-surface-container-highest text-on-surface hover:bg-surface-bright border-outline-variant/10'}`}>
                      Chili Oil (+€0)
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="font-label text-sm text-on-surface block">Special Instructions</label>
                  <div className="bg-surface-container-lowest rounded-lg p-1 border border-outline-variant/15 focus-within:border-primary/50 transition-colors">
                    <textarea className="w-full bg-transparent border-none text-on-surface font-body text-sm focus:ring-0 placeholder:text-on-surface-variant/50 resize-none outline-none p-3" placeholder="e.g. Please don't cut the pizza..." rows={2}></textarea>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 w-full z-40 bg-surface-container-highest/80 backdrop-blur-xl border-t border-outline-variant/10 shadow-[0_-20px_40px_rgba(0,0,0,0.2)]">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-start">
            <div className="flex flex-col">
              <span className="font-label text-xs text-on-surface-variant uppercase tracking-[0.05rem]">Total Price</span>
              <span className="font-headline text-2xl font-bold text-tertiary">€{totalPrice.toFixed(2)}</span>
            </div>
            
            <div className="flex items-center bg-surface-container-lowest rounded-full p-1 border border-outline-variant/20">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-bright transition-colors">
                <span className="material-symbols-outlined text-sm">remove</span>
              </button>
              <span className="font-headline text-base font-bold w-8 text-center text-on-surface">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-bright transition-colors">
                <span className="material-symbols-outlined text-sm">add</span>
              </button>
            </div>
          </div>
          
          <Link href="/cart" className="w-full md:w-auto bg-gradient-to-br from-primary to-primary-container text-surface-container-lowest font-headline font-bold text-lg px-12 py-4 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-3 shadow-[0_20px_40px_rgba(196,30,58,0.2)]">
            Add to Cart
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>shopping_bag</span>
          </Link>
        </div>
      </div>
    </>
  );
}
