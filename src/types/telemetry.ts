/**
 * Unified telemetry contract (schemaVersion 1) emitted by the mapping/testing
 * containers. Every field except `schemaVersion` is optional and the objects
 * tolerate unknown keys (passthrough during rollout), so these types are modelled
 * permissively — treat any nested field as possibly-absent.
 *
 * See api/packages/schemas/entities/call-telemetry.ts for the authoritative shape.
 */

export interface TurnTelemetry {
  schemaVersion: 1;
  timing?: {
    startedAt?: string;
    endedAt?: string;
    durationMs?: number;
    responseLatencyMs?: number;
    [key: string]: unknown;
  };
  transcript?: {
    avgWordConfidence?: number;
    minWordConfidence?: number;
    detectedLanguage?: string;
    wordCount?: number;
    words?: Array<{
      word: string;
      startMs: number;
      endMs: number;
      confidence?: number;
    }>;
    [key: string]: unknown;
  };
  dtmf?: {
    digitsSent?: string;
    digitsReceived?: string;
    sentOnDelay?: boolean;
    sendDurationMs?: number;
    completedAt?: string;
    [key: string]: unknown;
  };
  llmExtraction?: {
    operation?: string;
    model?: string;
    inputTokens?: number;
    outputTokens?: number;
    latencyMs?: number;
    reasoning?: string;
    hallucinationDetected?: boolean;
    [key: string]: unknown;
  };
  conversationTurn?: {
    role?: 'user' | 'assistant' | 'system';
    timestamp?: string;
    turnIndex?: number;
    text?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface CallTelemetry {
  schemaVersion: 1;
  telephony?: {
    callLegId?: string;
    callSessionId?: string;
    telnyxConnectionId?: string;
    hangupCause?: string;
    hangupSource?: string;
    sipHangupCause?: string;
    initiatedByUs?: boolean;
    terminalStatus?:
      | 'completed'
      | 'failed'
      | 'aborted_by_duration'
      | 'aborted_by_cost'
      | 'aborted_by_inactivity'
      | 'aborted_mid_stream'
      | 'aborted_by_reaper'
      | 'no_answer';
    terminationReason?: string;
    [key: string]: unknown;
  };
  quality?: {
    inboundMos?: number;
    inboundJitterMaxVarianceMs?: number;
    inboundPacketCount?: number;
    inboundPacketsLost?: number;
    outboundMos?: number;
    outboundJitterMaxVarianceMs?: number;
    outboundPacketCount?: number;
    outboundPacketsLost?: number;
    codec?: string;
    sampleRateHz?: number;
    [key: string]: unknown;
  };
  audio?: {
    coverage?: number;
    noiseFloorEnergy?: number;
    maxSilenceSecs?: number;
    speechEndOffsetSecs?: number;
    totalChunks?: number;
    speechChunks?: number;
    audioId?: string;
    audioS3Key?: string;
    audioSizeBytes?: number;
    audioDurationSecs?: number;
    audioFormat?: 'wav' | 'mp3' | 'wav-mp3-payload';
    telnyxRecordingId?: string;
    [key: string]: unknown;
  };
  cost?: {
    telnyxTotalUsd?: number;
    telnyxCostParts?: Array<{
      part: string;
      billedSecs: number;
      costUsd: number;
      currency: string;
      rate?: number;
    }>;
    computedDurationSecs?: number;
    computedPerMinuteRateUsd?: number;
    computedCostUsd?: number;
    [key: string]: unknown;
  };
  timing?: {
    dialedAt?: string;
    answeredAt?: string;
    endedAt?: string;
    dialToAnswerMs?: number;
    answerToFirstUtteranceMs?: number;
    [key: string]: unknown;
  };
  mode?: {
    detected?: 'voice' | 'dtmf' | 'hybrid' | 'unknown';
    voiceTurnCount?: number;
    dtmfTurnCount?: number;
    dtmfInboundDetected?: boolean;
    [key: string]: unknown;
  };
  turns?: TurnTelemetry[];
  [key: string]: unknown;
}
