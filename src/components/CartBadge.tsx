'use client';

import Link from 'next/link';
import { useCartStore } from '@/lib/cart/store';
import { useEffect, useState } from 'react';

export default function CartBadge() {
  const [mounted, setMounted] = useState(false);
  const itemCount = useCartStore((s) => s.itemCount());
  useEffect(() => setMounted(true), []);
  const count = mounted ? itemCount : 0;

  return (
    <Link href="/cart" className="relative inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-container-highest transition-colors">
      <span className="material-symbols-outlined text-on-surface" style={{ fontVariationSettings: "'FILL' 1" }}>shopping_bag</span>
      {count > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-on-primary text-[10px] font-bold rounded-full flex items-center justify-center font-headline">
          {count}
        </span>
      )}
    </Link>
  );
}
