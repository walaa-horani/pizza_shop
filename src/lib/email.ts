import 'server-only';
import { Resend } from 'resend';
import { getServerEnv } from '@/lib/env';

export type EmailProduct = {
  _id: string;
  title: string;
  slug: string;
  description: string;
  imageUrl: string;
  basePrice: number;
};

export type EmailRecipient = { email: string; name?: string | null };

const BATCH_SIZE = 100;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeImageUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : '';
}

function renderEmailShell(params: {
  preheader: string;
  innerHtml: string;
  footerUrl: string;
}): string {
  const { preheader, innerHtml, footerUrl } = params;
  return `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#fff7ed;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#1f2937;">
    <span style="display:none !important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${escapeHtml(preheader)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 2px 8px rgba(217,72,15,0.08);">
            <tr>
              <td style="padding:20px 28px;background:#d9480f;color:#fff;font-weight:700;font-size:18px;letter-spacing:0.4px;">
                PIZZA&nbsp;SHOP
              </td>
            </tr>
            ${innerHtml}
            <tr>
              <td style="padding:18px 28px;background:#fff7ed;color:#6b7280;font-size:12px;text-align:center;">
                Pizza Shop · ${escapeHtml(footerUrl)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

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

export async function sendNewProductEmail(params: {
  product: EmailProduct;
  recipients: EmailRecipient[];
}): Promise<void> {
  const { product, recipients } = params;
  if (recipients.length === 0) return;

  const { RESEND_FROM_EMAIL, NEXT_PUBLIC_APP_URL } = getServerEnv();
  const client = getResend();
  const productUrl = `${NEXT_PUBLIC_APP_URL}/product/${product.slug}`;
  const subject = `🍕 New on the menu: ${product.title}`;
  const preheader = `Just dropped: ${product.title} — see what's cooking.`;

  for (const group of chunk(recipients, BATCH_SIZE)) {
    const payload = group.map((r) => ({
      from: RESEND_FROM_EMAIL,
      to: r.email,
      subject,
      html: newProductHtml({ product, productUrl, preheader, name: r.name }),
      text: newProductText({ product, productUrl, name: r.name }),
    }));
    try {
      await client.batch.send(payload);
    } catch (err) {
      console.error('sendNewProductEmail batch failed', { productId: product._id, err });
    }
  }
}

function newProductText(params: { product: EmailProduct; productUrl: string; name?: string | null }): string {
  const { product, productUrl, name } = params;
  const greeting = name ? `Hi ${name},` : 'Hi,';
  return `${greeting}\n\nNew on the menu at Pizza Shop: ${product.title}.\n\n${product.description}\n\nFrom ${formatCents(product.basePrice)}.\n\nOrder now: ${productUrl}`;
}

function newProductHtml(params: {
  product: EmailProduct;
  productUrl: string;
  preheader: string;
  name?: string | null;
}): string {
  const { product, productUrl, preheader, name } = params;
  const greeting = name ? `Hi ${escapeHtml(name)},` : 'Hi there,';
  const footerUrl = productUrl.replace(/\/product\/.*$/, '');
  const innerHtml = `
            <tr>
              <td style="padding:0;">
                <img src="${safeImageUrl(product.imageUrl)}" alt="${escapeHtml(product.title)}" width="600" style="display:block;width:100%;height:auto;border:0;">
              </td>
            </tr>
            <tr>
              <td style="padding:28px 28px 8px 28px;">
                <div style="text-transform:uppercase;letter-spacing:2px;color:#d9480f;font-size:12px;font-weight:700;margin-bottom:10px;">NEW ON THE MENU</div>
                <h1 style="margin:0 0 12px 0;font-size:28px;line-height:1.2;color:#1f2937;">${escapeHtml(product.title)}</h1>
                <p style="margin:0 0 10px 0;font-size:14px;color:#6b7280;">${greeting}</p>
                <p style="margin:0 0 20px 0;font-size:16px;line-height:1.55;color:#1f2937;">${escapeHtml(product.description)}</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:4px 28px 8px 28px;">
                <a href="${productUrl}" style="display:inline-block;padding:14px 28px;background:#d9480f;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;font-size:16px;">Order Now</a>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:6px 28px 28px 28px;font-size:13px;color:#6b7280;">
                From ${formatCents(product.basePrice)}
              </td>
            </tr>`;
  return renderEmailShell({ preheader, innerHtml, footerUrl });
}
