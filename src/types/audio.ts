export interface AudioFile {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes?: number;
  createdAt?: string;
}

export interface AudioUploadURL {
  uploadUrl: string;
  audioId: string;
  expiresIn: number;
}

export interface AudioDownloadURL {
  downloadUrl: string;
  expiresIn: number;
}

export interface CreateUploadUrlRequest {
  fileName: string;
  contentType: string;
}

export interface AudioListParams {
  limit?: number;
  nextToken?: string;
}

export interface UploadInput {
  /** Path string, Buffer/Uint8Array bytes, ReadableStream, File/Blob, or Node file stream. */
  file: string | Uint8Array | ReadableStream<Uint8Array> | Blob | NodeJS.ReadableStream;
  contentType?: string;
  name?: string;
}

export interface DownloadOptions {
  to?: string; // when given, write to this path and return undefined
}
