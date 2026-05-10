export interface ComplianceTest {
  id: string;
  title: string;
  severity: 'critical' | 'major' | 'advisory';
  regulationKeys: string[];
}

export interface ComplianceRegulation {
  key: string;
  label: string;
  testIds: string[];
}

export interface ComplianceCatalogue {
  version: string;
  regulations: ComplianceRegulation[];
  tests: ComplianceTest[];
}

export interface ComplianceCatalogueResponse {
  catalogue: ComplianceCatalogue;
  pickerLimit: number;
  s2stestSecondsAvailable: number;
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

export interface ComplianceTestEvidence {
  turn: number;
  quote: string;
}

export interface ComplianceTestVerdict {
  testId: string;
  verdict: 'pass' | 'fail' | 'pending';
  evidence?: ComplianceTestEvidence[];
  judgeRationale?: string;
}

export interface ComplianceRegulationSection {
  regulationKey: string;
  label: string;
  passed: number;
  failed: number;
  pending: number;
  verdicts: ComplianceTestVerdict[];
}

export interface ComplianceReportSummary {
  phoneNumber: string;
  catalogueVersion: string;
  passed: number;
  failed: number;
  pending: number;
  generatedAt: string;
}

export interface ComplianceReport {
  summary: ComplianceReportSummary;
  sections: ComplianceRegulationSection[];
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
