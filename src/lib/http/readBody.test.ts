import { describe, it, expect } from 'vitest';
import { readBodyWithLimit, BodyTooLargeError } from './readBody';

function reqWith(body: string, headers: Record<string, string> = {}) {
  return new Request('http://x', { method: 'POST', body, headers });
}

describe('readBodyWithLimit', () => {
  it('returns the body when under the limit', async () => {
    const out = await readBodyWithLimit(reqWith('hello'), 100);
    expect(out).toBe('hello');
  });

  it('rejects early on an oversized Content-Length header', async () => {
    const body = 'x'.repeat(10);
    const req = reqWith(body, { 'content-length': '10000' });
    await expect(readBodyWithLimit(req, 100)).rejects.toBeInstanceOf(BodyTooLargeError);
  });

  it('rejects during streaming when the body exceeds the limit', async () => {
    // Omit Content-Length by using a stream body so header-based check is skipped
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(encoder.encode('a'.repeat(50)));
        c.enqueue(encoder.encode('b'.repeat(60)));
        c.close();
      },
    });
    const req = new Request('http://x', {
      method: 'POST',
      body: stream,
      // @ts-expect-error — duplex is required by undici for streamed bodies
      duplex: 'half',
    });
    await expect(readBodyWithLimit(req, 100)).rejects.toBeInstanceOf(BodyTooLargeError);
  });

  it('accepts a body at exactly the limit', async () => {
    const body = 'a'.repeat(100);
    const out = await readBodyWithLimit(reqWith(body), 100);
    expect(out).toBe(body);
  });
});
