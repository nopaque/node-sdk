/**
 * Audio categories the API accepts. Required on upload — the category decides
 * the S3 key prefix, so the API rejects a request without one.
 */
export type AudioCategory = 'test' | 'map' | 'voice' | 'transcript';

export interface AudioFile {
  id: string;
  /** Wire name is `filename`, all lowercase. Not `fileName`. */
  filename: string;
  contentType: string;
  category?: AudioCategory;
  associatedId?: string;
  sizeBytes?: number;
  durationSecs?: number;
  /** Extension the API derived from the filename, e.g. 'wav'. */
  format?: string;
  sampleRate?: number;
  channels?: number;
  createdAt?: string;
  createdBy?: string;
  metadata?: Record<string, unknown>;
}

export interface AudioUploadURL {
  uploadUrl: string;
  audioId: string;
  s3Key: string;
  expiresIn: number;
}

export interface AudioDownloadURL {
  downloadUrl: string;
  expiresIn: number;
}

export interface CreateUploadUrlRequest {
  filename: string;
  contentType: string;
  category: AudioCategory;
  /** Defaults server-side to the generated audioId when omitted. */
  associatedId?: string;
  durationSecs?: number;
  sizeBytes?: number;
}

export interface AudioListParams {
  limit?: number;
  nextToken?: string;
}

export interface UploadInput {
  /** Path string, Buffer/Uint8Array bytes, ReadableStream, File/Blob, or Node file stream. */
  file: string | Uint8Array | ReadableStream<Uint8Array> | Blob | NodeJS.ReadableStream;
  category: AudioCategory;
  contentType?: string;
  name?: string;
  associatedId?: string;
}

export interface DownloadOptions {
  to?: string; // when given, write to this path and return undefined
}
