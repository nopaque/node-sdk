export type ComplianceSeverity = 'critical' | 'major' | 'advisory';

/** One regulation a catalogue test covers, and the clauses it tests. */
export interface ComplianceCoversEntry {
  /** Key into `ComplianceCatalogue.regulations`. */
  regulation: string;
  clauses: string[];
  /** Absent means primary. */
  weight?: 'primary' | 'secondary' | 'adjacent';
  rationale?: string;
}

/**
 * A test in the compliance catalogue. The probes (what the tester says) are
 * withheld by the API; `probeCount` says how many there are, so a test with
 * none cannot be run over chat.
 */
export interface ComplianceTest {
  id: string;
  name: string;
  summary: string;
  severity: ComplianceSeverity;
  channels: Array<'voice' | 'chat' | 'sms' | 'email'>;
  sectors: string[];
  jurisdictions: string[];
  tags?: string[];
  setup?: string;
  mission: string;
  pass: string[];
  fail: string[];
  covers: ComplianceCoversEntry[];
  notes?: string;
  deprecated?: { since: string; replaced_by?: string; reason?: string };
  probeCount: number;
}

/**
 * A regulation in the catalogue's `regulations` map, keyed by its key (e.g.
 * `eu-ai-act`). `full_ref`, `in_force` and `in_force_phases` are snake_case on
 * the wire: the catalogue is generated from YAML and passed through as is.
 */
export interface ComplianceRegulation {
  name: string;
  jurisdiction: string;
  url: string;
  full_ref?: string;
  in_force?: string;
  in_force_phases?: Array<{ date: string; scope: string }>;
  notes?: string;
  sectors?: string[];
}

export interface ComplianceCatalogue {
  version: number;
  /** Keyed by regulation key. */
  regulations: Record<string, ComplianceRegulation>;
  tests: ComplianceTest[];
}

export interface ComplianceCatalogueResponse {
  catalogue: ComplianceCatalogue;
  /** Display only: the API no longer refuses a batch above it. */
  pickerLimit: number;
  /**
   * Seconds left in the free tier's compliance allowance; `null` on paid
   * tiers, which are metered rather than capped.
   */
  complianceSecondsAvailable: number | null;
  /**
   * @deprecated Never sent by the API (the OpenAPI document names it; the
   * handler sends `complianceSecondsAvailable`). Always undefined.
   */
  s2stestSecondsAvailable?: number;
  tier: string;
}

export interface CreateComplianceBatchRequest {
  phoneNumber: string;
  sector: string;
  testIds: string[];
}

export interface CreateComplianceBatchResponse {
  runIds: string[];
  reportUrl: string;
}

/** @deprecated Not used by any response: the report never had this shape. */
export interface ComplianceTestEvidence {
  turn: number;
  quote: string;
}

/** @deprecated Not used by any response: the report never had this shape. */
export interface ComplianceTestVerdict {
  testId: string;
  verdict: 'pass' | 'fail' | 'pending';
  evidence?: ComplianceTestEvidence[];
  judgeRationale?: string;
}

export interface CompliancePassEvidence {
  condition: string;
  met: boolean;
  quote: string;
  turn: number;
}

export interface ComplianceFailEvidence {
  condition: string;
  triggered: boolean;
  quote: string;
  turn: number;
}

/** The latest run of a test against the number. */
export interface ComplianceLastRun {
  runId: string;
  ranAt: string;
  completedAt?: string;
  status: string;
  /** Absent until the run is judged. */
  verdict?: 'pass' | 'fail';
  passEvidence?: CompliancePassEvidence[];
  failEvidence?: ComplianceFailEvidence[];
  judgeReasoning?: string;
  transcript?: string;
  audioId?: string;
  /** The catalogue version the run used, to spot runs from an older catalogue. */
  catalogueVersion?: number;
  channel?: 'voice' | 'chat';
  passRate?: number | null;
  samplesJudged?: number;
  samplesRequested?: number;
  transportErrors?: number;
}

/** A catalogue test as it applies to one regulation section of a report. */
export interface ComplianceReportTest {
  id: string;
  name: string;
  summary: string;
  severity: ComplianceSeverity;
  weight?: 'primary' | 'secondary' | 'adjacent';
  clauses: string[];
  primaryFor: boolean;
  /** `null` when the test has not been run against this number. */
  lastRun: ComplianceLastRun | null;
}

/** One regulation's section of a compliance report. */
export interface ComplianceRegulationSection {
  key: string;
  name: string;
  jurisdiction: string;
  url: string;
  summary: { ran: number; passed: number; failed: number };
  tests: ComplianceReportTest[];
}

/**
 * Totals over the latest run of each applicable test. `total` is the number
 * of applicable tests, run or not.
 */
export interface ComplianceReportSummary {
  ran: number;
  passed: number;
  failed: number;
  total: number;
}

export interface ComplianceReportMetadata {
  displayName: string | null;
  additionalContext: string | null;
  carrierRouteId: string | null;
  updatedAt: string | null;
}

/** Response from GET /testing/compliance-reports/{phoneNumber}. */
export interface ComplianceReport {
  workspaceId?: string;
  phoneNumber?: string;
  catalogueVersion: number;
  summary: ComplianceReportSummary;
  regulations: ComplianceRegulationSection[];
  metadata?: ComplianceReportMetadata;
}

/** Response from POST /testing/compliance-runs/{runId}/rerun: the new run's id. */
export interface ComplianceRerunResponse {
  runId: string;
}

export interface ComplianceReportListItem {
  phoneNumber: string;
  passed: number;
  failed: number;
  total: number;
  lastRunAt: string;
}

export interface ComplianceReportListParams {
  limit?: number;
  nextToken?: string;
}

export interface GeneratePdfRequest {
  regulationKey?: string;
}

export interface GeneratePdfResponse {
  url: string;
}
