import Link from 'next/link';
import CheckoutForm from './CheckoutForm';

export default function CheckoutPage() {
  return (
    <div className="bg-surface text-on-surface font-body min-h-screen antialiased flex flex-col">
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
      <main className="flex-grow max-w-[1440px] mx-auto px-6 md:px-12 py-8 lg:py-16 w-full">
        <CheckoutForm />
      </main>
    </div>
  );
}
