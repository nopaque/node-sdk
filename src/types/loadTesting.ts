export type LoadTestStatus =
  | 'created'
  | 'queued'
  | 'running'
  | 'completed'
  | 'aborted'
  | 'failed';

export interface LoadTest {
  id: string;
  name: string;
  configId: string;
  concurrency: number;
  totalCalls: number;
  status: LoadTestStatus;
  runId?: string;
  createdAt?: string;
  updatedAt?: string;
  startedAt?: string;
  completedAt?: string;
  abortedAt?: string;
}

export interface CreateLoadTestRequest {
  name: string;
  configId: string;
  concurrency: number;
  totalCalls: number;
}

export interface UpdateLoadTestRequest {
  name?: string;
  concurrency?: number;
  totalCalls?: number;
}

export interface LoadTestingListParams {
  limit?: number;
  nextToken?: string;
}

export interface LoadTestEstimateRequest {
  configId: string;
  concurrency: number;
  totalCalls: number;
}

export interface LoadTestEstimate {
  estimatedMinutes: number;
  estimatedCost: string;
  concurrency: number;
  totalCalls: number;
}

export interface LoadTestProgress {
  completedCalls: number;
  totalCalls: number;
  passRate?: number;
}

export interface LoadTestStatusResponse {
  id: string;
  status: LoadTestStatus;
  progress: LoadTestProgress;
  [key: string]: unknown;
}

export interface LoadTestRun {
  id: string;
  loadTestId?: string;
  status: LoadTestStatus;
  passRate?: number;
  startedAt?: string;
  completedAt?: string;
  /** @deprecated use `id` */
  runId?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Detailed reports (`/testing/reports`)
// ---------------------------------------------------------------------------

/** One of the files a report can build. */
export type ReportPack = 'data' | 'excel' | 'pdf';

export type ReportStatus = 'pending' | 'running' | 'ready' | 'failed';

export interface ReportFile {
  pack: ReportPack;
  fileName: string;
  sizeBytes: number;
  contentType: string;
}

/** A detailed report over one or more finished load-test runs. */
export interface Report {
  reportId: string;
  name: string;
  kind: 'load-test-runs';
  loadTestRunIds: string[];
  packs: ReportPack[];
  includeAudio: boolean;
  status: ReportStatus;
  /** What the build is doing, while it runs. */
  progress?: string;
  requestedBy?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  counts?: { runs?: number; calls?: number; steps?: number; recordings?: number };
  /** The built files. Empty until `status` is `ready`. */
  files: ReportFile[];
  /** Why the report failed. */
  error?: string;
}

export interface CreateReportRequest {
  /** Finished load-test RUN ids from your workspace (1 to 20). */
  loadTestRunIds: string[];
  /** Defaults to the first run's name. */
  name?: string;
  /** Which files to build. Defaults to all three. */
  packs?: ReportPack[];
  /** Include call recordings in the data pack. Defaults to `true`. */
  includeAudio?: boolean;
}

export interface ReportListParams {
  /**
   * Sent as the page size (1-100). With the auto-paginating `list...()` method it
   * also caps the TOTAL number of items yielded; with `list...Page()` it only
   * sets the size of the one page.
   */
  limit?: number;
  /** The `nextCursor` from the previous page. */
  cursor?: string;
  nextToken?: string;
}

/** A pre-signed link to one report file, valid for 1 hour. */
export interface ReportFileDownload {
  url: string;
  fileName: string;
  sizeBytes: number;
  expiresAt: string;
}

// ---------------------------------------------------------------------------
// Run exports (`/testing/load-tests/{id}/exports`)
// ---------------------------------------------------------------------------

export type LoadTestExportStatus = 'pending' | 'running' | 'ready' | 'failed';

/** A zip of every call and step in one load-test run. */
export interface LoadTestExport {
  exportId: string;
  runId: string;
  status: LoadTestExportStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  fileName?: string;
  sizeBytes?: number;
  counts?: { calls?: number; steps?: number };
  /** Why the export failed. */
  error?: string;
  /** When the file is deleted (30 days after creation). */
  expiresAt: string;
  /** Only when `status` is `ready`. Valid for 1 hour. */
  downloadUrl?: string;
}

// ---------------------------------------------------------------------------
// Failure patterns (`/testing/load-tests/{id}/failure-patterns`)
// ---------------------------------------------------------------------------

/** `group` (default): every lane started with this run. `lane`: this run only. */
export type FailurePatternScope = 'group' | 'lane';

export type FailurePatternOwner =
  | 'platform'
  | 'carrier'
  | 'system-under-test'
  | 'test-definition'
  | 'unknown';

export interface FailurePattern {
  id: string;
  label: string;
  owner: FailurePatternOwner;
  /** The pattern's rule in one plain sentence. */
  description: string;
  count: number;
  /** Fraction of `failedCalls`, 0-1. */
  share: number;
  /** Calls per lane, by lane run id. */
  byLane: Record<string, number>;
  firstSeen: string | null;
  lastSeen: string | null;
  /** Up to five call ids, earliest first. */
  examples: string[];
}

export interface FailurePatternTimelineBucket {
  /** The bucket's start. */
  t: string;
  /** Calls in progress at any point in the bucket. */
  inFlight: number;
  /** Failed calls started in the bucket, per pattern id. */
  counts: Record<string, number>;
}

/** A load-test run's failures grouped by pattern. */
export interface LoadTestFailurePatterns {
  runId: string;
  /** The group the run was started in; null for a one-config run. */
  groupId: string | null;
  scope: FailurePatternScope;
  rulesVersion: number;
  totalCalls: number;
  failedCalls: number;
  unclassified: number;
  lateStarts: number;
  lateStartsPassed: number;
  patterns: FailurePattern[];
  timeline: { bucketSecs: number; buckets: FailurePatternTimelineBucket[] };
  lanes: Array<{ runId: string; name: string }>;
}

export interface FailurePatternScopeParams {
  scope?: FailurePatternScope;
}

export interface ReclassifyFailurePatternsResponse {
  jobId: string;
}

export interface FailurePatternCallListParams {
  scope?: FailurePatternScope;
  /**
   * Sent as the page size (1-200). With the auto-paginating `list...()` method it
   * also caps the TOTAL number of items yielded; with `list...Page()` it only
   * sets the size of the one page.
   */
  limit?: number;
  /** The `cursor` from the previous page. */
  cursor?: string;
  nextToken?: string;
}

/** One call in a failure pattern. */
export interface FailurePatternCall {
  callId: string;
  /** The lane (load-test run) the call belongs to. */
  runId: string;
  laneName: string;
  startedAt: string | null;
  failedStepIndex: number | null;
  failedStepName: string | null;
  /** The evidence that put the call in the pattern. */
  evidence: Record<string, string | number | boolean | null>;
  recordingAvailable: boolean;
}
