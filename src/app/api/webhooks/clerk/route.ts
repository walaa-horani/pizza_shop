import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { getSanityWriteClient } from '@/sanity/serverClient';
import { getServerEnv } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ClerkUserEvent = {
  type: string;
  data: {
    id: string;
    email_addresses?: { email_address: string; id: string }[];
    primary_email_address_id?: string;
    first_name?: string;
    last_name?: string;
  };
};

export async function POST(req: Request): Promise<Response> {
  const { CLERK_WEBHOOK_SECRET } = getServerEnv();
  const payload = await req.text();

  const svixId = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'missing svix headers' }, { status: 400 });
  }

  const wh = new Webhook(CLERK_WEBHOOK_SECRET);
  let event: ClerkUserEvent;
  try {
    event = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkUserEvent;
  } catch (err) {
    console.error('clerk webhook signature failed', err);
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  const write = getSanityWriteClient();

  if (event.type === 'user.created' || event.type === 'user.updated') {
    const primary = event.data.email_addresses?.find((e) => e.id === event.data.primary_email_address_id);
    const email = primary?.email_address ?? event.data.email_addresses?.[0]?.email_address ?? '';
    const name = [event.data.first_name, event.data.last_name].filter(Boolean).join(' ').trim() || undefined;

    const existing = await write.fetch(
      `*[_type == "user" && clerkUserId == $id][0]._id`,
      { id: event.data.id },
    );
    if (existing) {
      await write.patch(existing).set({ email, name }).commit();
    } else {
      await write.create({ _type: 'user', clerkUserId: event.data.id, email, name });
    }
  }

  return NextResponse.json({ received: true });
}
