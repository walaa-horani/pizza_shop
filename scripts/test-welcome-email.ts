import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

import { Resend } from 'resend';
import { z } from 'zod';

const env = z
  .object({
    RESEND_API_KEY: z.string().min(1),
    RESEND_FROM_EMAIL: z.string().email(),
  })
  .parse(process.env);

const to = process.argv[2];
if (!to) {
  console.error('usage: npx tsx scripts/test-welcome-email.ts <to-email>');
  process.exit(1);
}

const resend = new Resend(env.RESEND_API_KEY);

const { data, error } = await resend.emails.send({
  from: env.RESEND_FROM_EMAIL,
  to,
  subject: 'Welcome to Pizza Shop!',
  html: `
    <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto;">
      <h1 style="color: #d9480f;">Welcome to Pizza Shop!</h1>
      <p>Hi there,</p>
      <p>Thanks for signing up. This is a test send from the scripts/test-welcome-email.ts script.</p>
    </div>
  `,
  text: 'Welcome to Pizza Shop! Test send from scripts/test-welcome-email.ts',
});

if (error) {
  console.error('resend error:', error);
  process.exit(1);
}

console.log('sent:', data);
