import 'server-only';
import Link from 'next/link';
import { sanityClient } from '@/sanity/client';
import ClearCartOnMount from './ClearCartOnMount';

async function lookupOrder(sessionId: string) {
  return sanityClient.fetch(
    `*[_type == "order" && stripeSessionId == $id][0] {
      _id, orderNumber, status, total, currency
    }`,
    { id: sessionId },
  );
}

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  const order = session_id ? await lookupOrder(session_id) : null;

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col items-center justify-center px-6 text-center gap-6">
      <ClearCartOnMount />
      <span className="material-symbols-outlined text-6xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
      <h1 className="font-headline text-4xl font-bold">Order confirmed</h1>
      {order ? (
        <>
          <p className="font-body text-on-surface-variant">Order <span className="font-bold">{order.orderNumber}</span></p>
          <p className="font-body text-on-surface-variant">Total: ${(order.total / 100).toFixed(2)}</p>
        </>
      ) : (
        <p className="font-body text-on-surface-variant">We&apos;ll email you a receipt shortly.</p>
      )}
      <Link href="/menu" className="mt-4 bg-primary text-on-primary px-6 py-3 rounded-xl font-headline font-bold">
        Order more
      </Link>
    </div>
  );
}
