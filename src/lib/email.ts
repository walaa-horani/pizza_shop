import 'server-only';
import { Resend } from 'resend';
import { getServerEnv } from '@/lib/env';

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function applyDiscount(cents: number, percent: number): number {
  return Math.round(cents * (1 - percent / 100));
}

let resendClient: Resend | null = null;

function getResend(): Resend {
  if (!resendClient) {
    const { RESEND_API_KEY } = getServerEnv();
    resendClient = new Resend(RESEND_API_KEY);
  }
  return resendClient;
}

export async function sendWelcomeEmail(params: {
  to: string;
  name?: string;
}): Promise<void> {
  const { to, name } = params;
  if (!to) return;

  const { RESEND_FROM_EMAIL, NEXT_PUBLIC_APP_URL } = getServerEnv();
  const greeting = name ? `Hi ${name},` : 'Hi there,';

  const { error } = await getResend().emails.send({
    from: RESEND_FROM_EMAIL,
    to,
    subject: 'Welcome to Pizza Shop!',
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto;">
        <h1 style="color: #d9480f;">Welcome to Pizza Shop!</h1>
        <p>${greeting}</p>
        <p>Thanks for signing up. We're excited to have you with us. Your account is ready — jump in and explore the menu.</p>
        <p>
          <a href="${NEXT_PUBLIC_APP_URL}" style="display:inline-block;padding:10px 18px;background:#d9480f;color:#fff;border-radius:6px;text-decoration:none;">
            Order your first pizza
          </a>
        </p>
        <p style="color:#666;font-size:13px;margin-top:32px;">If you didn't create this account, you can ignore this email.</p>
      </div>
    `,
    text: `${greeting}\n\nThanks for signing up to Pizza Shop! Your account is ready — visit ${NEXT_PUBLIC_APP_URL} to order your first pizza.\n\nIf you didn't create this account, you can ignore this email.`,
  });

  if (error) {
    throw new Error(`resend failed: ${error.message}`);
  }
}
