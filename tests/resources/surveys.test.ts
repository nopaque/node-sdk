import { describe, it, expect, vi } from 'vitest';
import { Nopaque, NopaqueTimeoutError, NotFoundError } from '../../src/index.js';
import { makeQueuedFetch, makeResponse } from '../helpers/mockFetch.js';
import type {
  SurveyResult,
  SurveyRun,
  SurveyTestConfig,
  StartSurveyTestResponse,
} from '../../src/types/surveys.js';

function client(fetch: typeof globalThis.fetch) {
  return new Nopaque({ apiKey: 'k', fetch, maxRetries: 0 });
}

function body(init: RequestInit): unknown {
  return JSON.parse(String(init.body));
}

const nowSecs = () => Math.floor(Date.now() / 1000);

// Fixtures follow the OpenAPI schemas' documented shapes.
function started(over: Partial<StartSurveyTestResponse> = {}): StartSurveyTestResponse {
  return {
    runId: 'r1',
    configId: 'c1',
    agentE164: '+447700900001',
    endUserE164: '+447700900123',
    state: 'waiting',
    startedAt: '2026-09-30T10:00:00Z',
    expiresAt: nowSecs() + 300,
    maxMessages: 40,
    ...over,
  };
}

function surveyRun(over: Partial<SurveyRun> = {}): SurveyRun {
  return {
    runId: 'r1',
    configId: 'c1',
    agentE164: '+447700900001',
    endUserE164: '+447700900123',
    state: 'waiting',
    startedAt: '2026-09-30T10:00:00Z',
    expiresAt: nowSecs() + 300,
    live: true,
    ...over,
  };
}

function result(over: Partial<SurveyResult> = {}): SurveyResult {
  return {
    runId: 'r1',
    configId: 'c1',
    agentE164: '+447700900001',
    endUserE164: '+447700900123',
    startedAt: '2026-09-30T10:00:00Z',
    expiresAt: nowSecs() + 300,
    answersGiven: 0,
    state: 'live',
    turnsTruncated: false,
    capture: { status: 'pending' },
    turns: [],
    ...over,
  };
}

function cfg(over: Partial<SurveyTestConfig> = {}): SurveyTestConfig {
  return {
    id: 'c1',
    workspaceId: 'w1',
    name: 'Happy customer',
    sector: 'customer satisfaction',
    mission: 'Recently had a boiler repaired and was pleased.',
    acceptance: 'Every question is answered.',
    scenario: 'happy-path',
    createdAt: '2026-09-30T00:00:00Z',
    updatedAt: '2026-09-30T00:00:00Z',
    ...over,
  };
}

// Survey handlers send error bodies as `{ error }`, whatever the OpenAPI `Error` schema says.
const notFound = { status: 404, body: { error: 'Not found' } };

describe('SurveysResource', () => {
  it('start POSTs to survey-runs and sends sender as endUserE164', async () => {
    const { fetch, calls } = makeQueuedFetch([{ status: 201, body: started() }]);
    const r = await client(fetch).surveys.start({
      configId: 'c1',
      sender: '+447700900123',
      windowSecs: 600,
      expectedTurns: 3,
      maxMessages: 20,
    });
    expect(calls[0].init.method).toBe('POST');
    expect(new URL(calls[0].url).pathname).toBe('/testing/survey-runs');
    expect(body(calls[0].init)).toEqual({
      configId: 'c1',
      endUserE164: '+447700900123',
      windowSecs: 600,
      expectedTurns: 3,
      maxMessages: 20,
    });
    expect(r.agentE164).toBe('+447700900001');
    expect(r.endUserE164).toBe('+447700900123');
  });

  it('start omits optionals that were not passed', async () => {
    const { fetch, calls } = makeQueuedFetch([{ status: 201, body: started() }]);
    await client(fetch).surveys.start({ configId: 'c1', sender: '+447700900123' });
    expect(body(calls[0].init)).toEqual({ configId: 'c1', endUserE164: '+447700900123' });
  });

  it('start surfaces a 409 as ConflictError with the server message', async () => {
    const { fetch } = makeQueuedFetch([
      { status: 409, body: { error: 'This workspace has no live survey numbers to answer on.' } },
    ]);
    await expect(
      client(fetch).surveys.start({ configId: 'c1', sender: '+447700900123' }),
    ).rejects.toMatchObject({ name: 'ConflictError', message: expect.stringContaining('no live') });
  });

  it('stop DELETEs the run and returns nothing', async () => {
    const { fetch, calls } = makeQueuedFetch([{ status: 204 }]);
    const r = await client(fetch).surveys.stop('r1');
    expect(calls[0].init.method).toBe('DELETE');
    expect(new URL(calls[0].url).pathname).toBe('/testing/survey-runs/r1');
    expect(r).toBeUndefined();
  });

  it('list GETs survey-runs and returns runs with number counts', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { runs: [surveyRun()], numbers: { total: 2, busy: 1, free: 1 } } },
    ]);
    const r = await client(fetch).surveys.list();
    expect(calls[0].init.method).toBe('GET');
    expect(new URL(calls[0].url).pathname).toBe('/testing/survey-runs');
    expect(r.runs[0].runId).toBe('r1');
    expect(r.numbers).toEqual({ total: 2, busy: 1, free: 1 });
  });
});

describe('SurveyResultsResource', () => {
  it('get fetches one result and parses turns', async () => {
    const { fetch, calls } = makeQueuedFetch([
      {
        body: result({
          capture: { status: 'final' },
          turns: [
            { at: '2026-09-30T10:01:00Z', from: 'survey', text: 'Rate us 1-5' },
            { at: '2026-09-30T10:01:05Z', from: 'respondent', text: '5' },
          ],
        }),
      },
    ]);
    const r = await client(fetch).surveys.results.get('r1');
    expect(calls[0].init.method).toBe('GET');
    expect(new URL(calls[0].url).pathname).toBe('/testing/survey-results/r1');
    expect(r.turns.map((t) => t.from)).toEqual(['survey', 'respondent']);
    expect(r.turns[1].text).toBe('5');
  });

  it('list follows nextCursor using the results key and the cursor param', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { results: [result({ runId: 'r1' })], nextCursor: 'cur2' } },
      { body: { results: [result({ runId: 'r2' })] } },
    ]);
    const seen: string[] = [];
    for await (const item of client(fetch).surveys.results.list()) seen.push(item.runId);
    expect(seen).toEqual(['r1', 'r2']);
    expect(new URL(calls[0].url).pathname).toBe('/testing/survey-results');
    expect(new URL(calls[0].url).searchParams.has('cursor')).toBe(false);
    expect(new URL(calls[1].url).searchParams.get('cursor')).toBe('cur2');
  });

  it('list advances past a caller-supplied cursor rather than repeating page one', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { results: [result({ runId: 'r1' })], nextCursor: 'cur2' } },
      { body: { results: [result({ runId: 'r2' })] } },
    ]);
    const seen: string[] = [];
    for await (const item of client(fetch).surveys.results.list({ cursor: 'cur1' })) {
      seen.push(item.runId);
    }
    expect(seen).toEqual(['r1', 'r2']);
    expect(calls.map((c) => new URL(c.url).searchParams.get('cursor'))).toEqual(['cur1', 'cur2']);
  });

  it('listPage maps results and nextCursor onto the Page shape', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { results: [result()], nextCursor: 'cur2' } },
    ]);
    const page = await client(fetch).surveys.results.listPage({ limit: 10, cursor: 'cur1' });
    const qs = new URL(calls[0].url).searchParams;
    expect(qs.get('limit')).toBe('10');
    expect(qs.get('cursor')).toBe('cur1');
    expect(page.items).toHaveLength(1);
    expect(page.nextToken).toBe('cur2');
  });

  it('listPage has a null nextToken on the last page', async () => {
    const { fetch } = makeQueuedFetch([{ body: { results: [] } }]);
    const page = await client(fetch).surveys.results.listPage();
    expect(page.nextToken).toBeNull();
  });
});

describe('SurveyConfigsResource', () => {
  it('create POSTs the config', async () => {
    const { fetch, calls } = makeQueuedFetch([{ status: 201, body: cfg() }]);
    const req = {
      name: 'Happy customer',
      sector: 'customer satisfaction',
      mission: 'Recently had a boiler repaired and was pleased.',
      acceptance: 'Every question is answered.',
      scenario: 'happy-path' as const,
      expectedTurns: 3,
    };
    const r = await client(fetch).surveys.configs.create(req);
    expect(calls[0].init.method).toBe('POST');
    expect(new URL(calls[0].url).pathname).toBe('/testing/survey-test-configs');
    expect(body(calls[0].init)).toEqual(req);
    expect(r.id).toBe('c1');
  });

  it('list returns a plain array from the configs key', async () => {
    const slim: Partial<SurveyTestConfig> = cfg();
    delete slim.mission;
    delete slim.acceptance;
    const { fetch, calls } = makeQueuedFetch([{ body: { configs: [slim] } }]);
    const r = await client(fetch).surveys.configs.list();
    expect(calls[0].init.method).toBe('GET');
    expect(new URL(calls[0].url).pathname).toBe('/testing/survey-test-configs');
    expect(Array.isArray(r)).toBe(true);
    expect(r[0].id).toBe('c1');
  });

  it('get fetches one config', async () => {
    const { fetch, calls } = makeQueuedFetch([{ body: cfg() }]);
    const r = await client(fetch).surveys.configs.get('c1');
    expect(calls[0].init.method).toBe('GET');
    expect(new URL(calls[0].url).pathname).toBe('/testing/survey-test-configs/c1');
    expect(r.mission).toContain('boiler');
  });

  it('update PATCHes only the fields passed, keeping null to clear', async () => {
    const { fetch, calls } = makeQueuedFetch([{ body: cfg({ name: 'Renamed' }) }]);
    const r = await client(fetch).surveys.configs.update('c1', {
      name: 'Renamed',
      tags: null,
      description: undefined,
    });
    expect(calls[0].init.method).toBe('PATCH');
    expect(new URL(calls[0].url).pathname).toBe('/testing/survey-test-configs/c1');
    expect(body(calls[0].init)).toEqual({ name: 'Renamed', tags: null });
    expect(r.name).toBe('Renamed');
  });

  it('delete DELETEs and returns nothing', async () => {
    const { fetch, calls } = makeQueuedFetch([{ status: 204 }]);
    const r = await client(fetch).surveys.configs.delete('c1');
    expect(calls[0].init.method).toBe('DELETE');
    expect(new URL(calls[0].url).pathname).toBe('/testing/survey-test-configs/c1');
    expect(r).toBeUndefined();
  });
});

describe('SurveysResource.waitForResult', () => {
  it('treats an early 404 as not-yet, then waits past provisional to final', async () => {
    const { fetch, calls } = makeQueuedFetch([
      notFound,
      { body: result({ capture: { status: 'provisional' } }) },
      {
        body: result({
          state: 'ended',
          outcome: 'completed',
          capture: { status: 'final' },
          turns: [{ at: '2026-09-30T10:01:00Z', from: 'survey', text: 'Hi' }],
        }),
      },
    ]);
    const onUpdate = vi.fn();
    const r = await client(fetch).surveys.waitForResult('r1', { pollInterval: 1, onUpdate });
    expect(calls).toHaveLength(3);
    expect(calls.every((c) => new URL(c.url).pathname === '/testing/survey-results/r1')).toBe(
      true,
    );
    expect(r.capture.status).toBe('final');
    expect(r.outcome).toBe('completed');
    // The 404 is not an update; the two fetched results are.
    expect(onUpdate).toHaveBeenCalledTimes(2);
  });

  it('returns a failed capture as a result rather than throwing', async () => {
    const { fetch } = makeQueuedFetch([
      { body: result({ capture: { status: 'failed', error: 'carrier API unavailable' } }) },
    ]);
    const r = await client(fetch).surveys.waitForResult('r1', { pollInterval: 1 });
    expect(r.capture.status).toBe('failed');
    expect(r.capture.error).toBe('carrier API unavailable');
  });

  it('throws NopaqueTimeoutError on an explicit timeout', async () => {
    const fetch = vi.fn(async () =>
      makeResponse({ body: result({ capture: { status: 'provisional' } }) }),
    );
    await expect(
      client(fetch).surveys.waitForResult('r1', { timeout: 30, pollInterval: 10 }),
    ).rejects.toBeInstanceOf(NopaqueTimeoutError);
  });

  it('derives the default deadline from expiresAt plus the capture grace', async () => {
    // Window closed 601 s ago, so expiresAt + 600 s is already in the past.
    const fetch = vi.fn(async () =>
      makeResponse({
        body: result({ expiresAt: nowSecs() - 601, capture: { status: 'provisional' } }),
      }),
    );
    await expect(
      client(fetch).surveys.waitForResult('r1', { pollInterval: 1 }),
    ).rejects.toBeInstanceOf(NopaqueTimeoutError);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('keeps polling within the default deadline while the window is open', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: result({ expiresAt: nowSecs() - 599, capture: { status: 'provisional' } }) },
      { body: result({ capture: { status: 'final' } }) },
    ]);
    const r = await client(fetch).surveys.waitForResult('r1', { pollInterval: 1 });
    expect(calls).toHaveLength(2);
    expect(r.capture.status).toBe('final');
  });

  it('rethrows NotFoundError once the not-found grace has passed', async () => {
    const fetch = vi.fn(async () => makeResponse(notFound));
    await expect(
      client(fetch).surveys.waitForResult('r1', { notFoundGrace: 20, pollInterval: 5 }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(fetch.mock.calls.length).toBeGreaterThan(1);
  });

  it('does not swallow errors other than 404', async () => {
    const { fetch, calls } = makeQueuedFetch([{ status: 401, body: { error: 'bad key' } }]);
    await expect(
      client(fetch).surveys.waitForResult('r1', { pollInterval: 1 }),
    ).rejects.toMatchObject({ name: 'AuthenticationError' });
    expect(calls).toHaveLength(1);
  });
});
