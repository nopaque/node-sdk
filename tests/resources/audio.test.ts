import { describe, it, expect } from 'vitest';
import { Nopaque } from '../../src/index.js';
import { NotFoundError } from '../../src/errors.js';
import { makeQueuedFetch } from '../helpers/mockFetch.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

function client(fetch: typeof globalThis.fetch) {
  return new Nopaque({ apiKey: 'k', fetch, maxRetries: 0 });
}

describe('AudioResource', () => {
  it('list: returns paginated items', async () => {
    const { fetch } = makeQueuedFetch([
      { body: { items: [{ id: 'aud_1', fileName: 'a.wav', contentType: 'audio/wav' }], nextToken: null } },
    ]);
    const c = client(fetch);
    const out = [];
    for await (const a of c.audio.list()) out.push(a);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('aud_1');
  });

  it('list: paginates', async () => {
    const { fetch } = makeQueuedFetch([
      { body: { items: [{ id: 'aud_1', fileName: 'a.wav', contentType: 'audio/wav' }], nextToken: 't1' } },
      { body: { items: [{ id: 'aud_2', fileName: 'b.wav', contentType: 'audio/wav' }], nextToken: null } },
    ]);
    const c = client(fetch);
    const out = [];
    for await (const a of c.audio.list()) out.push(a);
    expect(out.map((x) => x.id)).toEqual(['aud_1', 'aud_2']);
  });

  it('get: returns the audio file', async () => {
    const { fetch } = makeQueuedFetch([
      { body: { id: 'aud_1', fileName: 'a.wav', contentType: 'audio/wav', sizeBytes: 1024 } },
    ]);
    const c = client(fetch);
    const f = await c.audio.get('aud_1');
    expect(f.sizeBytes).toBe(1024);
  });

  it('get: 404 throws NotFoundError', async () => {
    const { fetch } = makeQueuedFetch([{ status: 404, body: { error: 'not found' } }]);
    const c = client(fetch);
    await expect(c.audio.get('missing')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('delete: returns void', async () => {
    const { fetch } = makeQueuedFetch([{ body: { message: 'ok' } }]);
    const c = client(fetch);
    await expect(c.audio.delete('aud_1')).resolves.toBeUndefined();
  });

  it('createUploadUrl: sends expected body', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { uploadUrl: 'https://s3.example/sign', audioId: 'aud_xyz', expiresIn: 3600 } },
    ]);
    const c = client(fetch);
    const res = await c.audio.createUploadUrl({ fileName: 'a.wav', contentType: 'audio/wav' });
    expect(res.audioId).toBe('aud_xyz');
    expect(calls[0].init.body).toBe(JSON.stringify({ fileName: 'a.wav', contentType: 'audio/wav' }));
  });

  it('createDownloadUrl: adds audioId query param', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { downloadUrl: 'https://s3.example/dl', expiresIn: 3600 } },
    ]);
    const c = client(fetch);
    const res = await c.audio.createDownloadUrl('aud_1');
    expect(res.downloadUrl).toContain('s3.example');
    expect(calls[0].url).toContain('audioId=aud_1');
  });

  it('upload: presign → PUT → fetch metadata', async () => {
    const { fetch } = makeQueuedFetch([
      { body: { uploadUrl: 'https://s3.example/sign', audioId: 'aud_xyz', expiresIn: 3600 } },
      { status: 200 }, // S3 PUT
      { body: { id: 'aud_xyz', fileName: 'a.wav', contentType: 'audio/wav' } },
    ]);
    const c = client(fetch);
    const tmp = path.join(os.tmpdir(), 'sdk-upload-test.wav');
    await fs.writeFile(tmp, Buffer.from('RIFFWAVE'));
    const a = await c.audio.upload({ file: tmp, contentType: 'audio/wav' });
    expect(a.id).toBe('aud_xyz');
    await fs.unlink(tmp).catch(() => {});
  });

  it('download: returns bytes when no `to`', async () => {
    const { fetch } = makeQueuedFetch([
      { body: { downloadUrl: 'https://s3.example/dl', expiresIn: 60 } },
      { status: 200, text: 'BYTES' },
    ]);
    const c = client(fetch);
    const data = await c.audio.download('aud_1');
    expect(new TextDecoder().decode(data)).toBe('BYTES');
  });

  it('download: writes to path when `to` is given', async () => {
    const { fetch } = makeQueuedFetch([
      { body: { downloadUrl: 'https://s3.example/dl', expiresIn: 60 } },
      { status: 200, text: 'BYTES' },
    ]);
    const tmp = path.join(os.tmpdir(), 'sdk-download-test.wav');
    const c = client(fetch);
    await c.audio.download('aud_1', { to: tmp });
    const read = await fs.readFile(tmp, 'utf-8');
    expect(read).toBe('BYTES');
    await fs.unlink(tmp).catch(() => {});
  });
});
