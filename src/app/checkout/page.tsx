'use client';
import { useState } from 'react';
import Link from 'next/link';
import Nav from '@/components/Nav';

export default function Checkout() {
  const [deliverySpeed, setDeliverySpeed] = useState<'express' | 'standard'>('express');
  
  const subtotal = 52.00;
  const taxes = 5.20;
  // Let's add $4 to total if express is selected
  const deliveryFee = deliverySpeed === 'express' ? 4.00 : 0.00;
  const total = subtotal + taxes + deliveryFee;

  return (
    <>
      <div className="bg-surface text-on-surface font-body min-h-screen antialiased selection:bg-primary-container selection:text-on-primary-container flex flex-col">
        <header className="w-full px-8 py-6 flex items-center justify-between z-50 relative isolate">
          <div className="absolute inset-0 bg-surface/70 backdrop-blur-[20px] -z-10"></div>
          <Link href="/" className="text-2xl font-black tracking-tighter text-on-background font-headline uppercase hover:opacity-80 transition-opacity">
            HEARTH
          </Link>
          <div className="flex items-center gap-2 text-on-surface-variant">
            <span className="material-symbols-outlined text-xl">lock</span>
            <span className="font-label text-sm tracking-[0.05rem] uppercase font-bold">Secure Checkout</span>
          </div>
        </header>

        <main className="flex-grow max-w-[1440px] mx-auto px-6 md:px-12 py-8 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24 relative isolate w-full">
          <div className="lg:col-span-7 flex flex-col gap-12">
            
            <div className="flex items-center justify-between w-full max-w-md relative">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-surface-container-highest -z-10 rounded-full"></div>
              
              <div className="flex flex-col items-center gap-3 relative bg-surface px-2">
                <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-headline font-bold text-sm shadow-[0_0_20px_rgba(255,179,180,0.3)]">1</div>
                <span className="font-label text-xs tracking-[0.05rem] uppercase text-primary font-bold">Shipping</span>
              </div>
              
              <div className="flex flex-col items-center gap-3 relative bg-surface px-2">
                <div className="w-8 h-8 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center font-headline font-bold text-sm ring-1 ring-outline-variant/30">2</div>
                <span className="font-label text-xs tracking-[0.05rem] uppercase text-on-surface-variant font-medium">Payment</span>
              </div>
              
              <div className="flex flex-col items-center gap-3 relative bg-surface px-2">
                <div className="w-8 h-8 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center font-headline font-bold text-sm ring-1 ring-outline-variant/30">3</div>
                <span className="font-label text-xs tracking-[0.05rem] uppercase text-on-surface-variant font-medium">Review</span>
              </div>
            </div>

            <section className="flex flex-col gap-8">
              <div className="flex items-end justify-between">
                <h1 className="font-headline text-3xl md:text-4xl font-bold tracking-tight text-on-surface">Delivery Details</h1>
              </div>

              <div className="bg-surface-container-low rounded-3xl p-6 md:p-10 flex flex-col gap-6 shadow-[0_30px_60px_rgba(0,0,0,0.2)]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="relative bg-surface-container-lowest rounded-xl p-3 ring-1 ring-outline-variant/15 focus-within:ring-primary/50 transition-all group md:col-span-2">
                    <label className="block text-[10px] uppercase tracking-wider text-on-surface-variant font-bold mb-1 group-focus-within:text-primary transition-colors">Full Name</label>
                    <input className="w-full bg-transparent text-on-surface font-body text-base outline-none placeholder:text-on-surface-variant/30" placeholder="e.g. Massimo Bottura" type="text" />
                  </div>
                  <div className="relative bg-surface-container-lowest rounded-xl p-3 ring-1 ring-outline-variant/15 focus-within:ring-primary/50 transition-all group md:col-span-2">
                    <label className="block text-[10px] uppercase tracking-wider text-on-surface-variant font-bold mb-1 group-focus-within:text-primary transition-colors">Street Address</label>
                    <input className="w-full bg-transparent text-on-surface font-body text-base outline-none placeholder:text-on-surface-variant/30" placeholder="Via dei Tribunali 32" type="text" />
                  </div>
                  <div className="relative bg-surface-container-lowest rounded-xl p-3 ring-1 ring-outline-variant/15 focus-within:ring-primary/50 transition-all group">
                    <label className="block text-[10px] uppercase tracking-wider text-on-surface-variant font-bold mb-1 group-focus-within:text-primary transition-colors">City</label>
                    <input className="w-full bg-transparent text-on-surface font-body text-base outline-none placeholder:text-on-surface-variant/30" placeholder="Napoli" type="text" />
                  </div>
                  <div className="relative bg-surface-container-lowest rounded-xl p-3 ring-1 ring-outline-variant/15 focus-within:ring-primary/50 transition-all group">
                    <label className="block text-[10px] uppercase tracking-wider text-on-surface-variant font-bold mb-1 group-focus-within:text-primary transition-colors">Postal Code</label>
                    <input className="w-full bg-transparent text-on-surface font-body text-base outline-none placeholder:text-on-surface-variant/30" placeholder="80138" type="text" />
                  </div>
                </div>

                <div className="pt-4 flex flex-col gap-4">
                  <label className="block text-xs uppercase tracking-[0.05rem] text-on-surface-variant font-bold">Delivery Speed</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button 
                      onClick={() => setDeliverySpeed('express')}
                      className={`rounded-xl p-4 flex items-center justify-between cursor-pointer transition-colors text-left ${deliverySpeed === 'express' ? 'bg-secondary-container text-on-secondary-container ring-1 ring-secondary-fixed/30 shadow-inner' : 'bg-surface-container-high hover:bg-surface-bright text-on-surface border-none'}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`material-symbols-outlined ${deliverySpeed === 'express' ? '' : 'text-on-surface-variant'}`} style={{ fontVariationSettings: deliverySpeed === 'express' ? "'FILL' 1" : "" }}>bolt</span>
                        <div className="flex flex-col">
                          <span className="font-headline font-bold text-sm">Express Hearth</span>
                          <span className={`font-label text-xs ${deliverySpeed === 'express' ? 'opacity-80' : 'text-on-surface-variant'}`}>Under 30 mins</span>
                        </div>
                      </div>
                      <span className={`font-headline font-bold text-sm ${deliverySpeed === 'express' ? '' : 'text-on-surface-variant'}`}>+$4.00</span>
                    </button>

                    <button 
                      onClick={() => setDeliverySpeed('standard')}
                      className={`rounded-xl p-4 flex items-center justify-between cursor-pointer transition-colors text-left ${deliverySpeed === 'standard' ? 'bg-secondary-container text-on-secondary-container ring-1 ring-secondary-fixed/30 shadow-inner' : 'bg-surface-container-high hover:bg-surface-bright text-on-surface border-none'}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`material-symbols-outlined ${deliverySpeed === 'standard' ? '' : 'text-on-surface-variant'}`} style={{ fontVariationSettings: deliverySpeed === 'standard' ? "'FILL' 1" : "" }}>schedule</span>
                        <div className="flex flex-col">
                          <span className="font-headline font-bold text-sm">Standard</span>
                          <span className={`font-label text-xs ${deliverySpeed === 'standard' ? 'opacity-80' : 'text-on-surface-variant'}`}>45-60 mins</span>
                        </div>
                      </div>
                      <span className={`font-headline font-bold text-sm ${deliverySpeed === 'standard' ? '' : 'text-on-surface-variant'}`}>Free</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="lg:col-span-5 relative">
            <div className="sticky top-8 flex flex-col gap-8">
              
              <div className="bg-surface-container-highest/80 backdrop-blur-xl rounded-[2rem] p-8 flex flex-col gap-8 shadow-[0_40px_80px_rgba(0,0,0,0.5)] ring-1 ring-white/5">
                <div className="flex justify-between items-center">
                  <h2 className="font-headline text-2xl font-bold tracking-tight text-on-surface">Your Tray</h2>
                  <Link href="/cart" className="text-sm font-label text-primary hover:text-primary-container transition-colors uppercase tracking-widest">Edit</Link>
                </div>

                <div className="flex flex-col gap-6">
                  <div className="flex gap-4 items-center group">
                    <div className="w-20 h-20 rounded-2xl bg-surface-container-lowest overflow-hidden relative shadow-[0_10px_20px_rgba(0,0,0,0.3)] shrink-0">
                      <img alt="Margherita D.O.P." className="w-full h-full object-cover scale-110 group-hover:scale-100 transition-transform duration-500" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA2eMNq1MDwblb5LBq8Ugwwfdyd_hgh_D_YMe5wq7zu8FmUM3V1uPb7XkK9Qqch5qpgniBkvexZOCsG-NqMv5ZrLPyFXrjKCR4MyZukk6BlRt8tphVCsgxBWP0OqsWIrJ8TO_m_xqCt7FEVvH3ogdeAnLfpZo5MSfBbhf_TrhKCjuOtpng90aGb4xVXWYkbUxmcG5eGLBBeXyDKUmTxLXkGO9BHDSsFt8dY8zzKSk_v8ftZ04Bv6eMsCUjcJXDokoCHzBbiOm9Wlgw" />
                    </div>
                    <div className="flex flex-col flex-1 justify-center">
                      <div className="flex justify-between items-start">
                        <h3 className="font-headline font-bold text-lg text-on-surface leading-tight">Margherita D.O.P.</h3>
                        <span className="font-headline font-bold text-on-surface">$24</span>
                      </div>
                      <p className="font-label text-xs text-on-surface-variant mt-1">San Marzano, Bufala, Basil</p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-center group">
                    <div className="w-20 h-20 rounded-2xl bg-surface-container-lowest overflow-hidden relative shadow-[0_10px_20px_rgba(0,0,0,0.3)] shrink-0">
                      <img alt="Inferno" className="w-full h-full object-cover scale-110 group-hover:scale-100 transition-transform duration-500" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB-W4az51dSZa7e-jKgyum5dkUOYEiFlm1AceB_ywn8llibc6Yd9DBFxSEKfEZtKLX99vcZoxfDrMJEUQrYcQoF88ghzrlMYI88x6UFEWFRkbIgSj9LGlaNmO7hVGBxTmGOsexmzJhCHhtdSooPaMbQ5AjTJciMNKhWSt6poRmVYEl1nAXXdHHLyEboNTn4BeDltlAKnUyxvhr5WQf64W4wiV4_qQlhF7V7kE10lTxp4uHxv1Tk9YAX4WIwF0jhwCUg-I1IkFehS4A" />
                    </div>
                    <div className="flex flex-col flex-1 justify-center">
                      <div className="flex justify-between items-start">
                        <h3 className="font-headline font-bold text-lg text-on-surface leading-tight">Inferno</h3>
                        <span className="font-headline font-bold text-on-surface">$28</span>
                      </div>
                      <p className="font-label text-xs text-on-surface-variant mt-1">Spicy Nduja, Honey, Ricotta</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-6 mt-2 border-t border-outline-variant/20">
                  <div className="flex justify-between items-center text-on-surface-variant font-label text-sm">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-on-surface-variant font-label text-sm">
                    <span>Taxes & Fees</span>
                    <span>${taxes.toFixed(2)}</span>
                  </div>
                  {deliverySpeed === 'express' && (
                    <div className="flex justify-between items-center text-on-surface-variant font-label text-sm">
                      <span>Express Delivery</span>
                      <span>${deliveryFee.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 mt-2">
                    <span className="font-headline text-lg font-bold text-on-surface">Total</span>
                    <span className="font-headline text-2xl font-black text-tertiary tracking-tight">${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-surface-container-lowest rounded-2xl p-4 flex flex-col gap-4 ring-1 ring-outline-variant/10 shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
                <div className="flex items-center gap-2 px-2">
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
                  <span className="font-label text-xs uppercase tracking-widest text-on-surface font-bold">Live Tracking Ready</span>
                </div>
                <div className="h-40 w-full rounded-xl overflow-hidden relative isolate group">
                  <img alt="Map Tracking" className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-luminosity group-hover:opacity-70 group-hover:scale-105 transition-all duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD7SL04NEAjNyJljSU8FHOncKOgjGjc0aHBeX05sAJHtKCVxPD1jpcyhC1Kv1lU5qhzj_E1CvIOb2SiWrOzTuCGkBbKEJMRX4lrDb3lWgEumLVXdq0ZPZU0qfa4MzuV85AcopZNRkY17vMhTMi-6t13x8rcKmbf_oyIMlQ6DOe_n7ec0kqEvo4HB5iff4H6UFqqzOkWze9C5MvXsr8AS0e6C0nz86OXnmLmNbBuI8ypgC3xpo0s9hnaAfxVIZIh7cK-alDXzksB_f4" />
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest/80 to-transparent"></div>
                  <div className="absolute bottom-3 left-3 bg-surface-container-highest/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-outline-variant/20 flex items-center gap-2 shadow-lg">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                    <span className="font-headline text-xs font-bold text-on-surface">Oven to Door: ~{deliverySpeed === 'express' ? '30m' : '45m'}</span>
                  </div>
                </div>
              </div>

              <button className="w-full bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-[1.5rem] py-5 px-8 font-headline font-bold text-lg shadow-[0_15px_30px_rgba(196,30,58,0.15)] hover:shadow-[0_20px_40px_rgba(196,30,58,0.3)] hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2 group">
                <span>Proceed to Payment</span>
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
