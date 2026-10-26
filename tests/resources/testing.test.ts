import { describe, it, expect } from 'vitest';
import { Nopaque, NopaqueTimeoutError } from '../../src/index.js';
import { makeQueuedFetch } from '../helpers/mockFetch.js';

function client(fetch: typeof globalThis.fetch) {
  return new Nopaque({ apiKey: 'k', fetch, maxRetries: 0 });
}

describe('TestingResource configs', () => {
  it('create', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { id: 'cfg_1', name: 'F', phoneNumber: '+441', steps: [] } },
    ]);
    const c = client(fetch);
    const cfg = await c.testing.configs.create({
      name: 'F',
      phoneNumber: '+441',
      steps: [],
    });
    expect(cfg.id).toBe('cfg_1');
    expect(calls[0].url).toContain('/testing/configs');
  });

  it('list', async () => {
    // Server returns { configs: [...] }, not { items }.
    const { fetch } = makeQueuedFetch([
      { body: { configs: [{ id: 'cfg_1', name: 'A', phoneNumber: '+1', steps: [] }] } },
    ]);
    const c = client(fetch);
    const out = [];
    for await (const x of c.testing.configs.list()) out.push(x);
    expect(out).toHaveLength(1);
  });

  it('get / update / delete', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { id: 'cfg_1', name: 'A', phoneNumber: '+1', steps: [] } },
      { body: { id: 'cfg_1', name: 'B', phoneNumber: '+1', steps: [] } },
      { body: { message: 'ok' } },
    ]);
    const c = client(fetch);
    await c.testing.configs.get('cfg_1');
    await c.testing.configs.update('cfg_1', { name: 'B' });
    await c.testing.configs.delete('cfg_1');
    expect(calls[1].init.method).toBe('PUT');
    expect(calls[2].init.method).toBe('DELETE');
  });
});

describe('TestingResource jobs', () => {
  it('create', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { id: 'job_1', configId: 'cfg_1', status: 'created' } },
    ]);
    const c = client(fetch);
    const job = await c.testing.jobs.create({ configId: 'cfg_1' });
    expect(job.id).toBe('job_1');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ configId: 'cfg_1' });
  });

  it('list / get / delete', async () => {
    const { fetch, calls } = makeQueuedFetch([
      // Server returns { jobs: [...] }, not { items }.
      { body: { jobs: [{ id: 'job_1', configId: 'cfg_1', status: 'completed' }] } },
      { body: { id: 'job_1', configId: 'cfg_1', status: 'completed' } },
      { body: { message: 'ok' } },
    ]);
    const c = client(fetch);
    const out = [];
    for await (const x of c.testing.jobs.list()) out.push(x);
    expect(out).toHaveLength(1);
    await c.testing.jobs.get('job_1');
    await c.testing.jobs.delete('job_1');
    expect(calls[2].init.method).toBe('DELETE');
  });
});

describe('TestingResource runs', () => {
  it('create from jobId unwraps {message, run}', async () => {
    const { fetch, calls } = makeQueuedFetch([
      {
        body: {
          message: 'Test run started',
          run: { id: 'run_1', jobId: 'job_1', status: 'pending' },
        },
      },
    ]);
    const c = client(fetch);
    const run = await c.testing.runs.create({ jobId: 'job_1' });
    expect(run.id).toBe('run_1');
    expect(run.status).toBe('pending');
    expect(calls[0].url).toContain('/testing/runs');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ jobId: 'job_1' });
  });

  it('create from testConfigId (ad-hoc) unwraps {message, run}', async () => {
    const { fetch, calls } = makeQueuedFetch([
      {
        body: {
          message: 'Test run started',
          run: { id: 'run_2', testConfigId: 'cfg_1', status: 'pending' },
        },
      },
    ]);
    const c = client(fetch);
    const run = await c.testing.runs.create({ testConfigId: 'cfg_1' });
    expect(run.id).toBe('run_2');
    expect(run.testConfigId).toBe('cfg_1');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ testConfigId: 'cfg_1' });
  });

  it('list / get', async () => {
    // Server returns { runs: [...] }, not { items }.
    const { fetch } = makeQueuedFetch([
      { body: { runs: [{ id: 'run_1', jobId: 'job_1', status: 'completed' }] } },
      { body: { id: 'run_1', jobId: 'job_1', status: 'completed', outcome: 'PASS' } },
    ]);
    const c = client(fetch);
    const out = [];
    for await (const r of c.testing.runs.list()) out.push(r);
    expect(out[0].id).toBe('run_1');
    const r = await c.testing.runs.get('run_1');
    // The API sends `outcome` (uppercase), never `result`.
    expect(r.outcome).toBe('PASS');
  });

  it('list sends filters and follows nextCursor', async () => {
    const { fetch, calls } = makeQueuedFetch([
      {
        body: {
          runs: [{ id: 'run_1', workspaceId: 'w', runType: 'mission', status: 'completed', outcome: 'PASS', startedAt: '' }],
          nextCursor: 'C2',
        },
      },
      { body: { runs: [{ id: 'run_2', workspaceId: 'w', runType: 'mission', status: 'running', startedAt: '' }] } },
    ]);
    const c = client(fetch);
    const out = [];
    for await (const r of c.testing.runs.list({ runType: 'mission', outcome: 'PASS' })) out.push(r);
    expect(out.map((r) => r.id)).toEqual(['run_1', 'run_2']);
    expect(calls[0].url).toContain('runType=mission');
    expect(calls[0].url).toContain('outcome=PASS');
    expect(calls[1].url).toContain('cursor=C2');
  });

  it('aggregateRuns returns grouped counts', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { groups: [{ key: 'PASS', count: 4 }, { key: 'FAIL', count: 1 }], truncated: false, totalGroups: 2 } },
    ]);
    const c = client(fetch);
    const res = await c.testing.aggregateRuns({ groupBy: 'outcome' });
    expect(res.totalGroups).toBe(2);
    expect(res.groups?.[0]).toEqual({ key: 'PASS', count: 4 });
    expect(calls[0].url).toContain('/testing/runs/aggregate');
    expect(calls[0].url).toContain('groupBy=outcome');
  });

  it('getMissionTestRun returns the mission-strict shape', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { id: 'mtr_1', workspaceId: 'w', status: 'completed', outcome: 'PASS', verdict: 'pass', startedAt: '' } },
    ]);
    const c = client(fetch);
    const run = await c.testing.getMissionTestRun('mtr_1');
    expect(run.verdict).toBe('pass');
    expect(calls[0].url).toContain('/testing/mission-test-runs/mtr_1');
  });

  it('waitForRun keeps polling until the verdict is written', async () => {
    // A run_status_changed{completed} can land before run_completed{outcome}:
    // separate SQS messages, no ordering guarantee. Polling on status alone
    // returned that row — outcome undefined, zero steps — on a passing run.
    const { fetch } = makeQueuedFetch([
      { body: { id: 'run_1', status: 'completed', stepResults: [] } },
      { body: { id: 'run_1', status: 'completed', outcome: 'pending', stepResults: [] } },
      {
        body: {
          id: 'run_1',
          status: 'completed',
          outcome: 'PASS',
          stepResults: [{ id: 's1', runId: 'run_1', stepIndex: 0, outcome: 'PASS' }],
        },
      },
    ]);
    const c = client(fetch);
    const run = await c.testing.runs.waitForRun('run_1', {
      timeout: 5000,
      pollInterval: 1,
    });
    expect(run.outcome).toBe('PASS');
    expect(run.stepResults).toHaveLength(1);
  });

  it('waitForRun settles immediately on failed, which carries no verdict', async () => {
    const { fetch } = makeQueuedFetch([{ body: { id: 'run_2', status: 'failed' } }]);
    const c = client(fetch);
    const run = await c.testing.runs.waitForRun('run_2', { timeout: 5000, pollInterval: 1 });
    expect(run.status).toBe('failed');
  });

  it('waitForRun returns on terminal', async () => {
    const { fetch } = makeQueuedFetch([
      { body: { id: 'run_1', jobId: 'job_1', status: 'running' } },
      { body: { id: 'run_1', jobId: 'job_1', status: 'completed', outcome: 'PASS' } },
    ]);
    const c = client(fetch);
    const run = await c.testing.runs.waitForRun('run_1', {
      timeout: 5000,
      pollInterval: 1,
    });
    expect(run.status).toBe('completed');
    expect(run.outcome).toBe('PASS');
  });

  it('waitForRun times out', async () => {
    const { fetch } = makeQueuedFetch(
      Array.from({ length: 50 }, () => ({
        body: { id: 'run_1', jobId: 'job_1', status: 'running' },
      }))
    );
    const c = client(fetch);
    await expect(
      c.testing.runs.waitForRun('run_1', { timeout: 30, pollInterval: 10 })
    ).rejects.toBeInstanceOf(NopaqueTimeoutError);
  });
});

describe('TestingResource.listVoices', () => {
  it('GETs /testing/voices and returns voices with the default', async () => {
    const { fetch, calls } = makeQueuedFetch([
      {
        body: {
          // Shape and values transcribed from the OpenAPI `Voice` examples.
          voices: [
            {
              voiceId: 'Telnyx.Ultra.c8f7835e-28a3-4f0c-80d7-c1302ac62aae',
              name: 'Alistair',
              language: 'en-GB',
              accent: 'British',
              gender: 'male',
              provider: 'telnyx',
              label: 'Warm British male narrator.',
              isDefault: true,
            },
          ],
          defaultVoiceId: 'Telnyx.Ultra.c8f7835e-28a3-4f0c-80d7-c1302ac62aae',
        },
      },
    ]);
    const c = client(fetch);
    const r = await c.testing.listVoices();
    expect(calls[0].url).toContain('/testing/voices');
    expect(calls[0].init.method).toBe('GET');
    expect(r.voices).toHaveLength(1);
    expect(r.voices[0].voiceId).toBe('Telnyx.Ultra.c8f7835e-28a3-4f0c-80d7-c1302ac62aae');
    expect(r.voices[0].name).toBe('Alistair');
    expect(r.voices[0].accent).toBe('British');
    expect(r.defaultVoiceId).toBe('Telnyx.Ultra.c8f7835e-28a3-4f0c-80d7-c1302ac62aae');
  });
});

const route = {
  routeId: 'rt_1',
  integrationId: 'ci_1',
  name: 'Vendor X',
  techPrefix: 'R7Q2#',
  customHeaders: [],
  enabled: true,
  dialable: true,
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
};

const integration = {
  integrationId: 'ci_1',
  name: 'London SBC',
  host: 'sbc.example.net',
  port: 5060,
  transport: 'UDP',
  mediaEncryption: 'disabled',
  status: 'active',
  hasCredentials: false,
  maxConcurrentCalls: 5,
  dailyMinutes: 300,
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
  routes: [route],
};

describe('TestingResource carrierIntegrations', () => {
  it('list unwraps {integrations}', async () => {
    const { fetch, calls } = makeQueuedFetch([{ body: { integrations: [integration] } }]);
    const c = client(fetch);
    const out = await c.testing.carrierIntegrations.list();
    expect(out).toHaveLength(1);
    expect(out[0].routes[0].routeId).toBe('rt_1');
    expect(calls[0].init.method).toBe('GET');
    expect(calls[0].url).toMatch(/\/testing\/carrier-integrations$/);
  });

  it('list returns [] for a workspace with none', async () => {
    const { fetch } = makeQueuedFetch([{ body: { integrations: [] } }]);
    const c = client(fetch);
    expect(await c.testing.carrierIntegrations.list()).toEqual([]);
  });

  it('get unwraps {integration}', async () => {
    const { fetch, calls } = makeQueuedFetch([{ body: { integration } }]);
    const c = client(fetch);
    const out = await c.testing.carrierIntegrations.get('ci_1');
    expect(out.integrationId).toBe('ci_1');
    expect(out.status).toBe('active');
    expect(calls[0].init.method).toBe('GET');
    expect(calls[0].url).toMatch(/\/testing\/carrier-integrations\/ci_1$/);
  });
});

describe('TestingResource carrierIntegrations.routes', () => {
  it('list unwraps {routes}', async () => {
    const { fetch, calls } = makeQueuedFetch([{ body: { routes: [route] } }]);
    const c = client(fetch);
    const out = await c.testing.carrierIntegrations.routes.list('ci_1');
    expect(out.map((r) => r.routeId)).toEqual(['rt_1']);
    expect(calls[0].init.method).toBe('GET');
    expect(calls[0].url).toMatch(/\/testing\/carrier-integrations\/ci_1\/routes$/);
  });

  it('get unwraps {route}', async () => {
    const { fetch, calls } = makeQueuedFetch([{ body: { route } }]);
    const c = client(fetch);
    const out = await c.testing.carrierIntegrations.routes.get('ci_1', 'rt_1');
    expect(out.dialable).toBe(true);
    expect(calls[0].init.method).toBe('GET');
    expect(calls[0].url).toMatch(/\/testing\/carrier-integrations\/ci_1\/routes\/rt_1$/);
  });

  it('create POSTs the body and unwraps {route}', async () => {
    const { fetch, calls } = makeQueuedFetch([{ status: 201, body: { route } }]);
    const c = client(fetch);
    const body = {
      name: 'Vendor X',
      techPrefix: 'R7Q2#',
      customHeaders: [{ name: 'X-Vendor-Route', value: 'vx' }],
    };
    const out = await c.testing.carrierIntegrations.routes.create('ci_1', body);
    expect(out.routeId).toBe('rt_1');
    expect(out.techPrefix).toBe('R7Q2#');
    expect(calls[0].init.method).toBe('POST');
    expect(calls[0].url).toMatch(/\/testing\/carrier-integrations\/ci_1\/routes$/);
    expect(JSON.parse(calls[0].init.body as string)).toEqual(body);
  });

  it('update PATCHes only the supplied fields and unwraps {route}', async () => {
    const { fetch, calls } = makeQueuedFetch([{ body: { route: { ...route, enabled: false, dialable: false } } }]);
    const c = client(fetch);
    const out = await c.testing.carrierIntegrations.routes.update('ci_1', 'rt_1', { enabled: false });
    expect(out.enabled).toBe(false);
    expect(calls[0].init.method).toBe('PATCH');
    expect(calls[0].url).toMatch(/\/testing\/carrier-integrations\/ci_1\/routes\/rt_1$/);
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ enabled: false });
  });

  it('encodes path segments', async () => {
    const { fetch, calls } = makeQueuedFetch([{ body: { route } }]);
    const c = client(fetch);
    await c.testing.carrierIntegrations.routes.get('ci/1', 'rt#1');
    expect(calls[0].url).toContain('/testing/carrier-integrations/ci%2F1/routes/rt%231');
  });
});

describe('TestingResource config fields', () => {
  it('configs.create sends every config field the API takes', async () => {
    const body = {
      name: 'Billing menu',
      phoneNumber: '+442071234567',
      steps: [],
      description: 'Checks option 2',
      type: 'parameterized' as const,
      profileId: 'prof_1',
      requiredParameters: ['accountNumber'],
      scheduleId: 'sch_1',
      maxDurationSecs: 600,
    };
    const { fetch, calls } = makeQueuedFetch([{ body: { id: 'cfg_1', ...body, version: 1, workspaceId: 'ws_1' } }]);
    const created = await client(fetch).testing.configs.create(body);
    expect(JSON.parse(calls[0].init.body as string)).toEqual(body);
    expect(created.maxDurationSecs).toBe(600);
    expect(created.version).toBe(1);
  });

  it('configs.update sends only what is given, and null clears schedule and duration', async () => {
    const { fetch, calls } = makeQueuedFetch([{ body: { id: 'cfg_1' } }, { body: { id: 'cfg_1' } }]);
    const c = client(fetch);
    await c.testing.configs.update('cfg_1', { description: 'New', maxDurationSecs: 900 });
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ description: 'New', maxDurationSecs: 900 });
    await c.testing.configs.update('cfg_1', { scheduleId: null, maxDurationSecs: null });
    expect(JSON.parse(calls[1].init.body as string)).toEqual({ scheduleId: null, maxDurationSecs: null });
  });
});

describe('TestingResource transcription language', () => {
  // Customer report: "we cannot select a language over the API". `language` was
  // absent from CreateTestConfigRequest, so a caller was locked to the default.
  it('configs.create sends the transcription language and round-trips it', async () => {
    const body = {
      name: 'Billing menu',
      phoneNumber: '+34911234567',
      steps: [],
      language: 'es' as const,
    };
    const { fetch, calls } = makeQueuedFetch([{ body: { id: 'cfg_1', ...body } }]);
    const created = await client(fetch).testing.configs.create(body);
    expect(created.language).toBe('es');
    expect(JSON.parse(calls[0].init.body as string)).toEqual(body);
  });

  // A region-qualified code is the normal shape; `en-GB` is the api's default.
  it('configs.create accepts a region-qualified code', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { id: 'cfg_2', name: 'A', phoneNumber: '+441', steps: [], language: 'en-GB' } },
    ]);
    const created = await client(fetch).testing.configs.create({
      name: 'A',
      phoneNumber: '+441',
      steps: [],
      language: 'en-GB',
    });
    expect(created.language).toBe('en-GB');
    expect(JSON.parse(calls[0].init.body as string).language).toBe('en-GB');
  });

  // "Only what you pass is sent": no language key at all, so the api applies
  // its own default of en-GB rather than the SDK guessing one.
  it('configs.create omits language entirely when the caller does not pass one', async () => {
    const { fetch, calls } = makeQueuedFetch([{ body: { id: 'cfg_3', name: 'A', phoneNumber: '+441', steps: [] } }]);
    const created = await client(fetch).testing.configs.create({ name: 'A', phoneNumber: '+441', steps: [] });
    expect(created.language).toBeUndefined();
    const sent = JSON.parse(calls[0].init.body as string) as Record<string, unknown>;
    expect('language' in sent).toBe(false);
  });

  // Update-omission semantics: omitting `language` leaves the SAVED value
  // alone. There is no implicit reset to en-GB, so the SDK must not send the
  // key just because the caller changed something else.
  it('configs.update sends language only when given, leaving the saved value untouched otherwise', async () => {
    const { fetch, calls } = makeQueuedFetch([{ body: { id: 'cfg_1' } }, { body: { id: 'cfg_1' } }]);
    const c = client(fetch);

    await c.testing.configs.update('cfg_1', { language: 'fr' });
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ language: 'fr' });

    await c.testing.configs.update('cfg_1', { description: 'New' });
    const second = JSON.parse(calls[1].init.body as string) as Record<string, unknown>;
    expect('language' in second).toBe(false);
  });
});

describe('TestingResource carrier fields', () => {
  it('configs.create sends carrierRouteId; update can clear it with null', async () => {
    const cfg = { id: 'cfg_1', name: 'F', phoneNumber: '+441', steps: [], carrierRouteId: 'rt_1' };
    const { fetch, calls } = makeQueuedFetch([{ body: cfg }, { body: { ...cfg, carrierRouteId: undefined } }]);
    const c = client(fetch);
    const created = await c.testing.configs.create({
      name: 'F',
      phoneNumber: '+441',
      steps: [],
      carrierRouteId: 'rt_1',
    });
    expect(created.carrierRouteId).toBe('rt_1');
    expect(JSON.parse(calls[0].init.body as string).carrierRouteId).toBe('rt_1');
    await c.testing.configs.update('cfg_1', { carrierRouteId: null });
    expect(JSON.parse(calls[1].init.body as string)).toEqual({ carrierRouteId: null });
  });

  it('runs.get exposes carrier, hang-up cause and DTMF step fields', async () => {
    const { fetch } = makeQueuedFetch([
      {
        body: {
          id: 'run_1',
          status: 'completed',
          outcome: 'PASS',
          carrier: { integrationId: 'ci_1', routeId: 'rt_1' },
          callTelemetry: {
            schemaVersion: 1,
            telephony: { hangupCause: 'normal_clearing', hangupSource: 'callee', sipHangupCause: '200' },
          },
          stepResults: [
            {
              id: 's1',
              runId: 'run_1',
              stepIndex: 0,
              stepId: 'st1',
              stepName: 'Press 1',
              outcome: 'PASS',
              expectedTranscript: 'Thank you',
              actualTranscript: 'Thank you',
              similarity: 98,
              threshold: 80,
              actionType: 'dtmf',
              actionValue: '1',
              createdAt: '',
            },
          ],
        },
      },
    ]);
    const c = client(fetch);
    const run = await c.testing.runs.get('run_1');
    expect(run.carrier).toEqual({ integrationId: 'ci_1', routeId: 'rt_1' });
    expect(run.callTelemetry?.telephony?.sipHangupCause).toBe('200');
    const step = run.stepResults?.[0];
    expect(step?.actionType).toBe('dtmf');
    expect(step?.actionValue).toBe('1');
    expect(step?.similarity).toBe(98);
  });
});
