export type MissionTestKind = 'freeform' | 'compliance';
// 'pending' is what the api sends; 'queued' is kept for compatibility.
export type MissionTestStatus = 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

/**
 * The language a mission test **call** is held in — the languages Telnyx
 * `deepgram/flux` accepts on the AI Assistant: one language, or `multi`
 * (Flux-multi), which code-switches across the other ten.
 *
 * Absent means English.
 *
 * Distinct from the **transcription** language that standard tests and mapping
 * use (`MappingJobConfig.language`, `en-GB` and friends). The two sets are not
 * interchangeable, and the overlap is a trap: bare `'en'` is valid here and is
 * rejected with a 400 as a transcription language, which wants a region —
 * `'en-GB'`. Do not copy a code from one field to the other.
 */
export type CallLanguage =
  | 'en'
  | 'multi'
  | 'es'
  | 'fr'
  | 'de'
  | 'it'
  | 'pt'
  | 'nl'
  | 'hi'
  | 'ru'
  | 'ja';

export interface MissionTestProfile {
  phoneNumber: string;
  name?: string;
}

export interface CreateMissionTestRequest {
  sector: string;
  mission: string;
  acceptance: string;
  profile: MissionTestProfile;
  /**
   * Optional language the call is held in. Omit for English, which is how every
   * mission test behaved before this field existed — the SDK sends the key only
   * when you pass it, so omitting it leaves the default to the api. Use `multi`
   * when the IVR may start in English and switch.
   *
   * This is a call language, not a transcription language: see `CallLanguage`.
   */
  language?: CallLanguage;
}

/**
 * A mission or compliance run, as GET /testing/mission-tests returns it.
 * Required fields match openapi `MissionTestRun`. Runs launched from a saved
 * config carry no `kind`, `createdAt` or `updatedAt`, and `profile` is the
 * profile ID string.
 */
export interface MissionTestRun {
  id: string;
  workspaceId: string;
  testType?: 'mission';
  status: MissionTestStatus;
  startedAt?: string;
  completedAt?: string;
  kind?: MissionTestKind;
  sector?: string;
  mission?: string;
  acceptance?: string;
  /** Profile ID string from the api; the object form is kept for compatibility. */
  profile?: string | MissionTestProfile;
  phoneNumber?: string;
  configId?: string;
  voiceId?: string;
  passed?: boolean;
  passReasoning?: string;
  passEvidence?: string;
  /**
   * The call language the run was dispatched with. Absent means English —
   * every run from before the field existed, and every run that did not set it.
   */
  language?: CallLanguage;
  verdict?: 'pass' | 'fail';
  errorMessage?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MissionTestDefaults {
  sector: string;
  mission: string;
  acceptance: string;
  catalogueVersion: string;
}

/** Filters for GET /testing/mission-tests. All are applied server-side. */
export interface MissionTestListParams {
  /** `'freeform'` (missions) or `'compliance'`. */
  kind?: MissionTestKind;
  /** Only runs launched from this mission test config. Needs the API's `configId` filter. */
  configId?: string;
  /** Case-insensitive text search on the run's sector or mission. */
  q?: string;
  /** Substring match on the number called. */
  phoneNumber?: string;
  /** Runs whose config has ANY of these tags. A comma-separated string or an array. */
  tags?: string | string[];
  limit?: number;
  /** Cursor from a previous page's `nextToken`. */
  nextToken?: string;
  /** The api's own name for the cursor; either works. */
  cursor?: string;
}
