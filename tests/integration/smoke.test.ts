import { describe, it, expect } from 'vitest';
import { Nopaque } from '../../src/index.js';

const apiKey = process.env.NOPAQUE_API_KEY;

describe.skipIf(!apiKey)('integration smoke (live dev API)', () => {
  const getClient = () => new Nopaque();

  it('list profiles returns without error', async () => {
    const client = getClient();
    let seen = 0;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _profile of client.profiles.list({ limit: 5 })) seen++;
    expect(seen).toBeGreaterThanOrEqual(0);
  });

  it('create/get/delete schedule round-trips', async () => {
    const client = getClient();
    const sched = await client.scheduler.create({
      name: 'sdk-smoke-test',
      configId: 'cfg_smoke',
      cronExpression: '0 0 * * *',
    });
    try {
      const got = await client.scheduler.get(sched.id);
      expect(got.id).toBe(sched.id);
    } finally {
      await client.scheduler.delete(sched.id);
    }
  });

  it('create audio upload URL succeeds (without actual upload)', async () => {
    const client = getClient();
    const res = await client.audio.createUploadUrl({
      fileName: 'smoke-test.wav',
      contentType: 'audio/wav',
    });
    expect(res.uploadUrl).toMatch(/^https:\/\//);
    expect(res.audioId).toBeTruthy();
  });
});
