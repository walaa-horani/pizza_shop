import 'server-only';

export const DEFAULT_MAX_BODY_BYTES = 64 * 1024; // 64 KiB — plenty for webhook JSON

export class BodyTooLargeError extends Error {
  readonly limit: number;
  constructor(limit: number) {
    super(`request body exceeds ${limit} bytes`);
    this.name = 'BodyTooLargeError';
    this.limit = limit;
  }
}

// Reads request body as text while enforcing a maximum byte length.
// Rejects early on an oversized Content-Length header and also enforces the
// limit while streaming, so a chunked request cannot bypass the check.
export async function readBodyWithLimit(
  req: Request,
  limit: number = DEFAULT_MAX_BODY_BYTES,
): Promise<string> {
  const declared = req.headers.get('content-length');
  if (declared) {
    const n = Number(declared);
    if (Number.isFinite(n) && n > limit) {
      throw new BodyTooLargeError(limit);
    }
  }

  if (!req.body) return '';

  const reader = req.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let out = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      try { await reader.cancel(); } catch { /* best-effort */ }
      throw new BodyTooLargeError(limit);
    }
    out += decoder.decode(value, { stream: true });
  }
  out += decoder.decode();
  return out;
}
