/**
 * Read the responses the API actually sends.
 *
 * Each fixture in `tests/fixtures/api-responses/` is built from the api
 * handler code (nopaque/api main, 12 November 2026), not from the OpenAPI
 * document, which disagrees with the handlers in places. The same files are
 * used by the Python SDK's tests. In 0.14.0 every endpoint here was typed
 * with a shape the API does not send.
 */
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { Nopaque } from '../../src/index.js';
import type {
  ComplianceCatalogueResponse,
  ComplianceRegulation,
  ComplianceReport,
  ComplianceReportTest,
  LoadTestStatusResponse,
  MappingStep,
  MappingTree,
  MissionTestDefaults,
  Profile,
  SweepRun,
  TokenUsageResponse,
} from '../../src/index.js';
import { makeQueuedFetch } from '../helpers/mockFetch.js';

function fixture<T = Record<string, unknown>>(name: string): T {
  const url = new URL(`../fixtures/api-responses/${name}.json`, import.meta.url);
  return JSON.parse(readFileSync(url, 'utf8')) as T;
}

function client(fetch: typeof globalThis.fetch) {
  return new Nopaque({ apiKey: 'k', fetch, maxRetries: 0 });
}

describe('compliance', () => {
  it('getCatalogue: regulations is a map, version a number, tests carry name and covers', async () => {
    const body = fixture<ComplianceCatalogueResponse>('compliance_catalogue');
    const { fetch } = makeQueuedFetch([{ body }]);
    const r = await client(fetch).compliance.getCatalogue();

    expect(typeof r.catalogue.version).toBe('number');
    const aiAct: ComplianceRegulation | undefined = r.catalogue.regulations['eu-ai-act'];
    expect(aiAct?.name).toBe('EU Artificial Intelligence Act');
    expect(aiAct?.in_force_phases?.[0].date).toBe('2025-02-02');

    const first = r.catalogue.tests[0];
    expect(first.name).toBe(body.catalogue.tests[0].name);
    expect(first.pass.length).toBeGreaterThan(0);
    expect(first.covers[0].regulation).toBe('eu-ai-act');
    expect(first.probeCount).toBe(3);
    expect(r.complianceSecondsAvailable).toBe(540);
    expect(r.s2stestSecondsAvailable).toBeUndefined();
  });

  it('getReport: summary totals and one section per regulation with each test\'s last run', async () => {
    const body = fixture<ComplianceReport>('compliance_report');
    const { fetch } = makeQueuedFetch([{ body }]);
    const r = await client(fetch).compliance.getReport('+441234567890');

    expect(r.phoneNumber).toBe('+441234567890');
    expect(r.summary).toEqual({ ran: 2, passed: 1, failed: 1, total: 3 });
    const aiAct = r.regulations.find((s) => s.key === 'eu-ai-act');
    expect(aiAct?.summary.ran).toBe(2);
    const row: ComplianceReportTest | undefined = aiAct?.tests[0];
    expect(row?.primaryFor).toBe(true);
    expect(row?.lastRun?.verdict).toBe('pass');
    expect(row?.lastRun?.passEvidence?.[0].met).toBe(true);
    const untested = r.regulations.flatMap((s) => s.tests).find((t) => t.lastRun === null);
    expect(untested).toBeDefined();
    expect(r.metadata?.displayName).toBe('Acme Bank main line');
  });

  it('rerun returns the new run id', async () => {
    const body = fixture<{ runId: string }>('compliance_rerun');
    const { fetch } = makeQueuedFetch([{ body }]);
    const r = await client(fetch).compliance.rerun('r1');
    expect(r.runId).toBe(body.runId);
  });
});

describe('missionTests.getDefaults', () => {
  it('returns the sector catalogue', async () => {
    const body = fixture<MissionTestDefaults>('mission_test_defaults');
    const { fetch } = makeQueuedFetch([{ body }]);
    const d = await client(fetch).missionTests.getDefaults();
    expect(d.schemaVersion).toBe(1);
    expect(d.sectors[0].id).toBe('banking');
    expect(d.sectors[0].missions[0].defaultAcceptance).toBe(
      body.sectors[0].missions[0].defaultAcceptance
    );
  });
});

describe('mapping', () => {
  it('tree: path is a string array and voice-agent turns are s2s_node', async () => {
    const { fetch } = makeQueuedFetch([{ body: fixture<MappingTree>('mapping_tree') }]);
    const t = await client(fetch).mapping.tree('job_9c2e');
    expect(t.tree?.path).toEqual([]);
    expect(t.tree?.children[0].path).toEqual(['1']);
    expect(t.tree?.children[1].stepType).toBe('s2s_node');
    expect(t.tree?.menus?.[0].options[1].label).toBe('loans');
    expect(t.tree?.children[1].repeatReason).toBe('repeat_detected');
  });

  it('steps: rows are keyed by id', async () => {
    const { fetch } = makeQueuedFetch([{ body: fixture('mapping_steps') }]);
    const steps: MappingStep[] = [];
    for await (const s of client(fetch).mapping.steps('job_9c2e')) steps.push(s);
    expect(steps[0].id).toBe('step_1');
    expect(steps[0].pathString).toBe('1');
  });
});

describe('enrichment', () => {
  it('get: a completed enrichment comes back unwrapped and is read into results', async () => {
    const body = fixture('enrichment_completed');
    const { fetch } = makeQueuedFetch([{ body }]);
    const e = await client(fetch).enrichment.get('job_9c2e', 'run_41aa', 'quality_scoring');
    expect(e.status).toBe('completed');
    expect(e.jobId).toBe('job_9c2e');
    expect(e.runId).toBe('run_41aa');
    expect(e.type).toBe('quality_scoring');
    expect(e.results?.overallScore).toBe(72);
    // The unwrapped fields stay at the top level, as in 0.14.0.
    expect(e.overallScore).toBe(72);
  });

  it('get: an enrichment that has not completed is the stored record', async () => {
    const { fetch } = makeQueuedFetch([{ body: fixture('enrichment_failed') }]);
    const e = await client(fetch).enrichment.get('job_9c2e', 'run_41aa', 'quality_scoring');
    expect(e.status).toBe('failed');
    expect(e.enrichmentId).toBe('enr_5d1c');
    expect(e.type).toBe('quality_scoring');
    expect(e.error).toBe('llm-gateway returned 503');
    expect(e.results).toBeUndefined();
  });

  it('tokenUsage: services and total, with jobId and usage filled in', async () => {
    const body = fixture<TokenUsageResponse>('enrichment_token_usage');
    const { fetch } = makeQueuedFetch([{ body }]);
    const u = await client(fetch).enrichment.tokenUsage('job_9c2e', 'run_41aa');
    expect(u.jobId).toBe('job_9c2e');
    expect(u.total.totalTokens).toBe(19435);
    expect(u.services.ivr_analysis.eventCount).toBe(3);
    expect(u.usage).toEqual({ ivrAnalysisTokens: 13500, qualityScoringTokens: 5935, totalTokens: 19435 });
  });
});

describe('loadTesting.status', () => {
  it('reads currentSecond, totalSeconds and stats', async () => {
    const { fetch } = makeQueuedFetch([{ body: fixture<LoadTestStatusResponse>('load_test_status') }]);
    const s = await client(fetch).loadTesting.status('ltr_8e21');
    expect(s.currentSecond).toBe(90);
    expect(s.totalSeconds).toBe(300);
    expect(s.progressPercent).toBe(30);
    expect(s.stats.completed).toBe(30);
    expect(s.stats.quality?.estimatedMos?.p50).toBe(4.3);
    expect(s.stats.patterns?.no_answer).toBe(3);
    expect(s.progress).toBeUndefined();
  });
});

describe('sweeps.getRun', () => {
  it('reads summary and testRuns', async () => {
    const { fetch } = makeQueuedFetch([{ body: fixture<SweepRun>('sweep_run') }]);
    const r = await client(fetch).sweeps.getRun('swr_3b9f');
    expect(r.status).toBe('partial');
    expect(r.summary.passed).toBe(1);
    expect(r.summary.failed).toBe(1);
    expect(r.testRunIds).toEqual(['tr_1', 'tr_2']);
    expect(r.testRuns?.map((t) => t.outcome)).toEqual(['PASS', 'FAIL']);
  });
});

describe('profiles.get', () => {
  it('items is always present', async () => {
    const { fetch } = makeQueuedFetch([{ body: fixture<Profile>('profile') }]);
    const p = await client(fetch).profiles.get('prof_a');
    // No optional chaining needed: `items` is required.
    expect(p.items.length).toBe(2);
    expect(p.items[0].type).toBe('voice');
  });
});

describe('audio.createUploadUrl', () => {
  it('sends metadata when given', async () => {
    const { fetch, calls } = makeQueuedFetch([
      { body: { audioId: 'aud_1', uploadUrl: 'u', s3Key: 'k', expiresIn: 900 } },
    ]);
    await client(fetch).audio.createUploadUrl({
      filename: 'hello.wav',
      contentType: 'audio/wav',
      category: 'voice',
      sizeBytes: 1024,
      metadata: { displayName: 'Hello' },
    });
    expect(JSON.parse(calls[0].init.body as string).metadata).toEqual({ displayName: 'Hello' });
  });
});
