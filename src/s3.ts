import { APIConnectionError } from './errors.js';
import type { UploadInput } from './types/audio.js';
import { promises as fsp } from 'node:fs';
import { basename } from 'node:path';

export async function readBytes(input: UploadInput['file']): Promise<{
  bytes: Uint8Array;
  inferredName: string | null;
}> {
  if (typeof input === 'string') {
    const buf = await fsp.readFile(input);
    return { bytes: new Uint8Array(buf), inferredName: basename(input) };
  }
  if (input instanceof Uint8Array) {
    return { bytes: input, inferredName: null };
  }
  if (typeof Blob !== 'undefined' && input instanceof Blob) {
    const buf = await input.arrayBuffer();
    const name = (input as File).name ?? null;
    return { bytes: new Uint8Array(buf), inferredName: name };
  }
  if (typeof (input as ReadableStream).getReader === 'function') {
    const reader = (input as ReadableStream<Uint8Array>).getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.byteLength;
    }
    const out = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) { out.set(c, off); off += c.byteLength; }
    return { bytes: out, inferredName: null };
  }
  if (typeof (input as NodeJS.ReadableStream).on === 'function') {
    const chunks: Buffer[] = [];
    for await (const chunk of input as NodeJS.ReadableStream) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer));
    }
    const buf = Buffer.concat(chunks);
    return { bytes: new Uint8Array(buf), inferredName: null };
  }
  throw new TypeError('unsupported file input');
}

const EXTENSION_MAP: Record<string, string> = {
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.mp4': 'audio/mp4',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.webm': 'audio/webm',
};

export function sniffContentType(name: string | null): string {
  if (!name) return 'application/octet-stream';
  const dot = name.lastIndexOf('.');
  const ext = dot >= 0 ? name.slice(dot).toLowerCase() : '';
  return EXTENSION_MAP[ext] ?? 'application/octet-stream';
}

export async function s3Put(
  url: string,
  data: Uint8Array,
  { contentType, fetch }: { contentType: string; fetch: typeof globalThis.fetch }
): Promise<void> {
  let resp: Response;
  try {
    resp = await fetch(url, {
      method: 'PUT',
      body: data as BodyInit,
      headers: { 'content-type': contentType },
    });
  } catch (err) {
    throw new APIConnectionError(`S3 PUT failed: ${(err as Error).message}`, err);
  }
  if (resp.status >= 400) {
    const text = await resp.text().catch(() => '');
    throw new APIConnectionError(`S3 PUT returned ${resp.status}: ${text.slice(0, 200)}`);
  }
}

export async function s3Get(
  url: string,
  { fetch }: { fetch: typeof globalThis.fetch }
): Promise<Uint8Array> {
  let resp: Response;
  try {
    resp = await fetch(url);
  } catch (err) {
    throw new APIConnectionError(`S3 GET failed: ${(err as Error).message}`, err);
  }
  if (resp.status >= 400) {
    const text = await resp.text().catch(() => '');
    throw new APIConnectionError(`S3 GET returned ${resp.status}: ${text.slice(0, 200)}`);
  }
  return new Uint8Array(await resp.arrayBuffer());
}
